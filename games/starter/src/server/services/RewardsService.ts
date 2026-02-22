/**
 * Rewards Service — Starter Game
 *
 * Daily login rewards and achievement tracking.
 */

import { createRewardsService } from "@rbx/rewards";
import type { DailyRewardDay } from "@rbx/rewards";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";

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
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onAchievementCompleted: (event) => {
    const player = Players.GetPlayerByUserId(event.playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("Notification", player, {
        type: "achievement_completed",
        message: "Achievement unlocked!",
        data: { achievementId: event.achievementId, rewards: event.rewards },
      });
    }
  },
  onDailyRewardClaimed: (event) => {
    const player = Players.GetPlayerByUserId(event.playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("Notification", player, {
        type: "daily_reward",
        message: `Day ${event.day} login reward claimed!`,
        data: { day: event.day, streak: event.streak, rewards: event.rewards },
      });
    }
  },
});

export const RewardsService = handle.Service;
export const getDailyRewards = (playerId: number) => handle.getDailyRewardStore(playerId);
export const getAchievements = (playerId: number) => handle.getAchievementStore(playerId);
export const cleanupPlayerRewards = (playerId: number) => handle.cleanupPlayer(playerId);
