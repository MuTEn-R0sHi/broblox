/**
 * Inventory Service — Obby Game
 *
 * Per-player collectible and consumable management.
 * Themed for obby gameplay (trail items, boosts, cosmetics).
 */

import { createInventoryService } from "@rbx/inventory";

const handle = createInventoryService({
  items: [
    {
      id: "skip_stage",
      name: "Stage Skip",
      category: "consumable",
      rarity: "rare",
      maxStack: 10,
      tradeable: false,
      droppable: false,
    },
    {
      id: "speed_coil",
      name: "Speed Coil",
      category: "tool",
      rarity: "uncommon",
      maxStack: 1,
      tradeable: false,
      droppable: false,
    },
    {
      id: "gravity_coil",
      name: "Gravity Coil",
      category: "tool",
      rarity: "rare",
      maxStack: 1,
      tradeable: false,
      droppable: false,
    },
    {
      id: "checkpoint_token",
      name: "Checkpoint Token",
      category: "consumable",
      rarity: "common",
      maxStack: 99,
      tradeable: false,
      droppable: false,
    },
    {
      id: "trail_fire",
      name: "Fire Trail",
      category: "cosmetic",
      rarity: "epic",
      maxStack: 1,
      tradeable: true,
      droppable: false,
    },
  ],
  datastoreName: "ObbyInventory",
  defaultMaxSlots: 50,
  maxTotalItems: 200,
});

export const InventoryService = handle.Service;
export const getItemRegistry = () => handle.getItemRegistry();
export const getInventory = (playerId: number) => handle.getInventoryStore(playerId);
export const initPlayerInventory = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerInventory = (playerId: number) => handle.cleanupPlayer(playerId);
