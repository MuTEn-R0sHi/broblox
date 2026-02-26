/**
 * Achievement Store
 *
 * Tracks player achievement progress with auto-completion and DataStore
 * persistence.
 */

import { createLogger } from "@broblox/core";
import { Counter } from "@broblox/observability";
import type {
  AchievementDefinition,
  AchievementProgress,
  AchievementPlayerData,
  RewardsConfig,
  AchievementCompletedCallback,
  AchievementCompletedEvent,
} from "./types";

const achievementsCompleted = new Counter("rewards_achievements_completed");
const saveAttempts = new Counter("rewards_achievement_save_attempts");
const saveFailures = new Counter("rewards_achievement_save_failures");

const DEFAULT_CONFIG = {
  achievementDatastoreName: "Achievements_v1",
  enableLogging: false,
};

export class AchievementStore {
  private playerId: number;
  private config: typeof DEFAULT_CONFIG;
  private definitions = new Map<string, AchievementDefinition>();
  private data: AchievementPlayerData;
  private progressMap = new Map<string, AchievementProgress>();
  private store: DataStore | undefined;
  private dirty = false;
  private logger: ReturnType<typeof createLogger> | undefined;

  private completedCallbacks: AchievementCompletedCallback[] = [];

  constructor(playerId: number, config?: Partial<RewardsConfig>) {
    this.playerId = playerId;
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };

    this.data = {
      playerId,
      achievements: [],
      version: 1,
    };

    if (this.config.enableLogging) {
      this.logger = createLogger(`Achievements.Player${playerId}`);
    }
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /** Register an achievement definition. */
  registerAchievement(def: AchievementDefinition): void {
    this.definitions.set(def.id, def);
  }

  /** Register multiple achievement definitions. */
  registerAll(defs: AchievementDefinition[]): void {
    for (const def of defs) {
      this.definitions.set(def.id, def);
    }
  }

  /** Get an achievement definition. */
  getDefinition(id: string): AchievementDefinition | undefined {
    return this.definitions.get(id);
  }

  /** Count registered achievements. */
  definitionCount(): number {
    let n = 0;
    this.definitions.forEach(() => n++);
    return n;
  }

  // --------------------------------------------------------------------------
  // Init / Load / Save
  // --------------------------------------------------------------------------

  init(): void {
    const DataStoreService = game.GetService("DataStoreService") as DataStoreService;
    this.store = DataStoreService.GetDataStore(this.config.achievementDatastoreName);
  }

  load(): boolean {
    if (!this.store) return false;

    const [ok, raw] = pcall(() => this.store!.GetAsync(`achievements_${this.playerId}`));
    if (!ok) return false;

    if (raw !== undefined && typeIs(raw, "table")) {
      const saved = raw as unknown as AchievementPlayerData;
      this.data = {
        playerId: this.playerId,
        achievements: saved.achievements ?? [],
        version: saved.version ?? 1,
      };

      // Rebuild progress map
      this.progressMap.clear();
      for (const prog of this.data.achievements) {
        this.progressMap.set(prog.achievementId, prog);
      }
    }

    this.dirty = false;
    return true;
  }

  save(): boolean {
    if (!this.store) return false;
    saveAttempts.inc();

    const [ok] = pcall(() => this.store!.SetAsync(`achievements_${this.playerId}`, this.data));
    if (!ok) {
      saveFailures.inc();
      return false;
    }

    this.dirty = false;
    return true;
  }

  // --------------------------------------------------------------------------
  // Progress
  // --------------------------------------------------------------------------

  /**
   * Increment progress on an achievement.
   * Returns true if the achievement was completed by this increment.
   */
  incrementProgress(achievementId: string, amount: number): boolean {
    if (amount <= 0) return false;

    const def = this.definitions.get(achievementId);
    if (!def) return false;

    let prog = this.progressMap.get(achievementId);
    if (!prog) {
      prog = {
        achievementId,
        current: 0,
        completed: false,
      };
      this.progressMap.set(achievementId, prog);
      this.data.achievements.push(prog);
    }

    if (prog.completed) return false;

    prog.current += amount;
    this.dirty = true;

    return this.tryComplete(prog, def);
  }

  /**
   * Set progress on an achievement directly.
   */
  setProgress(achievementId: string, value: number): boolean {
    if (value < 0) return false;

    const def = this.definitions.get(achievementId);
    if (!def) return false;

    let prog = this.progressMap.get(achievementId);
    if (!prog) {
      prog = {
        achievementId,
        current: 0,
        completed: false,
      };
      this.progressMap.set(achievementId, prog);
      this.data.achievements.push(prog);
    }

    if (prog.completed) return false;

    prog.current = value;
    this.dirty = true;

    return this.tryComplete(prog, def);
  }

  /** Check if progress meets target and fire completion if so. */
  private tryComplete(prog: AchievementProgress, def: AchievementDefinition): boolean {
    if (prog.current >= def.target) {
      prog.current = def.target;
      prog.completed = true;
      prog.completedAt = os.time();
      achievementsCompleted.inc();

      this.logger?.info(`Achievement completed: ${prog.achievementId}`);

      const event: AchievementCompletedEvent = {
        playerId: this.playerId,
        achievementId: prog.achievementId,
        rewards: def.rewards,
      };
      for (const cb of this.completedCallbacks) {
        cb(event);
      }

      return true;
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Get progress for an achievement. */
  getProgress(achievementId: string): AchievementProgress | undefined {
    return this.progressMap.get(achievementId);
  }

  /** Check if an achievement is completed. */
  isCompleted(achievementId: string): boolean {
    const prog = this.progressMap.get(achievementId);
    return prog !== undefined && prog.completed;
  }

  /** Get all completed achievement IDs. */
  getCompletedIds(): string[] {
    const result: string[] = [];
    this.progressMap.forEach((prog) => {
      if (prog.completed) {
        result.push(prog.achievementId);
      }
    });
    return result;
  }

  /** Get all achievement progress entries. */
  getAllProgress(): AchievementProgress[] {
    const result: AchievementProgress[] = [];
    this.progressMap.forEach((prog) => result.push(prog));
    return result;
  }

  /** Completion fraction for an achievement (0–1). */
  getCompletionFraction(achievementId: string): number {
    const def = this.definitions.get(achievementId);
    if (!def || def.target <= 0) return 0;

    const prog = this.progressMap.get(achievementId);
    if (!prog) return 0;
    if (prog.completed) return 1;

    return prog.current / def.target;
  }

  /** Count completed achievements. */
  completedCount(): number {
    let n = 0;
    this.progressMap.forEach((prog) => {
      if (prog.completed) n++;
    });
    return n;
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
  getData(): AchievementPlayerData {
    const achievements: AchievementProgress[] = [];
    for (const prog of this.data.achievements) {
      achievements.push({
        achievementId: prog.achievementId,
        current: prog.current,
        completed: prog.completed,
        completedAt: prog.completedAt,
      });
    }
    return {
      playerId: this.data.playerId,
      achievements,
      version: this.data.version,
    };
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  onAchievementCompleted(callback: AchievementCompletedCallback): void {
    this.completedCallbacks.push(callback);
  }
}
