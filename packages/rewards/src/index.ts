/**
 * @rbx/rewards — Public API
 */

export type {
  RewardType,
  RewardEntry,
  DailyRewardDay,
  DailyLoginData,
  AchievementDefinition,
  AchievementProgress,
  AchievementPlayerData,
  DailyRewardClaimedEvent,
  AchievementCompletedEvent,
  DailyRewardClaimedCallback,
  AchievementCompletedCallback,
  RewardsConfig,
} from "./types";
export { DEFAULT_REWARDS_CONFIG } from "./types";
export { DailyRewardStore } from "./daily-reward-store";
export { AchievementStore } from "./achievement-store";
