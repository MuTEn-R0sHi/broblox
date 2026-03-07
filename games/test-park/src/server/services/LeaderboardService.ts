/**
 * Leaderboard Service — Test Park
 *
 * Registers game leaderboards and handles score submission.
 * Uses the @broblox/leaderboards package.
 */

import { createLeaderboardService } from "@broblox/leaderboards";

const handle = createLeaderboardService({
  storeConfig: {
    datastorePrefix: "lb",
    refreshInterval: 60,
    enableLogging: true,
  },
  definitions: [
    {
      name: "kills",
      label: "Top Kills",
      sortDirection: "desc",
      periods: ["alltime", "daily", "weekly"],
      maxEntries: 100,
    },
    {
      name: "wins",
      label: "Most Wins",
      sortDirection: "desc",
      periods: ["alltime", "weekly"],
      maxEntries: 50,
    },
    {
      name: "playtime",
      label: "Play Time",
      sortDirection: "desc",
      periods: ["alltime"],
      maxEntries: 50,
    },
  ],
});

export const LeaderboardService = handle.Service;
export const getLeaderboardStore = () => handle.getLeaderboardStore();
