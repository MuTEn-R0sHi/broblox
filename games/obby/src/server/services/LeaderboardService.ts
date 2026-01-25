/**
 * Leaderboard Service
 * Manages rankings and leaderboard data.
 */

import { Service, createLogger } from "@rbx/core";
import { DataService } from "./DataService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("LeaderboardService");

// Leaderboard entry
interface LeaderboardEntry {
  userId: number;
  playerName: string;
  completions: number;
  bestTime: number | undefined;
  lastUpdated: number;
}

// Module-level state
const leaderboardCache: LeaderboardEntry[] = [];
const MAX_LEADERBOARD_SIZE = 100;
const CACHE_UPDATE_INTERVAL = 60; // seconds

let lastCacheUpdate = 0;

// Sort entries by completions (desc), then by best time (asc)
function sortLeaderboard(): void {
  leaderboardCache.sort((a, b) => {
    if (a.completions !== b.completions) {
      return a.completions < b.completions; // Higher completions first
    }
    if (a.bestTime !== undefined && b.bestTime !== undefined) {
      return a.bestTime < b.bestTime; // Lower time first
    }
    if (a.bestTime !== undefined) return true;
    if (b.bestTime !== undefined) return false;
    return false;
  });
}

export const LeaderboardService: Service & {
  getLeaderboard(limit?: number): LeaderboardEntry[];
  getPlayerRank(player: Player): number | undefined;
  updatePlayerEntry(player: Player): void;
  refreshLeaderboard(): void;
} = {
  getLeaderboard(limit?: number): LeaderboardEntry[] {
    const maxEntries = limit ?? MAX_LEADERBOARD_SIZE;
    const result: LeaderboardEntry[] = [];

    for (let i = 0; i < math.min(leaderboardCache.size(), maxEntries); i++) {
      result.push(leaderboardCache[i]);
    }

    return result;
  },

  getPlayerRank(player: Player): number | undefined {
    for (let i = 0; i < leaderboardCache.size(); i++) {
      if (leaderboardCache[i].userId === player.UserId) {
        return i + 1;
      }
    }
    return undefined;
  },

  updatePlayerEntry(player: Player): void {
    const data = DataService.getData(player);
    if (!data || data.totalCompletions === 0) return;

    // Find existing entry
    let existingIndex = -1;
    for (let i = 0; i < leaderboardCache.size(); i++) {
      if (leaderboardCache[i].userId === player.UserId) {
        existingIndex = i;
        break;
      }
    }

    const entry: LeaderboardEntry = {
      userId: player.UserId,
      playerName: player.Name,
      completions: data.totalCompletions,
      bestTime: data.bestFullRunTime,
      lastUpdated: os.time(),
    };

    if (existingIndex >= 0) {
      leaderboardCache[existingIndex] = entry;
    } else {
      leaderboardCache.push(entry);
    }

    sortLeaderboard();

    // Trim to max size
    while (leaderboardCache.size() > MAX_LEADERBOARD_SIZE) {
      leaderboardCache.pop();
    }

    logger.debug(`Updated leaderboard entry for ${player.Name}`);
  },

  refreshLeaderboard(): void {
    const now = os.time();
    if (now - lastCacheUpdate < CACHE_UPDATE_INTERVAL) {
      return;
    }

    lastCacheUpdate = now;

    // TODO: Load from OrderedDataStore for persistence
    // For now, just re-sort the current cache
    sortLeaderboard();

    logger.debug("Refreshed leaderboard cache");
  },

  onInit() {
    logger.debug("Initializing leaderboard service...");

    // Update leaderboard when players leave
    PlayerLifecycleService.onPlayerRemoving((player) => {
      this.updatePlayerEntry(player);
    });

    // Periodic refresh
    task.spawn(() => {
      while (true) {
        task.wait(CACHE_UPDATE_INTERVAL);
        this.refreshLeaderboard();
      }
    });

    logger.info("Leaderboard service initialized");
  },

  onDestroy() {
    // Save leaderboard to DataStore
    logger.debug("Saving leaderboard...");
  },
};
