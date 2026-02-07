/**
 * Rewards Service — Obby Game
 *
 * Daily login rewards and achievement tracking — obby themed.
 * Uses the @rbx/rewards package.
 */

import { createRewardsService } from "@rbx/rewards";
import { createLogger } from "@rbx/core";
import type { DailyRewardDay } from "@rbx/rewards";

const logger = createLogger("RewardsService");

const REWARD_CYCLE: DailyRewardDay[] = [
  { day: 1, rewards: [{ type: "currency", amount: 50, label: "50 Coins" }] },
  { day: 2, rewards: [{ type: "currency", amount: 75, label: "75 Coins" }] },
  {
    day: 3,
    rewards: [{ type: "item", amount: 1, itemId: "checkpoint_token", label: "Checkpoint Token" }],
  },
  { day: 4, rewards: [{ type: "currency", amount: 100, label: "100 Coins" }] },
  { day: 5, rewards: [{ type: "xp", amount: 500, label: "500 XP" }] },
  { day: 6, rewards: [{ type: "item", amount: 1, itemId: "skip_stage", label: "Stage Skip" }] },
  {
    day: 7,
    rewards: [
      { type: "currency", amount: 500, label: "500 Coins" },
      { type: "item", amount: 1, itemId: "speed_coil", label: "Speed Coil" },
    ],
    isBonus: true,
  },
];

const handle = createRewardsService({
  rewardCycle: REWARD_CYCLE,
  achievements: [
    {
      id: "ach_first_stage",
      name: "First Steps",
      description: "Complete your first stage.",
      target: 1,
      rewards: [{ type: "xp", amount: 50 }],
    },
    {
      id: "ach_stages_25",
      name: "Quarter Century",
      description: "Complete 25 stages.",
      target: 25,
      rewards: [{ type: "currency", amount: 500 }],
    },
    {
      id: "ach_stages_100",
      name: "Stage Master",
      description: "Complete 100 stages total.",
      target: 100,
      rewards: [
        { type: "currency", amount: 5000 },
        { type: "item", amount: 1, itemId: "trail_fire" },
      ],
    },
    {
      id: "ach_level_25",
      name: "Obby Adept",
      description: "Reach level 25.",
      target: 25,
      rewards: [{ type: "currency", amount: 2000 }],
    },
    {
      id: "ach_streak_7",
      name: "Dedicated Climber",
      description: "Maintain a 7-day login streak.",
      target: 7,
      rewards: [{ type: "item", amount: 1, itemId: "gravity_coil" }],
    },
  ],
  dailyDatastoreName: "ObbyDailyRewards",
  achievementDatastoreName: "ObbyAchievements",
  dailyStoreOptions: {
    dayDuration: 86400,
    streakGracePeriod: 86400,
    cycleLength: 7,
  },
});

export const RewardsService = handle.Service;
export const getDailyRewards = (playerId: number) => handle.getDailyRewardStore(playerId);
export const getAchievements = (playerId: number) => handle.getAchievementStore(playerId);
export const cleanupPlayerRewards = (playerId: number) => handle.cleanupPlayer(playerId);

/** Initialize rewards for a player — adds game-specific event callbacks. */
export function initPlayerRewards(playerId: number) {
  const { daily, achievements } = handle.initPlayer(playerId);

  daily.onClaimed((event) => {
    logger.info(`Player ${event.playerId} claimed day ${event.day} — streak ${event.streak}`);
  });

  achievements.onAchievementCompleted((event) => {
    logger.info(`Player ${event.playerId} unlocked achievement: ${event.achievementId}`);
  });

  return { daily, achievements };
}
