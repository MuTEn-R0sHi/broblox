/**
 * Factory for game-level InventoryService.
 *
 * Encapsulates item registry + per-player inventory store lifecycle.
 */

import { Service, createLogger } from "@rbx/core";
import { ItemDefinition, InventoryConfig } from "./types";
import { ItemRegistry } from "./item-registry";
import { InventoryStore } from "./inventory-store";

export interface InventoryServiceConfig {
  /** Item definitions to register. */
  items: ItemDefinition[];
  /** DataStore name, e.g. "StarterInventory". */
  datastoreName: string;
  /** Max inventory slots per player. */
  defaultMaxSlots?: number;
  /** Max total items across all slots. */
  maxTotalItems?: number;
  /** Extra InventoryStore options. */
  storeOptions?: Partial<InventoryConfig>;
}

export interface InventoryServiceHandle {
  Service: Service;
  getItemRegistry(): ItemRegistry;
  getInventoryStore(playerId: number): InventoryStore | undefined;
  initPlayer(playerId: number): InventoryStore;
  cleanupPlayer(playerId: number): void;
}

export function createInventoryService(config: InventoryServiceConfig): InventoryServiceHandle {
  const logger = createLogger("InventoryService");
  const itemRegistry = new ItemRegistry();
  const playerInventories = new Map<number, InventoryStore>();

  return {
    Service: {
      name: "InventoryService",

      onInit() {
        for (const item of config.items) {
          itemRegistry.register(item);
        }
        logger.info(`Item registry initialized — ${itemRegistry.count()} items.`);
      },

      onStart() {
        logger.info("InventoryService started.");
      },

      onDestroy() {
        playerInventories.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved inventory for player ${playerId}`);
          }
        });
        logger.info("InventoryService stopped.");
      },
    },

    getItemRegistry() {
      return itemRegistry;
    },

    getInventoryStore(playerId: number) {
      return playerInventories.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new InventoryStore(playerId, itemRegistry, {
        datastoreName: config.datastoreName,
        defaultMaxSlots: config.defaultMaxSlots ?? 100,
        maxTotalItems: config.maxTotalItems ?? 500,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();
      playerInventories.set(playerId, store);
      logger.info(`Inventory loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerInventories.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerInventories.delete(playerId);
    },
  };
}
