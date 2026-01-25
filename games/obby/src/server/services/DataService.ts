/**
 * Data Service
 * Handles player data persistence.
 */

import { Service, createLogger } from "@rbx/core";
import { ObbyPlayerData, StageProgress } from "shared/types";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("DataService");

// Default player data
const DEFAULT_PLAYER_DATA: ObbyPlayerData = {
  currentCheckpoint: 0,
  currentStage: 1,
  coins: 0,
  totalDeaths: 0,
  totalCompletions: 0,
  bestFullRunTime: undefined,
  stageProgress: new Map(),
  unlockedItems: [],
  equippedTrail: undefined,
  lastPlayedAt: 0,
};

// Module-level state
const playerData = new Map<number, ObbyPlayerData>();
const pendingSaves = new Set<number>();

export const DataService: Service & {
  getData(player: Player): ObbyPlayerData | undefined;
  updateData(player: Player, updates: Partial<ObbyPlayerData>): void;
  updateStageProgress(player: Player, stageNumber: number, progress: Partial<StageProgress>): void;
  addCoins(player: Player, amount: number): void;
  incrementDeaths(player: Player): void;
} = {
  getData(player: Player): ObbyPlayerData | undefined {
    return playerData.get(player.UserId);
  },

  updateData(player: Player, updates: Partial<ObbyPlayerData>): void {
    const data = playerData.get(player.UserId);
    if (!data) {
      logger.warn(`No data found for player ${player.UserId}`);
      return;
    }

    if (updates.currentCheckpoint !== undefined) data.currentCheckpoint = updates.currentCheckpoint;
    if (updates.currentStage !== undefined) data.currentStage = updates.currentStage;
    if (updates.coins !== undefined) data.coins = updates.coins;
    if (updates.totalDeaths !== undefined) data.totalDeaths = updates.totalDeaths;
    if (updates.totalCompletions !== undefined) data.totalCompletions = updates.totalCompletions;
    if (updates.bestFullRunTime !== undefined) data.bestFullRunTime = updates.bestFullRunTime;

    pendingSaves.add(player.UserId);
  },

  updateStageProgress(player: Player, stageNumber: number, progress: Partial<StageProgress>): void {
    const data = playerData.get(player.UserId);
    if (!data) return;

    const existing = data.stageProgress.get(stageNumber);
    if (existing) {
      if (progress.bestTime !== undefined) existing.bestTime = progress.bestTime;
      if (progress.completions !== undefined) existing.completions = progress.completions;
      if (progress.deaths !== undefined) existing.deaths = progress.deaths;
    } else {
      data.stageProgress.set(stageNumber, {
        stageNumber,
        firstCompletedAt: os.time(),
        completions: progress.completions ?? 0,
        deaths: progress.deaths ?? 0,
        bestTime: progress.bestTime,
      });
    }

    pendingSaves.add(player.UserId);
  },

  addCoins(player: Player, amount: number): void {
    const data = playerData.get(player.UserId);
    if (!data) return;

    data.coins += amount;
    pendingSaves.add(player.UserId);

    logger.debug(`Player ${player.Name} earned ${amount} coins (total: ${data.coins})`);
  },

  incrementDeaths(player: Player): void {
    const data = playerData.get(player.UserId);
    if (!data) return;

    data.totalDeaths++;
    pendingSaves.add(player.UserId);
  },

  onInit() {
    logger.debug("Initializing data service...");

    PlayerLifecycleService.onPlayerAdded((player) => {
      logger.info(`Loading data for player ${player.Name}...`);

      // TODO: Load from DataStore
      const data: ObbyPlayerData = {
        ...DEFAULT_PLAYER_DATA,
        stageProgress: new Map(),
        lastPlayedAt: os.time(),
      };

      playerData.set(player.UserId, data);
      logger.info(`Loaded data for player ${player.Name}`);
    });

    PlayerLifecycleService.onPlayerRemoving((player) => {
      logger.info(`Saving data for player ${player.Name}...`);
      // TODO: Save to DataStore
      playerData.delete(player.UserId);
      pendingSaves.delete(player.UserId);
    });
  },

  onDestroy() {
    // Save all pending data
    pendingSaves.forEach((userId) => {
      logger.debug(`Saving data for user ${userId}`);
      // TODO: Actual save
    });
    playerData.clear();
    pendingSaves.clear();
  },
};
