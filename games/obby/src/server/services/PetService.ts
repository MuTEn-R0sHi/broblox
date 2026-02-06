/**
 * Pet Service — Obby Game
 *
 * Per-player pet management themed for obby gameplay.
 */

import { Service, createLogger } from "@rbx/core";
import { PetRegistry, PetStore } from "@rbx/pets";

const logger = createLogger("PetService");

const registry = new PetRegistry();
const playerPets = new Map<number, PetStore>();

export function getPetRegistry(): PetRegistry {
  return registry;
}

export function getPetStore(playerId: number): PetStore | undefined {
  return playerPets.get(playerId);
}

export const PetService: Service = {
  onInit() {
    registry.registerAll([
      {
        id: "cloud_bunny",
        name: "Cloud Bunny",
        rarity: "common",
        element: "air",
        baseStats: { power: 5, speed: 15, stamina: 10, luck: 8 },
        maxLevel: 10,
        baseXp: 80,
        growthRate: 1.15,
        abilities: [],
      },
      {
        id: "spring_frog",
        name: "Spring Frog",
        rarity: "uncommon",
        element: "earth",
        baseStats: { power: 6, speed: 12, stamina: 14, luck: 6 },
        maxLevel: 10,
        baseXp: 100,
        growthRate: 1.2,
        abilities: [],
      },
      {
        id: "star_phoenix",
        name: "Star Phoenix",
        rarity: "legendary",
        element: "fire",
        baseStats: { power: 20, speed: 25, stamina: 30, luck: 15 },
        maxLevel: 20,
        baseXp: 200,
        growthRate: 1.4,
        abilities: [],
      },
    ]);

    logger.info(`Pet registry initialized — ${registry.count()} species registered.`);
  },

  onStart() {
    logger.info("PetService started.");
  },

  onDestroy() {
    playerPets.forEach((store, playerId) => {
      if (store.isDirty()) {
        store.save();
        logger.info(`Saved pets for player ${playerId}`);
      }
    });
    logger.info("PetService stopped.");
  },
};

export function initPlayerPets(playerId: number): PetStore {
  const store = new PetStore(playerId, registry, {
    datastoreName: "ObbyPets",
    enableLogging: true,
    maxEquipped: 1,
  });
  store.init();
  store.load();
  playerPets.set(playerId, store);
  logger.info(`Pets loaded for player ${playerId}`);
  return store;
}

export function cleanupPlayerPets(playerId: number): void {
  const store = playerPets.get(playerId);
  if (store && store.isDirty()) {
    store.save();
  }
  playerPets.delete(playerId);
}
