/**
 * Data Service
 * Handles player data persistence.
 *
 * Uses the @rbx/data createDataService factory for the core session/store
 * lifecycle (auto-save, retry, session locking, graceful shutdown).
 * Game-specific mutations and timers are layered on top via the factory handle.
 */

import { Service, createLogger } from "@rbx/core";
import { createDataService } from "@rbx/data";
import { ObbyPlayerData, StageProgress } from "shared/types";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";

const logger = createLogger("DataService");

const STORE_VERSION = 1;

// Default player data
const DEFAULT_PLAYER_DATA: ObbyPlayerData = {
  __version: STORE_VERSION,
  currentCheckpoint: 0,
  currentStage: 1,
  coins: 0,
  totalDeaths: 0,
  totalCompletions: 0,
  bestFullRunTime: undefined,
  stageProgress: {},
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
  updateStageProgress(player: Player, stageNumber: number, progress: Partial<StageProgress>): void;
  addCoins(player: Player, amount: number): void;
  incrementDeaths(player: Player): void;
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

    if (updates.currentCheckpoint !== undefined) data.currentCheckpoint = updates.currentCheckpoint;
    if (updates.currentStage !== undefined) data.currentStage = updates.currentStage;
    if (updates.coins !== undefined) data.coins = updates.coins;
    if (updates.totalDeaths !== undefined) data.totalDeaths = updates.totalDeaths;
    if (updates.totalCompletions !== undefined) data.totalCompletions = updates.totalCompletions;
    if (updates.bestFullRunTime !== undefined) data.bestFullRunTime = updates.bestFullRunTime;

    // Only allow version updates for migrations/internal use.
    if (updates.__version !== undefined)
      (data as { __version: number }).__version = updates.__version;

    session.markDirty();
    dataHandle.getStore().markDirty(player);
  },

  updateStageProgress(player: Player, stageNumber: number, progress: Partial<StageProgress>): void {
    const session = dataHandle.getSessionManager().getSession(player);
    if (!session) return;

    const data = session.data;
    const stageKey = tostring(stageNumber);
    const existing = data.stageProgress[stageKey];
    if (existing) {
      if (progress.completions !== undefined) existing.completions += progress.completions;
      if (progress.deaths !== undefined) existing.deaths += progress.deaths;

      if (progress.bestTime !== undefined) {
        if (existing.bestTime === undefined || progress.bestTime < existing.bestTime) {
          existing.bestTime = progress.bestTime;
        }
      }
    } else {
      data.stageProgress[stageKey] = {
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

      // Obby-specific init: stamp activity time and start timers.
      session.data.lastPlayedAt = os.time();
      session.markDirty();
      dataHandle.getStore().markDirty(player);

      DataService.startRunTimer(player);
      DataService.startStageTimer(player);

      // Initial HUD sync.
      RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
        coins: session.data.coins,
        currentStage: session.data.currentStage,
        currentCheckpoint: session.data.currentCheckpoint,
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
