/**
 * @rbx/leaderboards
 *
 * Cross-game leaderboard system for Roblox games.
 * Provides:
 * - Named leaderboard definitions with sort direction
 * - Period support (all-time, daily, weekly, seasonal)
 * - OrderedDataStore-backed persistence
 * - In-memory caching with configurable refresh interval
 * - Top-N queries and player rank lookups
 * - Observability metrics
 */

export * from "./types";
export * from "./leaderboard-store";
export { createLeaderboardService } from "./create-leaderboard-service";
export type {
  LeaderboardServiceConfig,
  LeaderboardServiceHandle,
} from "./create-leaderboard-service";
