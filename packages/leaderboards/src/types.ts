/**
 * Leaderboard Types
 *
 * Types for the cross-game leaderboard system.
 */

// ============================================================================
// Period Types
// ============================================================================

/**
 * Leaderboard time period.
 * - `alltime` — cumulative, never resets
 * - `daily`   — resets at midnight UTC
 * - `weekly`  — resets Monday 00:00 UTC
 * - `seasonal`— resets on a custom schedule
 */
export type LeaderboardPeriod = "alltime" | "daily" | "weekly" | "seasonal";

// ============================================================================
// Sort Direction
// ============================================================================

/**
 * Whether higher or lower scores rank first.
 * - `desc` — highest score is rank 1 (e.g. kills, coins)
 * - `asc`  — lowest score is rank 1  (e.g. fastest time)
 */
export type SortDirection = "asc" | "desc";

// ============================================================================
// Leaderboard Definition
// ============================================================================

/**
 * Defines a named leaderboard that the system manages.
 */
export interface LeaderboardDefinition {
  /** Unique identifier (e.g. "kills", "coins", "fastest_time") */
  name: string;
  /** Human-readable label */
  label: string;
  /** Sort direction */
  sortDirection: SortDirection;
  /** Which periods to maintain */
  periods: LeaderboardPeriod[];
  /** Maximum entries to keep per period (default 100) */
  maxEntries?: number;
}

// ============================================================================
// Entries & Results
// ============================================================================

/**
 * A single row on a leaderboard.
 */
export interface LeaderboardEntry {
  /** Player's Roblox UserId */
  userId: number;
  /** Cached display name */
  playerName: string;
  /** Numeric score */
  score: number;
  /** 1-based rank on this leaderboard */
  rank: number;
  /** Unix timestamp of last score update */
  updatedAt: number;
}

/**
 * Result of a top-N query.
 */
export interface TopEntriesResult {
  /** Leaderboard name */
  leaderboard: string;
  /** Period queried */
  period: LeaderboardPeriod;
  /** Ranked entries (1-based) */
  entries: LeaderboardEntry[];
  /** When the cache was last refreshed */
  cachedAt: number;
}

/**
 * Result of a single-player rank lookup.
 */
export interface PlayerRankResult {
  /** Whether the player was found on the leaderboard */
  found: boolean;
  /** Entry if found */
  entry?: LeaderboardEntry;
}

/**
 * Result of submitting a score.
 */
export type SubmitResultStatus = "UPDATED" | "NO_CHANGE" | "ERROR";

export interface SubmitResult {
  /** Whether the score was accepted */
  success: boolean;
  /** Status code */
  status: SubmitResultStatus;
  /** New rank if applicable */
  newRank?: number;
  /** Previous score if different */
  previousScore?: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface LeaderboardsConfig {
  /** Prefix for OrderedDataStore names (default "lb") */
  datastorePrefix?: string;
  /** Seconds between automatic DataStore refreshes (default 60) */
  refreshInterval?: number;
  /** Whether to log operations (default true) */
  enableLogging?: boolean;
  /** Called after a score is submitted */
  onScoreSubmit?: (leaderboard: string, userId: number, score: number) => void;
}

export const DEFAULT_LEADERBOARDS_CONFIG: Required<LeaderboardsConfig> = {
  datastorePrefix: "lb",
  refreshInterval: 60,
  enableLogging: true,
  onScoreSubmit: () => {},
};
