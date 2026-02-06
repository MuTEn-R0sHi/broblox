/**
 * Cosmetics Service — Starter Game
 *
 * Cosmetic ownership, equip slots, and server-side validation.
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
        id: "default_skin",
        name: "Default Skin",
        description: "Standard character appearance",
        category: "skin" as const,
        rarity: "common" as const,
        tradeable: false,
        limited: false,
      },
      {
        id: "flame_trail",
        name: "Flame Trail",
        description: "Leave a trail of fire",
        category: "trail" as const,
        rarity: "epic" as const,
        tradeable: true,
        limited: false,
      },
      {
        id: "gold_hat",
        name: "Gold Hat",
        description: "A shiny golden top hat",
        category: "hat" as const,
        rarity: "legendary" as const,
        tradeable: false,
        limited: true,
      },
      {
        id: "wave_emote",
        name: "Wave",
        description: "Wave at other players",
        category: "emote" as const,
        rarity: "common" as const,
        tradeable: false,
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
    datastoreName: "StarterCosmetics",
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
