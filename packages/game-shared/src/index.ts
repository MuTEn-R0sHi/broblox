/**
 * @broblox/game-shared
 *
 * Shared payload types used by all games' remote definitions.
 * Games import these instead of duplicating the interfaces.
 */

import type { RewardType } from "@broblox/rewards";

// ============================================================================
// Reward Entry
// ============================================================================

/** A single reward entry used across notification payloads. */
export interface RemoteRewardEntry {
  type: RewardType;
  amount: number;
  itemId?: string;
  label?: string;
}

// ============================================================================
// Notification Payloads
// ============================================================================

export interface LevelUpPayload {
  newLevel: number;
}

export interface PrestigeUnlockedPayload {
  newPrestige: number;
}

export interface QuestCompletedPayload {
  questId: string;
  rewards: RemoteRewardEntry[];
}

export interface AchievementCompletedPayload {
  achievementId: string;
  rewards: RemoteRewardEntry[];
}

export interface DailyRewardClaimedPayload {
  day: number;
  streak: number;
  rewards: RemoteRewardEntry[];
}

/** Payload for a scheduled in-game event becoming active or inactive. */
export interface EventActivePayload {
  id: string;
  label: string;
  modifiers?: Record<string, unknown>;
}
