/**
 * Cosmetics Service — Starter Game
 *
 * Cosmetic ownership, equip slots, and server-side validation.
 */

import { createCosmeticsService } from "@rbx/cosmetics";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createCosmeticsService({
  cosmetics: [
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
  ],
  datastoreName: "StarterCosmetics",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const CosmeticsService = handle.Service;
export const getCosmeticRegistry = () => handle.getCosmeticRegistry();
export const getCosmeticStore = (playerId: number) => handle.getCosmeticStore(playerId);
export const initPlayerCosmetics = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerCosmetics = (playerId: number) => handle.cleanupPlayer(playerId);
