/**
 * Progression Service — Obby Game
 *
 * Per-player XP, levels, and prestige — themed for obby stages.
 * Players earn XP from completing stages and objectives.
 */

import { createProgressionService } from "@rbx/progression";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";
import { getAchievements } from "./RewardsService";

const handle = createProgressionService({
  datastoreName: "ObbyProgression",
  maxLevel: 50,
  xpCurve: "linear",
  baseXp: 50,
  growthFactor: 1.0,
  prestigeEnabled: true,
  prestigeMinLevel: 50,
  maxPrestige: 5,
  prestigeXpBonus: 0.15,
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onLevelUp: (playerId: number, level: number) => {
    const player = Players.GetPlayerByUserId(playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("LevelUp", player, { newLevel: level });
      getAchievements(playerId)?.setProgress("ach_level_25", level);
    }
  },
  onPrestige: (playerId: number, prestige: number) => {
    const player = Players.GetPlayerByUserId(playerId);
    if (player !== undefined) {
      RemoteService.getRegistry().fireClient("PrestigeUnlocked", player, { newPrestige: prestige });
    }
  },
});

export const ProgressionService = handle.Service;
export const getProgression = (playerId: number) => handle.getProgressionStore(playerId);
export const cleanupPlayerProgression = (playerId: number) => handle.cleanupPlayer(playerId);
