/**
 * Leaderboard Service — Starter Game
 *
 * Registers game leaderboards and handles score submission.
 * Uses the @rbx/leaderboards package.
 */

import { Service, createLogger } from "@rbx/core";
import { LeaderboardStore } from "@rbx/leaderboards";

const logger = createLogger("LeaderboardService");

let leaderboardStore: LeaderboardStore | undefined;

export function getLeaderboardStore(): LeaderboardStore {
  if (!leaderboardStore) {
    throw "LeaderboardService has not been initialized yet.";
  }
  return leaderboardStore;
}

export const LeaderboardService: Service = {
  onInit() {
    leaderboardStore = new LeaderboardStore({
      datastorePrefix: "lb",
      refreshInterval: 60,
      enableLogging: true,
      onScoreSubmit: (leaderboard, playerId, score) => {
        logger.info(`Score submitted — ${leaderboard}: player ${playerId} → ${score}`);
      },
    });

    // ----- Register leaderboards -----
    leaderboardStore.register({
      name: "kills",
      label: "Top Kills",
      sortDirection: "desc",
      periods: ["alltime", "daily", "weekly"],
      maxEntries: 100,
    });

    leaderboardStore.register({
      name: "wins",
      label: "Most Wins",
      sortDirection: "desc",
      periods: ["alltime", "weekly"],
      maxEntries: 50,
    });

    leaderboardStore.register({
      name: "playtime",
      label: "Play Time",
      sortDirection: "desc",
      periods: ["alltime"],
      maxEntries: 50,
    });

    logger.info("Leaderboards registered.");
  },

  onStart() {
    logger.info("LeaderboardService started.");
  },

  onStop() {
    leaderboardStore?.clearCache();
    logger.info("LeaderboardService stopped.");
  },
};
