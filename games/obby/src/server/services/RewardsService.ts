/**
 * Rewards Service — Obby Game
 *
 * Daily login rewards and achievement tracking — obby themed.
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

// 7-day obby reward cycle
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
    dailyDatastoreName: "ObbyDailyRewards",
    enableLogging: true,
  });
  daily.init();
  daily.load();

  daily.onClaimed((event) => {
    logger.info(`Player ${event.playerId} claimed day ${event.day} — streak ${event.streak}`);
  });

  playerDailyRewards.set(playerId, daily);

  // Achievements — obby themed
  const achievements = new AchievementStore(playerId, {
    achievementDatastoreName: "ObbyAchievements",
    enableLogging: true,
  });
  achievements.init();

  achievements.registerAll([
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
