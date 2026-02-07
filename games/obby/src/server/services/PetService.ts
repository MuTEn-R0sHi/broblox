/**
 * Pet Service — Obby Game
 *
 * Per-player pet management themed for obby gameplay.
 */

import { createPetService } from "@rbx/pets";

const handle = createPetService({
  pets: [
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
  ],
  datastoreName: "ObbyPets",
  maxEquipped: 1,
});

export const PetService = handle.Service;
export const getPetRegistry = () => handle.getPetRegistry();
export const getPetStore = (playerId: number) => handle.getPetStore(playerId);
export const initPlayerPets = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerPets = (playerId: number) => handle.cleanupPlayer(playerId);
