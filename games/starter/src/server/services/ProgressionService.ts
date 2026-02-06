/**
 * Progression Service — Starter Game
 *
 * Per-player XP, levels, and prestige tracking.
 * Uses the @rbx/progression package.
 */

import { Service, createLogger } from "@rbx/core";
import { ProgressionStore } from "@rbx/progression";

const logger = createLogger("ProgressionService");

const playerProgression = new Map<number, ProgressionStore>();

export function getProgression(playerId: number): ProgressionStore | undefined {
  return playerProgression.get(playerId);
}

export const ProgressionService: Service = {
  onInit() {
    logger.info("ProgressionService initialized.");
  },

  onStart() {
    logger.info("ProgressionService started.");
  },

  onDestroy() {
    playerProgression.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved progression for player ${playerId}`);
      }
    });
    logger.info("ProgressionService stopped.");
  },
};

/**
 * Initialize progression for a player (call from PlayerLifecycleService).
 */
export function initPlayerProgression(playerId: number): ProgressionStore {
  const store = new ProgressionStore(playerId, {
    maxLevel: 100,
    xpCurve: "quadratic",
    baseXp: 100,
    growthFactor: 1.5,
    prestigeEnabled: true,
    prestigeMinLevel: 100,
    maxPrestige: 10,
    prestigeXpBonus: 0.1,
    datastoreName: "StarterProgression",
    enableLogging: true,
  });
  store.init();
  store.load();

  store.onLevelUp((event) => {
    logger.info(`Player ${event.playerId} leveled up: ${event.previousLevel} → ${event.newLevel}`);
  });

  store.onPrestige((event) => {
    logger.info(
      `Player ${event.playerId} prestiged: ${event.previousPrestige} → ${event.newPrestige}`
    );
  });

  playerProgression.set(playerId, store);
  logger.info(`Progression loaded for player ${playerId} — level ${store.getLevel()}`);
  return store;
}

/**
 * Cleanup progression for a player (call from PlayerLifecycleService).
 */
export function cleanupPlayerProgression(playerId: number): void {
  const store = playerProgression.get(playerId);
  if (store && store.isDirty()) {
    store.save();
  }
  playerProgression.delete(playerId);
}
