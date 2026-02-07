/**
 * Inventory Service — Starter Game
 *
 * Per-player item management with DataStore persistence.
 */

import { createInventoryService } from "@rbx/inventory";

const handle = createInventoryService({
  items: [
    {
      id: "coins_pouch",
      name: "Coin Pouch",
      category: "currency",
      rarity: "common",
      maxStack: 9999,
      tradeable: false,
      droppable: false,
    },
    {
      id: "health_potion",
      name: "Health Potion",
      category: "consumable",
      rarity: "common",
      maxStack: 50,
      tradeable: true,
      droppable: true,
    },
    {
      id: "iron_sword",
      name: "Iron Sword",
      category: "weapon",
      rarity: "uncommon",
      maxStack: 1,
      tradeable: true,
      droppable: true,
    },
    {
      id: "speed_boost",
      name: "Speed Boost",
      category: "consumable",
      rarity: "rare",
      maxStack: 10,
      tradeable: false,
      droppable: false,
    },
  ],
  datastoreName: "StarterInventory",
  defaultMaxSlots: 100,
  maxTotalItems: 500,
});

export const InventoryService = handle.Service;
export const getItemRegistry = () => handle.getItemRegistry();
export const getInventory = (playerId: number) => handle.getInventoryStore(playerId);
export const initPlayerInventory = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerInventory = (playerId: number) => handle.cleanupPlayer(playerId);
