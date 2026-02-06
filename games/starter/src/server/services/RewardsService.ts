/**
 * Rewards Service — Starter Game
 *
 * Daily login rewards and achievement tracking.
 * Uses the @rbx/rewards package.
 */

import { Service, createLogger } from "@rbx/core";
import { DailyRewardStore, AchievementStore } from "@rbx/rewards";
import type { DailyRewardDay } from "@rbx/rewards";

const logger = createLogger("RewardsService");

const playerDailyRewards = new Map<number, DailyRewardStore>();
const playerAchievements = new Map<number, AchievementStore>();

export function getDailyRewards(playerId: number): DailyRewardStore | undefined {
  return playerDailyRewards.get(playerId);
}

export function getAchievements(playerId: number): AchievementStore | undefined {
  return playerAchievements.get(playerId);
}

// 7-day reward cycle
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

export const RewardsService: Service = {
  onInit() {
    logger.info("RewardsService initialized.");
  },

  onStart() {
    logger.info("RewardsService started.");
  },

  onDestroy() {
    playerDailyRewards.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved daily rewards for player ${playerId}`);
      }
    });
    playerAchievements.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved achievements for player ${playerId}`);
      }
    });
    logger.info("RewardsService stopped.");
  },
};

/**
 * Initialize rewards for a player (call from PlayerLifecycleService).
 */
export function initPlayerRewards(playerId: number): {
  daily: DailyRewardStore;
  achievements: AchievementStore;
} {
  // Daily rewards
  const daily = new DailyRewardStore(playerId, REWARD_CYCLE, {
    dayDuration: 86400,
    streakGracePeriod: 86400,
    cycleLength: 7,
    dailyDatastoreName: "StarterDailyRewards",
    enableLogging: true,
  });
  daily.init();
  daily.load();

  daily.onClaimed((event) => {
    logger.info(`Player ${event.playerId} claimed day ${event.day} — streak ${event.streak}`);
  });

  playerDailyRewards.set(playerId, daily);

  // Achievements
  const achievements = new AchievementStore(playerId, {
    achievementDatastoreName: "StarterAchievements",
    enableLogging: true,
  });
  achievements.init();

  achievements.registerAll([
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
  ]);

  achievements.load();
  achievements.onAchievementCompleted((event) => {
    logger.info(`Player ${event.playerId} unlocked achievement: ${event.achievementId}`);
  });

  playerAchievements.set(playerId, achievements);

  logger.info(`Rewards loaded for player ${playerId}`);
  return { daily, achievements };
}

/**
 * Cleanup rewards for a player (call from PlayerLifecycleService).
 */
export function cleanupPlayerRewards(playerId: number): void {
  const daily = playerDailyRewards.get(playerId);
  if (daily && daily.isDirty()) {
    daily.save();
  }
  playerDailyRewards.delete(playerId);

  const achievements = playerAchievements.get(playerId);
  if (achievements && achievements.isDirty()) {
    achievements.save();
  }
  playerAchievements.delete(playerId);
}
