/**
 * Inventory Service — Obby Game
 *
 * Per-player collectible and consumable management.
 * Themed for obby gameplay (trail items, boosts, cosmetics).
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
    // ----- Register obby items -----
    registry.register({
      id: "skip_stage",
      name: "Stage Skip",
      category: "consumable",
      rarity: "rare",
      maxStack: 10,
      tradeable: false,
      droppable: false,
    });

    registry.register({
      id: "speed_coil",
      name: "Speed Coil",
      category: "tool",
      rarity: "uncommon",
      maxStack: 1,
      tradeable: false,
      droppable: false,
    });

    registry.register({
      id: "gravity_coil",
      name: "Gravity Coil",
      category: "tool",
      rarity: "rare",
      maxStack: 1,
      tradeable: false,
      droppable: false,
    });

    registry.register({
      id: "checkpoint_token",
      name: "Checkpoint Token",
      category: "consumable",
      rarity: "common",
      maxStack: 99,
      tradeable: false,
      droppable: false,
    });

    registry.register({
      id: "trail_fire",
      name: "Fire Trail",
      category: "cosmetic",
      rarity: "epic",
      maxStack: 1,
      tradeable: true,
      droppable: false,
    });

    logger.info(`Item registry initialized — ${registry.count()} items registered.`);
  },

  onStart() {
    logger.info("InventoryService started.");
  },

  onDestroy() {
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
    datastoreName: "ObbyInventory",
    defaultMaxSlots: 50,
    enableLogging: true,
    maxTotalItems: 200,
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
