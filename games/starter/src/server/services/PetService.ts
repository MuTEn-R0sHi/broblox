/**
 * Pet Service — Starter Game
 *
 * Per-player pet management with registry, leveling, and evolution.
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
        id: "fire_slime",
        name: "Fire Slime",
        rarity: "common",
        element: "fire",
        baseStats: { power: 10, speed: 8, stamina: 12, luck: 5 },
        maxLevel: 10,
        baseXp: 100,
        growthRate: 1.2,
        abilities: [],
        evolvesInto: "fire_dragon",
        evolveLevel: 10,
      },
      {
        id: "fire_dragon",
        name: "Fire Dragon",
        rarity: "legendary",
        element: "fire",
        baseStats: { power: 50, speed: 40, stamina: 60, luck: 20 },
        maxLevel: 20,
        baseXp: 200,
        growthRate: 1.5,
        abilities: [],
      },
      {
        id: "water_sprite",
        name: "Water Sprite",
        rarity: "uncommon",
        element: "water",
        baseStats: { power: 8, speed: 12, stamina: 10, luck: 8 },
        maxLevel: 10,
        baseXp: 100,
        growthRate: 1.2,
        abilities: [],
      },
      {
        id: "shadow_cat",
        name: "Shadow Cat",
        rarity: "rare",
        element: "dark",
        baseStats: { power: 15, speed: 20, stamina: 8, luck: 12 },
        maxLevel: 15,
        baseXp: 150,
        growthRate: 1.3,
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
    datastoreName: "StarterPets",
    enableLogging: true,
    maxEquipped: 3,
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
