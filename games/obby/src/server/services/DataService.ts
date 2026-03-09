/**
 * Data Service
 * Handles player data persistence.
 *
 * Uses the @broblox/data createDataService factory for the core session/store
 * lifecycle (auto-save, retry, session locking, graceful shutdown).
 * Game-specific mutations and timers are layered on top via the factory handle.
 */

import { Service, createLogger } from "@broblox/core";
import { createDataService } from "@broblox/data";
import {
  ObbyPlayerData,
  ObbyPlayerDataV1,
  StageProgress,
  PlayerAttributes,
  OBBY_CONSTANTS,
} from "shared/types";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";

const logger = createLogger("DataService");

const STORE_VERSION = 2;

// ── v1 → v2 migration ────────────────────────────────────────────────────────

function migrateV1toV2(raw: unknown): ObbyPlayerData {
  const old = raw as ObbyPlayerDataV1;
  return {
    __version: 2,
    attributes: {
      speed: OBBY_CONSTANTS.DEFAULT_SPEED,
      jump: OBBY_CONSTANTS.DEFAULT_JUMP,
      stamina: OBBY_CONSTANTS.DEFAULT_STAMINA,
    },
    trainingReps: { speed: 0, jump: 0, stamina: 0 },
    coins: old.coins ?? 0,
    worlds: {
      grasslands: {
        currentStage: old.currentStage ?? 1,
        currentCheckpoint: old.currentCheckpoint ?? 0,
        completions: old.totalCompletions ?? 0,
        bestFullRunTime: old.bestFullRunTime,
        stageProgress: old.stageProgress ?? {},
      },
    },
    inventory: [],
    equipped: {},
    ownedGear: [],
    totalDeaths: old.totalDeaths ?? 0,
    totalCompletions: old.totalCompletions ?? 0,
    unlockedItems: old.unlockedItems ?? [],
    equippedTrail: old.equippedTrail,
    lastPlayedAt: old.lastPlayedAt ?? 0,
  };
}

const migrations = new Map<string, (data: unknown) => unknown>();
migrations.set("1_2", migrateV1toV2);

// Default player data
const DEFAULT_PLAYER_DATA: ObbyPlayerData = {
  __version: STORE_VERSION,
  attributes: {
    speed: OBBY_CONSTANTS.DEFAULT_SPEED,
    jump: OBBY_CONSTANTS.DEFAULT_JUMP,
    stamina: OBBY_CONSTANTS.DEFAULT_STAMINA,
  },
  trainingReps: { speed: 0, jump: 0, stamina: 0 },
  coins: 0,
  worlds: {},
  inventory: [],
  equipped: {},
  ownedGear: [],
  totalDeaths: 0,
  totalCompletions: 0,
  unlockedItems: [],
  equippedTrail: undefined,
  lastPlayedAt: 0,
};

// ── Factory handle ────────────────────────────────────────────────────────────
// createDataService wraps PlayerDataStore + SessionManager and wires
// auto-save, retry, and graceful shutdown automatically.

const dataHandle = createDataService<ObbyPlayerData>({
  storeConfig: {
    name: "obby_player_data",
    version: STORE_VERSION,
    defaultData: () => ({
      ...DEFAULT_PLAYER_DATA,
      lastPlayedAt: os.time(),
    }),
    migrations,
  },
  autoSaveIntervalSec: 60,
});

// Runtime-only timing (not persisted)
const stageStartClock = new Map<number, number>();
const runStartClock = new Map<number, number>();

// ── Public API ────────────────────────────────────────────────────────────────

