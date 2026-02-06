/**
 * Cosmetics Service — Obby Game
 *
 * Cosmetic ownership and equip for obby-themed items.
 */

import { Service, createLogger } from "@rbx/core";
import { CosmeticRegistry, CosmeticStore } from "@rbx/cosmetics";

const logger = createLogger("CosmeticsService");

const registry = new CosmeticRegistry();
const playerCosmetics = new Map<number, CosmeticStore>();

export function getCosmeticRegistry(): CosmeticRegistry {
  return registry;
}

export function getCosmeticStore(playerId: number): CosmeticStore | undefined {
  return playerCosmetics.get(playerId);
}

export const CosmeticsService: Service = {
  onInit() {
    registry.registerAll([
      {
        id: "rainbow_trail",
        name: "Rainbow Trail",
        description: "A colorful trail behind you",
        category: "trail" as const,
        rarity: "rare" as const,
        tradeable: true,
        limited: false,
      },
      {
        id: "crown_hat",
        name: "Crown",
        description: "For obby champions",
        category: "hat" as const,
        rarity: "legendary" as const,
        tradeable: false,
        limited: true,
      },
      {
        id: "sparkle_effect",
        name: "Sparkle",
        description: "Shimmering particles",
        category: "effect" as const,
        rarity: "uncommon" as const,
        tradeable: true,
        limited: false,
      },
    ]);

    logger.info(`Cosmetic registry initialized — ${registry.count()} cosmetics registered.`);
  },

  onStart() {
    logger.info("CosmeticsService started.");
  },

  onDestroy() {
    playerCosmetics.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved cosmetics for player ${playerId}`);
      }
    });
    logger.info("CosmeticsService stopped.");
  },
};

export function initPlayerCosmetics(playerId: number): CosmeticStore {
  const store = new CosmeticStore(playerId, registry, {
    datastoreName: "ObbyCosmetics",
    enableLogging: true,
  });
  store.init();
  store.load();
  playerCosmetics.set(playerId, store);
  logger.info(`Cosmetics loaded for player ${playerId}`);
  return store;
}

export function cleanupPlayerCosmetics(playerId: number): void {
  const store = playerCosmetics.get(playerId);
  if (store && store.isDirty()) {
    store.save();
  }
  playerCosmetics.delete(playerId);
}
