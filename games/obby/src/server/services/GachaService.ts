/**
 * Gacha Service — Obby Game
 *
 * Egg hatching with obby-themed loot tables.
 */

import { createGachaService } from "@broblox/gacha";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createGachaService({
  eggs: [
    {
      id: "sky_egg",
      name: "Sky Egg",
      description: "Contains cloud and air pets",
      cost: 50,
      currency: "coins",
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
  ],
  datastoreName: "ObbyGacha",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const GachaService = handle.Service;
export const getEggRegistry = () => handle.getEggRegistry();
export const getGachaStore = (playerId: number) => handle.getGachaStore(playerId);
export const initPlayerGacha = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerGacha = (playerId: number) => handle.cleanupPlayer(playerId);
