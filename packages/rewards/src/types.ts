/**
 * @rbx/rewards — Type Definitions
 *
 * Types for daily login rewards, streaks, milestones, and achievements.
 */

// ============================================================================
// Reward Items
// ============================================================================

/** Type of reward */
export type RewardType = "currency" | "xp" | "item" | "boost" | "cosmetic" | "custom";

/** A single reward entry */
export interface RewardEntry {
  /** Reward type */
  type: RewardType;
  /** Amount (for currency, xp) or quantity (for items) */
  amount: number;
  /** Item / boost / cosmetic ID (if applicable) */
  itemId?: string;
  /** Display label */
  label?: string;
}

// ============================================================================
// Daily Login
// ============================================================================

/** A day's reward in a login reward cycle */
export interface DailyRewardDay {
  /** 1-based day number */
  day: number;
  /** Rewards for this day */
  rewards: RewardEntry[];
  /** Whether this is a "bonus" day (e.g., day 7, day 30) */
  isBonus?: boolean;
}

/** Player daily login state (serialisable) */
export interface DailyLoginData {
  playerId: number;
  /** Current streak length */
  streak: number;
  /** Day in the reward cycle (1-based) */
  cycleDay: number;
  /** Timestamp of last claim */
  lastClaimTime: number;
  /** Total days claimed ever */
  totalDaysClaimed: number;
  /** Schema version */
  version: number;
}

// ============================================================================
// Achievements / Milestones
// ============================================================================

/** An achievement definition */
export interface AchievementDefinition {
  /** Unique achievement ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Target value to reach */
  target: number;
  /** Rewards upon completion */
  rewards: RewardEntry[];
  /** Icon asset ID */
  icon?: string;
  /** Tags for filtering */
  tags?: string[];
  /** Whether hidden until unlocked */
  hidden?: boolean;
}

/** Player progress on a single achievement */
export interface AchievementProgress {
  achievementId: string;
  current: number;
  completed: boolean;
  completedAt?: number;
}

/** All achievement data for a player (serialisable) */
export interface AchievementPlayerData {
  playerId: number;
  achievements: AchievementProgress[];
  version: number;
}

// ============================================================================
// Events
// ============================================================================

export interface DailyRewardClaimedEvent {
  playerId: number;
  day: number;
  streak: number;
  rewards: RewardEntry[];
}

export interface AchievementCompletedEvent {
  playerId: number;
  achievementId: string;
  rewards: RewardEntry[];
}

export type DailyRewardClaimedCallback = (event: DailyRewardClaimedEvent) => void;
export type AchievementCompletedCallback = (event: AchievementCompletedEvent) => void;

// ============================================================================
// Configuration
// ============================================================================

export interface RewardsConfig {
  /** How many seconds before a new day resets (default 86400 = 24h) */
  dayDuration?: number;
  /** Grace period in seconds after dayDuration before streak resets (default 86400 = 24h) */
  streakGracePeriod?: number;
  /** Length of the reward cycle before it loops (default 7) */
  cycleLength?: number;
  /** DataStore name for daily login data */
  dailyDatastoreName?: string;
  /** DataStore name for achievement data */
  achievementDatastoreName?: string;
  /** Enable debug logging */
  enableLogging?: boolean;
}

export const DEFAULT_REWARDS_CONFIG: Required<RewardsConfig> = {
  dayDuration: 86400,
  streakGracePeriod: 86400,
  cycleLength: 7,
  dailyDatastoreName: "DailyRewards_v1",
  achievementDatastoreName: "Achievements_v1",
  enableLogging: false,
};
