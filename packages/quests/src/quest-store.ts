/**
 * Quest Store
 *
 * Per-player quest state management — accept, track progress, complete, fail,
 * reset (for repeating quests), and DataStore persistence.
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import { QuestRegistry } from "./quest-registry";
import type {
  QuestPlayerData,
  QuestProgress,
  ObjectiveProgress,
  QuestDefinition,
  QuestsConfig,
  QuestAcceptedCallback,
  QuestCompletedCallback,
  ObjectiveProgressCallback,
  QuestAcceptedEvent,
  QuestCompletedEvent,
  ObjectiveProgressEvent,
} from "./types";

// Roblox globals
declare const game: { GetService(name: string): unknown };
declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;
declare function typeIs(value: unknown, typeName: string): boolean;
declare const os: { time(): number };
declare const math: { floor(x: number): number };

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
}
interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

const questsAccepted = new Counter("quests_accepted");
const questsCompleted = new Counter("quests_completed");
const questsFailed = new Counter("quests_failed");
const saveAttempts = new Counter("quests_save_attempts");
const saveFailures = new Counter("quests_save_failures");

const DEFAULT_CONFIG: Required<QuestsConfig> = {
  maxActiveQuests: 10,
  datastoreName: "PlayerQuests_v1",
  enableLogging: false,
};

export class QuestStore {
  private playerId: number;
  private registry: QuestRegistry;
  private config: Required<QuestsConfig>;
  private data: QuestPlayerData;
  private store: DataStore | undefined;
  private dirty = false;
  private logger: ReturnType<typeof createLogger> | undefined;

  private acceptedCallbacks: QuestAcceptedCallback[] = [];
  private completedCallbacks: QuestCompletedCallback[] = [];
  private progressCallbacks: ObjectiveProgressCallback[] = [];

  constructor(playerId: number, registry: QuestRegistry, config?: QuestsConfig) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };

    this.data = {
      playerId,
      activeQuests: [],
      completedQuestIds: [],
      version: 1,
    };

    if (this.config.enableLogging) {
      this.logger = createLogger(`Quests.Player${playerId}`);
    }
  }

  // --------------------------------------------------------------------------
  // Init / Load / Save
  // --------------------------------------------------------------------------

  init(): void {
    const DataStoreService = game.GetService("DataStoreService") as DataStoreService;
    this.store = DataStoreService.GetDataStore(this.config.datastoreName);
  }

  load(): boolean {
    if (!this.store) return false;

    const [ok, raw] = pcall(() => this.store!.GetAsync(`quests_${this.playerId}`));
    if (!ok) return false;

    if (raw !== undefined && typeIs(raw, "table")) {
      const saved = raw as unknown as QuestPlayerData;
      this.data = {
        playerId: this.playerId,
        activeQuests: saved.activeQuests ?? [],
        completedQuestIds: saved.completedQuestIds ?? [],
        version: saved.version ?? 1,
      };
    }

    this.dirty = false;
    return true;
  }

  save(): boolean {
    if (!this.store) return false;
    saveAttempts.inc();

    const [ok] = pcall(() => this.store!.SetAsync(`quests_${this.playerId}`, this.data));
    if (!ok) {
      saveFailures.inc();
      return false;
    }

    this.dirty = false;
    this.logger?.info("Quests saved.");
    return true;
  }

  // --------------------------------------------------------------------------
  // Quest Acceptance
  // --------------------------------------------------------------------------

  /** Accept a quest. Returns true if successfully accepted. */
  acceptQuest(questId: string): boolean {
    const def = this.registry.get(questId);
    if (!def) {
      this.logger?.warn(`Quest not found: ${questId}`);
      return false;
    }

    // Already active?
    if (this.getActiveQuest(questId) !== undefined) return false;

    // Already completed (non-repeating)?
    if (def.schedule === "once" && this.isCompleted(questId)) return false;

    // Check active quest limit
    if (this.data.activeQuests.length >= this.config.maxActiveQuests) {
      this.logger?.warn("Max active quests reached");
      return false;
    }

    // Check prerequisites
    if (def.prerequisites) {
      for (const prereq of def.prerequisites) {
        if (!this.isCompleted(prereq)) return false;
      }
    }

    const objectives: ObjectiveProgress[] = [];
    for (const obj of def.objectives) {
      objectives.push({
        objectiveId: obj.id,
        current: 0,
        target: obj.target,
        completed: false,
      });
    }

    const progress: QuestProgress = {
      questId,
      status: "active",
      objectives,
      acceptedAt: os.time(),
    };

    this.data.activeQuests.push(progress);
    this.dirty = true;
    questsAccepted.inc();

    this.logger?.info(`Accepted quest: ${questId}`);

    const event: QuestAcceptedEvent = { playerId: this.playerId, questId };
    for (const cb of this.acceptedCallbacks) {
      cb(event);
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // Objective Progress
  // --------------------------------------------------------------------------

  /**
   * Increment progress on a specific objective type across all active quests.
   * Returns number of objectives updated.
   */
  incrementObjective(
    objectiveType: string,
    amount: number,
    metadata?: Record<string, string>
  ): number {
    let updated = 0;

    for (const quest of this.data.activeQuests) {
      if (quest.status !== "active") continue;

      const def = this.registry.get(quest.questId);
      if (!def) continue;

      for (let i = 0; i < quest.objectives.length; i++) {
        const objProgress = quest.objectives[i];
        if (objProgress.completed) continue;

        const objDef = this.findObjectiveDef(def, objProgress.objectiveId);
        if (!objDef) continue;
        if (objDef.type !== objectiveType) continue;

        // Check metadata match if specified
        if (metadata && objDef.metadata) {
          let match = true;
          for (const key in objDef.metadata) {
            if (metadata[key] !== objDef.metadata[key]) {
              match = false;
              break;
            }
          }
          if (!match) continue;
        }

        objProgress.current += amount;
        if (objProgress.current >= objProgress.target) {
          objProgress.current = objProgress.target;
          objProgress.completed = true;
        }

        this.dirty = true;
        updated += 1;

        const progressEvent: ObjectiveProgressEvent = {
          playerId: this.playerId,
          questId: quest.questId,
          objectiveId: objProgress.objectiveId,
          current: objProgress.current,
          target: objProgress.target,
        };
        for (const cb of this.progressCallbacks) {
          cb(progressEvent);
        }
      }

      // Check if all objectives complete → auto-complete quest
      if (this.areAllObjectivesComplete(quest)) {
        this.completeQuest(quest);
      }
    }

    return updated;
  }

  /**
   * Set progress on a specific objective within a specific quest.
   */
  setObjectiveProgress(questId: string, objectiveId: string, value: number): boolean {
    const quest = this.getActiveQuest(questId);
    if (!quest || quest.status !== "active") return false;

    for (const obj of quest.objectives) {
      if (obj.objectiveId === objectiveId) {
        obj.current = value;
        if (obj.current >= obj.target) {
          obj.current = obj.target;
          obj.completed = true;
        }

        this.dirty = true;

        const progressEvent: ObjectiveProgressEvent = {
          playerId: this.playerId,
          questId,
          objectiveId,
          current: obj.current,
          target: obj.target,
        };
        for (const cb of this.progressCallbacks) {
          cb(progressEvent);
        }

        // Check quest completion
        if (this.areAllObjectivesComplete(quest)) {
          this.completeQuest(quest);
        }

        return true;
      }
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // Quest Completion / Failure
  // --------------------------------------------------------------------------

  private completeQuest(quest: QuestProgress): void {
    quest.status = "completed";
    quest.completedAt = os.time();
    this.dirty = true;
    questsCompleted.inc();

    // Add to completed list if not already there
    let found = false;
    for (const id of this.data.completedQuestIds) {
      if (id === quest.questId) {
        found = true;
        break;
      }
    }
    if (!found) {
      this.data.completedQuestIds.push(quest.questId);
    }

    const def = this.registry.get(quest.questId);
    const event: QuestCompletedEvent = {
      playerId: this.playerId,
      questId: quest.questId,
      xpReward: def?.xpReward ?? 0,
      currencyReward: def?.currencyReward ?? 0,
      itemRewards: def?.itemRewards ?? [],
    };

    this.logger?.info(`Quest completed: ${quest.questId}`);

    for (const cb of this.completedCallbacks) {
      cb(event);
    }
  }

  /** Fail a quest. */
  failQuest(questId: string): boolean {
    const quest = this.getActiveQuest(questId);
    if (!quest || quest.status !== "active") return false;

    quest.status = "failed";
    this.dirty = true;
    questsFailed.inc();
    this.logger?.info(`Quest failed: ${questId}`);
    return true;
  }

  /** Abandon / remove a quest from active list. */
  abandonQuest(questId: string): boolean {
    const idx = this.findActiveQuestIndex(questId);
    if (idx < 0) return false;

    // Remove by shifting elements (no Array.splice in roblox-ts)
    const newActive: QuestProgress[] = [];
    for (let i = 0; i < this.data.activeQuests.length; i++) {
      if (i !== idx) {
        newActive.push(this.data.activeQuests[i]);
      }
    }
    this.data.activeQuests = newActive;
    this.dirty = true;
    this.logger?.info(`Quest abandoned: ${questId}`);
    return true;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Get an active quest by ID. */
  getActiveQuest(questId: string): QuestProgress | undefined {
    for (const quest of this.data.activeQuests) {
      if (quest.questId === questId) return quest;
    }
    return undefined;
  }

  /** Get all active quests. */
  getActiveQuests(): QuestProgress[] {
    const result: QuestProgress[] = [];
    for (const q of this.data.activeQuests) {
      if (q.status === "active") {
        result.push(q);
      }
    }
    return result;
  }

  /** Get all completed quests (by ID). */
  getCompletedQuestIds(): string[] {
    const result: string[] = [];
    for (const id of this.data.completedQuestIds) {
      result.push(id);
    }
    return result;
  }

  /** Check if a quest has been completed. */
  isCompleted(questId: string): boolean {
    for (const id of this.data.completedQuestIds) {
      if (id === questId) return true;
    }
    return false;
  }

  /** Count of active quests. */
  activeCount(): number {
    let n = 0;
    for (const q of this.data.activeQuests) {
      if (q.status === "active") n++;
    }
    return n;
  }

  /** Get progress for a quest as a fraction (0–1). */
  getQuestProgress(questId: string): number {
    const quest = this.getActiveQuest(questId);
    if (!quest) return 0;
    if (quest.objectives.length === 0) return 1;

    let completedCount = 0;
    for (const obj of quest.objectives) {
      if (obj.completed) completedCount++;
    }
    return completedCount / quest.objectives.length;
  }

  /** Whether there are unsaved changes. */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Get player ID. */
  getPlayerId(): number {
    return this.playerId;
  }

  /** Get full data snapshot. */
  getData(): QuestPlayerData {
    return {
      playerId: this.data.playerId,
      activeQuests: this.data.activeQuests,
      completedQuestIds: [...this.data.completedQuestIds],
      version: this.data.version,
    };
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  onQuestAccepted(callback: QuestAcceptedCallback): void {
    this.acceptedCallbacks.push(callback);
  }

  onQuestCompleted(callback: QuestCompletedCallback): void {
    this.completedCallbacks.push(callback);
  }

  onObjectiveProgress(callback: ObjectiveProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private findObjectiveDef(def: QuestDefinition, objectiveId: string) {
    for (const obj of def.objectives) {
      if (obj.id === objectiveId) return obj;
    }
    return undefined;
  }

  private areAllObjectivesComplete(quest: QuestProgress): boolean {
    for (const obj of quest.objectives) {
      if (!obj.completed) return false;
    }
    return true;
  }

  private findActiveQuestIndex(questId: string): number {
    for (let i = 0; i < this.data.activeQuests.length; i++) {
      if (this.data.activeQuests[i].questId === questId) return i;
    }
    return -1;
  }
}
