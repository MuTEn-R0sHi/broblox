/**
 * Pet Service — Starter Game
 *
 * Per-player pet management with registry, leveling, and evolution.
 */

import { createPetService } from "@rbx/pets";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createPetService({
  pets: [
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
  ],
  datastoreName: "StarterPets",
  maxEquipped: 3,
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const PetService = handle.Service;
export const getPetRegistry = () => handle.getPetRegistry();
export const getPetStore = (playerId: number) => handle.getPetStore(playerId);
export const initPlayerPets = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerPets = (playerId: number) => handle.cleanupPlayer(playerId);
