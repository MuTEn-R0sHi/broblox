/**
 * Gacha Service — Starter Game
 *
 * Egg hatching system with weighted loot tables and pity.
 */

import { createGachaService } from "@rbx/gacha";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createGachaService({
  eggs: [
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
  ],
  datastoreName: "StarterGacha",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const GachaService = handle.Service;
export const getEggRegistry = () => handle.getEggRegistry();
export const getGachaStore = (playerId: number) => handle.getGachaStore(playerId);
export const initPlayerGacha = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerGacha = (playerId: number) => handle.cleanupPlayer(playerId);
