/**
 * Gacha Service — Obby Game
 *
 * Egg hatching with obby-themed loot tables.
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
        id: "sky_egg",
        name: "Sky Egg",
        description: "Contains cloud and air pets",
        cost: 50,
        currency: "stars",
        lootTable: [
          { itemId: "cloud_bunny", rarity: "common", weight: 70 },
          { itemId: "spring_frog", rarity: "uncommon", weight: 25 },
          { itemId: "star_phoenix", rarity: "legendary", weight: 5 },
        ],
        pityThreshold: 30,
        pityRarity: "uncommon",
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
    datastoreName: "ObbyGacha",
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
