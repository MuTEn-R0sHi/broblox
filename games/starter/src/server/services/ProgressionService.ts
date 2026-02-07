/**
 * Progression Service — Starter Game
 *
 * Per-player XP, levels, and prestige tracking.
 */

import { createProgressionService } from "@rbx/progression";
import { createLogger } from "@rbx/core";

const logger = createLogger("ProgressionService");

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
