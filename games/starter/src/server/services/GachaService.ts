/**
 * Gacha Service — Starter Game
 *
 * Egg hatching system with weighted loot tables and pity.
 */

import { Service, createLogger } from "@rbx/core";
import { EggRegistry, GachaStore } from "@rbx/gacha";

const logger = createLogger("GachaService");

const eggRegistry = new EggRegistry();
const playerGacha = new Map<number, GachaStore>();

export function getEggRegistry(): EggRegistry {
  return eggRegistry;
}

export function getGachaStore(playerId: number): GachaStore | undefined {
  return playerGacha.get(playerId);
}

export const GachaService: Service = {
  onInit() {
    eggRegistry.registerAll([
      {
        id: "basic_egg",
        name: "Basic Egg",
        description: "Contains common pets",
        cost: 100,
        currency: "coins",
        lootTable: [
          { itemId: "fire_slime", rarity: "common", weight: 60 },
          { itemId: "water_sprite", rarity: "uncommon", weight: 30 },
          { itemId: "shadow_cat", rarity: "rare", weight: 9 },
          { itemId: "fire_dragon", rarity: "legendary", weight: 1 },
        ],
        pityThreshold: 50,
        pityRarity: "rare",
        enabled: true,
        maxHatches: 0,
      },
      {
        id: "premium_egg",
        name: "Premium Egg",
        description: "Better odds for rare pets",
        cost: 500,
        currency: "gems",
        lootTable: [
          { itemId: "water_sprite", rarity: "uncommon", weight: 40 },
          { itemId: "shadow_cat", rarity: "rare", weight: 40 },
          { itemId: "fire_dragon", rarity: "legendary", weight: 20 },
        ],
        pityThreshold: 20,
        pityRarity: "legendary",
        enabled: true,
        maxHatches: 0,
      },
    ]);

    logger.info(`Egg registry initialized — ${eggRegistry.count()} eggs registered.`);
  },

  onStart() {
    logger.info("GachaService started.");
  },

  onDestroy() {
    playerGacha.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved gacha data for player ${playerId}`);
      }
    });
    logger.info("GachaService stopped.");
  },
};

export function initPlayerGacha(playerId: number): GachaStore {
  const store = new GachaStore(playerId, eggRegistry, {
    datastoreName: "StarterGacha",
    enableLogging: true,
  });
  store.init();
  store.load();
  playerGacha.set(playerId, store);
  logger.info(`Gacha data loaded for player ${playerId}`);
  return store;
}

export function cleanupPlayerGacha(playerId: number): void {
  const store = playerGacha.get(playerId);
  if (store && store.isDirty()) {
    store.save();
  }
  playerGacha.delete(playerId);
}
