/**
 * Progression Service — Starter Game
 *
 * Per-player XP, levels, and prestige tracking.
 */

import { createProgressionService } from "@broblox/progression";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";
import { getAchievements } from "./RewardsService";
import { getEventTracker } from "./AnalyticsService";

const handle = createProgressionService({
  datastoreName: "StarterProgression",
  maxLevel: 100,
  xpCurve: "quadratic",
  baseXp: 100,
  growthFactor: 1.5,
  prestigeEnabled: true,
  prestigeMinLevel: 100,
  maxPrestige: 10,
  prestigeXpBonus: 0.1,
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onLevelUp: (playerId: number, level: number) => {
    const player = Players.GetPlayerByUserId(playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("LevelUp", player, { newLevel: level });
      RemoteService.getRegistry().fireClient("Notification", player, {
        type: "level_up",
        message: `You reached level ${level}!`,
        data: { level },
      });
      getAchievements(playerId)?.setProgress("ach_level_10", level);
      getAchievements(playerId)?.setProgress("ach_level_50", level);
      getEventTracker().track("player.level_up", playerId, { level });
    }
  },
  onPrestige: (playerId: number, prestige: number) => {
    const player = Players.GetPlayerByUserId(playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("PrestigeUnlocked", player, {
        newPrestige: prestige,
      });
      RemoteService.getRegistry().fireClient("Notification", player, {
        type: "prestige",
        message: `You achieved prestige ${prestige}!`,
        data: { prestige },
      });
    }
  },
});

export const ProgressionService = handle.Service;
export const getProgression = (playerId: number) => handle.getProgressionStore(playerId);
export const cleanupPlayerProgression = (playerId: number) => handle.cleanupPlayer(playerId);
