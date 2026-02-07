/**
 * Progression Service — Obby Game
 *
 * Per-player XP, levels, and prestige — themed for obby stages.
 * Players earn XP from completing stages and objectives.
 */

import { createProgressionService } from "@rbx/progression";
import { createLogger } from "@rbx/core";

const logger = createLogger("ProgressionService");

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
});

export const ProgressionService = handle.Service;
export const getProgression = (playerId: number) => handle.getProgressionStore(playerId);
export const cleanupPlayerProgression = (playerId: number) => handle.cleanupPlayer(playerId);

/** Initialize progression for a player — adds game-specific event callbacks. */
export function initPlayerProgression(playerId: number) {
  const store = handle.initPlayer(playerId);
  store.onLevelUp((event) => {
    logger.info(`Player ${event.playerId} leveled up: ${event.previousLevel} → ${event.newLevel}`);
  });
  store.onPrestige((event) => {
    logger.info(
      `Player ${event.playerId} prestiged: ${event.previousPrestige} → ${event.newPrestige}`
    );
  });
  return store;
}