export const DataService: Service & {
  getData(player: Player): ObbyPlayerData | undefined;
  startStageTimer(player: Player): void;
  startRunTimer(player: Player): void;
  getStageElapsedSeconds(player: Player): number | undefined;
  getRunElapsedSeconds(player: Player): number | undefined;
  updateData(player: Player, updates: Partial<ObbyPlayerData>): void;
  updateStageProgress(
    player: Player,
    worldId: string,
    stageNumber: number,
    progress: Partial<StageProgress>
  ): void;
  addCoins(player: Player, amount: number): void;
  incrementDeaths(player: Player): void;
  getAttributes(player: Player): PlayerAttributes | undefined;
  setAttributes(player: Player, attrs: Partial<PlayerAttributes>): void;
  getWorldProgress(
    player: Player,
    worldId: string
  ): import("shared/types").WorldProgressData | undefined;
  setWorldStage(player: Player, worldId: string, stage: number, checkpoint: number): void;
  setWorldBestRunTime(player: Player, worldId: string, time: number): void;
  incrementWorldCompletions(player: Player, worldId: string): void;
  ensureWorldProgress(player: Player, worldId: string): void;
  grantGearOwnership(player: Player, gearId: string): boolean;
  saveEquipmentState(player: Player, equipped: Record<string, string>): void;
} = {
  getData(player: Player): ObbyPlayerData | undefined {
    return dataHandle.getSessionManager().getSession(player)?.data;
  },

  startStageTimer(player: Player): void {
    stageStartClock.set(player.UserId, os.clock());
  },

  startRunTimer(player: Player): void {
    runStartClock.set(player.UserId, os.clock());
  },

  getStageElapsedSeconds(player: Player): number | undefined {
    const start = stageStartClock.get(player.UserId);
    if (start === undefined) return undefined;
    return os.clock() - start;
  },

  getRunElapsedSeconds(player: Player): number | undefined {
    const start = runStartClock.get(player.UserId);
    if (start === undefined) return undefined;
    return os.clock() - start;
  },

  updateData(player: Player, updates: Partial<ObbyPlayerData>): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) {
      logger.warn(`No session found for player ${player.UserId}`);
      return;
    }

    const data = session.data;

    if (updates.coins !== undefined) data.coins = updates.coins;
    if (updates.totalDeaths !== undefined) data.totalDeaths = updates.totalDeaths;
    if (updates.totalCompletions !== undefined) data.totalCompletions = updates.totalCompletions;
    if (updates.equippedTrail !== undefined) data.equippedTrail = updates.equippedTrail;

    // Only allow version updates for migrations/internal use.
    if (updates.__version !== undefined)
      (data as { __version: number }).__version = updates.__version;

    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  updateStageProgress(
    player: Player,
    worldId: string,
    stageNumber: number,
    progress: Partial<StageProgress>
  ): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;
    this.ensureWorldProgress(player, worldId);
    const world = data.worlds[worldId];
    if (!world) return;

    const stageKey = tostring(stageNumber);
    const existing = world.stageProgress[stageKey];
    if (existing) {
      if (progress.completions !== undefined) existing.completions += progress.completions;
      if (progress.deaths !== undefined) existing.deaths += progress.deaths;

      if (progress.bestTime !== undefined) {
        if (existing.bestTime === undefined || progress.bestTime < existing.bestTime) {
          existing.bestTime = progress.bestTime;
        }
      }
    } else {
      world.stageProgress[stageKey] = {
        stageNumber,
        firstCompletedAt: os.time(),
        completions: progress.completions ?? 0,
        deaths: progress.deaths ?? 0,
        bestTime: progress.bestTime,
      };
    }

    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  addCoins(player: Player, amount: number): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;

    data.coins += amount;
    session.markDirty();
    dataHandle.getStore().markDirty(player);

    logger.debug(`Player ${player.Name} earned ${amount} coins (total: ${data.coins})`);
  },

  incrementDeaths(player: Player): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;

    data.totalDeaths++;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  getAttributes(player: Player): PlayerAttributes | undefined {
    const data = this.getData(player);
    return data?.attributes;
  },

  setAttributes(player: Player, attrs: Partial<PlayerAttributes>): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;
    if (attrs.speed !== undefined)
      data.attributes.speed = math.clamp(
        attrs.speed,
        OBBY_CONSTANTS.DEFAULT_SPEED,
        OBBY_CONSTANTS.MAX_SPEED
      );
    if (attrs.jump !== undefined)
      data.attributes.jump = math.clamp(
        attrs.jump,
        OBBY_CONSTANTS.DEFAULT_JUMP,
        OBBY_CONSTANTS.MAX_JUMP
      );
    if (attrs.stamina !== undefined)
      data.attributes.stamina = math.clamp(
        attrs.stamina,
        OBBY_CONSTANTS.DEFAULT_STAMINA,
        OBBY_CONSTANTS.MAX_STAMINA
      );

    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  getWorldProgress(player: Player, worldId: string) {
    const data = this.getData(player);
    return data?.worlds[worldId];
  },

  setWorldStage(player: Player, worldId: string, stage: number, checkpoint: number): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    this.ensureWorldProgress(player, worldId);
    const world = session.data.worlds[worldId];
    if (!world) return;

    world.currentStage = stage;
    world.currentCheckpoint = checkpoint;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  setWorldBestRunTime(player: Player, worldId: string, time: number): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    this.ensureWorldProgress(player, worldId);
    const world = session.data.worlds[worldId];
    if (!world) return;

    if (world.bestFullRunTime === undefined || time < world.bestFullRunTime) {
      world.bestFullRunTime = time;
      session.markDirty();
      dataHandle.getStore().markDirty(player);
    }
  },

  incrementWorldCompletions(player: Player, worldId: string): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    this.ensureWorldProgress(player, worldId);
    const world = session.data.worlds[worldId];
    if (!world) return;

    world.completions += 1;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  ensureWorldProgress(player: Player, worldId: string): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;
    if (!data.worlds[worldId]) {
      data.worlds[worldId] = {
        currentStage: 1,
        currentCheckpoint: 0,
        completions: 0,
        bestFullRunTime: undefined,
        stageProgress: {},
      };
      session.markDirty();
      dataHandle.getStore().markDirty(player);
    }
  },

  grantGearOwnership(player: Player, gearId: string): boolean {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return false;

    const data = session.data;
    if (!data.ownedGear) data.ownedGear = [];
    if (data.ownedGear.includes(gearId)) return false;

    data.ownedGear.push(gearId);
    session.markDirty();
    dataHandle.getStore().markDirty(player);
    return true;
  },

  saveEquipmentState(player: Player, equipped: Record<string, string>): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;
    // Sync equipped slots from equipment store to persisted data
    data.equipped = equipped as Partial<Record<import("shared/types").EquipSlot, string>>;
    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  onInit() {
    logger.debug("Initializing data service...");

    // Boot the factory's internal state (store + session manager).
    dataHandle.Service.onInit?.();

    PlayerLifecycleService.onPlayerAdded((player) => {
      // Factory handles startSession + logging.
      dataHandle.initPlayer(player);

      const session = dataHandle.getSessionManager().getSession(player);
      if (!session) {
        logger.warn(`Failed to start session for ${player.Name}`);
        return;
      }

      // Obby-specific init: stamp activity time, ensure grasslands world.
      // Timers are NOT started here — WorldService starts them when the player enters a world.
      session.data.lastPlayedAt = os.time();
      DataService.ensureWorldProgress(player, "grasslands");
      session.markDirty();
      dataHandle.getStore().markDirty(player);

      // Initial HUD sync (player starts in hub — no active world).
      RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
        coins: session.data.coins,
        currentStage: 1,
        currentCheckpoint: 0,
        attributes: session.data.attributes,
      });
    });

    PlayerLifecycleService.onPlayerRemoving((player) => {
      logger.info(`Ending data session for player ${player.Name}...`);

      const session = dataHandle.getSessionManager().getSession(player);
      if (session) {
        session.data.lastPlayedAt = os.time();
        session.markDirty();
        dataHandle.getStore().markDirty(player);
      }

      // Factory handles endSession + final-save + logging.
      dataHandle.cleanupPlayer(player);

      stageStartClock.delete(player.UserId);
      runStartClock.delete(player.UserId);
    });
  },

  onStart() {
    // Factory starts the auto-save loop.
    dataHandle.Service.onStart?.();
  },

  onDestroy() {
    // Factory calls closeAll() — stops auto-save, saves dirty sessions, clears.
    dataHandle.Service.onDestroy?.();

    stageStartClock.clear();
    runStartClock.clear();
  },
};
