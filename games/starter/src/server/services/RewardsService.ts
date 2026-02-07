/**
 * Rewards Service — Starter Game
 *
 * Daily login rewards and achievement tracking.
 */

import { createRewardsService } from "@rbx/rewards";
import { createLogger } from "@rbx/core";
import type { DailyRewardDay } from "@rbx/rewards";

const logger = createLogger("RewardsService");

const REWARD_CYCLE: DailyRewardDay[] = [
  { day: 1, rewards: [{ type: "currency", amount: 100, label: "100 Coins" }] },
  { day: 2, rewards: [{ type: "currency", amount: 150, label: "150 Coins" }] },
  { day: 3, rewards: [{ type: "xp", amount: 500, label: "500 XP" }] },
  { day: 4, rewards: [{ type: "currency", amount: 200, label: "200 Coins" }] },
  {
    day: 5,
    rewards: [{ type: "item", amount: 1, itemId: "health_potion", label: "Health Potion" }],
  },
  { day: 6, rewards: [{ type: "currency", amount: 300, label: "300 Coins" }] },
  {
    day: 7,
    rewards: [
      { type: "currency", amount: 1000, label: "1000 Coins" },
      { type: "xp", amount: 2000, label: "2000 XP" },
    ],
    isBonus: true,
  },
];

const handle = createRewardsService({
  rewardCycle: REWARD_CYCLE,
  achievements: [
    {
      id: "ach_first_kill",
      name: "First Blood",
      description: "Defeat your first enemy.",
      target: 1,
      rewards: [{ type: "xp", amount: 100 }],
    },
    {
      id: "ach_kill_100",
      name: "Centurion",
      description: "Defeat 100 enemies.",
      target: 100,
      rewards: [{ type: "currency", amount: 5000 }],
    },
    {
      id: "ach_level_10",
      name: "Rising Star",
      description: "Reach level 10.",
      target: 10,
      rewards: [{ type: "currency", amount: 1000 }],
    },
    {
      id: "ach_level_50",
      name: "Veteran",
      description: "Reach level 50.",
      target: 50,
      rewards: [
        { type: "currency", amount: 10000 },
        { type: "item", amount: 1, itemId: "speed_boost" },
      ],
    },
    {
      id: "ach_streak_7",
      name: "Dedicated Player",
      description: "Maintain a 7-day login streak.",
      target: 7,
      rewards: [{ type: "currency", amount: 2000 }],
    },
  ],
  dailyDatastoreName: "StarterDailyRewards",
  achievementDatastoreName: "StarterAchievements",
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
