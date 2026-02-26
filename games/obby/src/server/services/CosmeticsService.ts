/**
 * Cosmetics Service — Obby Game
 *
 * Cosmetic ownership and equip for obby-themed items.
 */

import { createCosmeticsService } from "@broblox/cosmetics";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createCosmeticsService({
  cosmetics: [
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
  ],
  datastoreName: "ObbyCosmetics",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const CosmeticsService = handle.Service;
export const getCosmeticRegistry = () => handle.getCosmeticRegistry();
export const getCosmeticStore = (playerId: number) => handle.getCosmeticStore(playerId);
export const initPlayerCosmetics = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerCosmetics = (playerId: number) => handle.cleanupPlayer(playerId);
