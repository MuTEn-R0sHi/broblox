/**
 * Inventory Service — Starter Game
 *
 * Per-player item management with DataStore persistence.
 * Uses the @rbx/inventory package.
 */

import { Service, createLogger } from "@rbx/core";
import { ItemRegistry, InventoryStore } from "@rbx/inventory";

const logger = createLogger("InventoryService");

const registry = new ItemRegistry();
const playerInventories = new Map<number, InventoryStore>();

export function getItemRegistry(): ItemRegistry {
  return registry;
}

export function getInventory(playerId: number): InventoryStore | undefined {
  return playerInventories.get(playerId);
}

export const InventoryService: Service = {
  onInit() {
    // ----- Register item definitions -----
    registry.register({
      id: "coins_pouch",
      name: "Coin Pouch",
      category: "currency",
      rarity: "common",
      maxStack: 9999,
      tradeable: false,
      droppable: false,
    });

    registry.register({
      id: "health_potion",
      name: "Health Potion",
      category: "consumable",
      rarity: "common",
      maxStack: 50,
      tradeable: true,
      droppable: true,
    });

    registry.register({
      id: "iron_sword",
      name: "Iron Sword",
      category: "weapon",
      rarity: "uncommon",
      maxStack: 1,
      tradeable: true,
      droppable: true,
    });

    registry.register({
      id: "speed_boost",
      name: "Speed Boost",
      category: "consumable",
      rarity: "rare",
      maxStack: 10,
      tradeable: false,
      droppable: false,
    });

    logger.info(`Item registry initialized — ${registry.count()} items registered.`);
  },

  onStart() {
    logger.info("InventoryService started.");
  },

  onDestroy() {
    // Save all player inventories
    playerInventories.forEach((inv, playerId) => {
      if (inv.isDirty()) {
        inv.save();
        logger.info(`Saved inventory for player ${playerId}`);
      }
    });
    logger.info("InventoryService stopped.");
  },
};

/**
 * Initialize inventory for a player (call from PlayerLifecycleService).
 */
export function initPlayerInventory(playerId: number): InventoryStore {
  const inv = new InventoryStore(playerId, registry, {
    datastoreName: "StarterInventory",
    defaultMaxSlots: 100,
    enableLogging: true,
    maxTotalItems: 500,
  });
  inv.init();
  inv.load();
  playerInventories.set(playerId, inv);
  logger.info(`Inventory loaded for player ${playerId}`);
  return inv;
}

/**
 * Cleanup inventory for a player (call from PlayerLifecycleService).
 */
export function cleanupPlayerInventory(playerId: number): void {
  const inv = playerInventories.get(playerId);
  if (inv && inv.isDirty()) {
    inv.save();
  }
  playerInventories.delete(playerId);
}
