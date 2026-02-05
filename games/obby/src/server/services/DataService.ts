/**
 * Data Service
 * Handles player data persistence.
 */

import { Service, createLogger } from "@rbx/core";
import { createPlayerDataStore, createSessionManager, PlayerSession } from "@rbx/data";
import { events, ObbyPlayerData, StageProgress } from "shared/types";
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

const store = createPlayerDataStore<ObbyPlayerData>({
  name: "obby_player_data",
  version: STORE_VERSION,
  defaultData: () => ({
    ...DEFAULT_PLAYER_DATA,
    lastPlayedAt: os.time(),
  }),
});

const sessions = createSessionManager(store, 60);

// Runtime-only timing (not persisted)
const stageStartClock = new Map<number, number>();
const runStartClock = new Map<number, number>();

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
    return sessions.getSession(player)?.data;
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
    const session = sessions.getSession(player);
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
    store.markDirty(player);
  },

  updateStageProgress(player: Player, stageNumber: number, progress: Partial<StageProgress>): void {
    const session = sessions.getSession(player);
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
    store.markDirty(player);
  },

  addCoins(player: Player, amount: number): void {
    const session = sessions.getSession(player);
    if (!session) return;

    const data = session.data;

    data.coins += amount;
    session.markDirty();
    store.markDirty(player);

    logger.debug(`Player ${player.Name} earned ${amount} coins (total: ${data.coins})`);
  },

  incrementDeaths(player: Player): void {
    const session = sessions.getSession(player);
    if (!session) return;

    const data = session.data;

    data.totalDeaths++;
    session.markDirty();
    store.markDirty(player);
  },

  onInit() {
    logger.debug("Initializing data service...");

    PlayerLifecycleService.onPlayerAdded((player) => {
      logger.info(`Starting data session for player ${player.Name}...`);

      const session = sessions.startSession(player);
      if (!session) {
        logger.warn(`Failed to start session for ${player.Name}`);
        return;
      }

      // Mark activity and ensure the value is persisted.
      session.data.lastPlayedAt = os.time();
      session.markDirty();
      store.markDirty(player);

      // Initialize timers for stage/run tracking.
      this.startRunTimer(player);
      this.startStageTimer(player);

      // Initial client sync for HUD/state.
      RemoteService.fireClient(player, events.playerDataSync, {
        coins: session.data.coins,
        currentStage: session.data.currentStage,
        currentCheckpoint: session.data.currentCheckpoint,
      });

      logger.info(`Session started for player ${player.Name}`);
    });

    PlayerLifecycleService.onPlayerRemoving((player) => {
      logger.info(`Ending data session for player ${player.Name}...`);

      const session = sessions.getSession(player) as PlayerSession<ObbyPlayerData> | undefined;
      if (session) {
        session.data.lastPlayedAt = os.time();
        session.markDirty();
        store.markDirty(player);
      }

      sessions.endSession(player);

      stageStartClock.delete(player.UserId);
      runStartClock.delete(player.UserId);
    });
  },

  onStart() {
    sessions.startAutoSave();
  },

  onDestroy() {
    sessions.closeAll();

    stageStartClock.clear();
    runStartClock.clear();
  },
};
