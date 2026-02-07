/**
 * Factory for game-level CosmeticsService.
 *
 * Encapsulates cosmetic registry + per-player cosmetic store lifecycle.
 */

import { Service, createLogger } from "@rbx/core";
import { CosmeticDefinition, CosmeticsConfig } from "./types";
import { CosmeticRegistry } from "./cosmetic-registry";
import { CosmeticStore } from "./cosmetic-store";

export interface CosmeticsServiceConfig {
  /** Cosmetic items to register. */
  cosmetics: CosmeticDefinition[];
  /** DataStore name, e.g. "StarterCosmetics". */
  datastoreName: string;
  /** Extra CosmeticStore options. */
  storeOptions?: Partial<CosmeticsConfig>;
}

export interface CosmeticsServiceHandle {
  Service: Service;
  getCosmeticRegistry(): CosmeticRegistry;
  getCosmeticStore(playerId: number): CosmeticStore | undefined;
  initPlayer(playerId: number): CosmeticStore;
  cleanupPlayer(playerId: number): void;
}

export function createCosmeticsService(config: CosmeticsServiceConfig): CosmeticsServiceHandle {
  const logger = createLogger("CosmeticsService");
  const cosmeticRegistry = new CosmeticRegistry();
  const playerCosmetics = new Map<number, CosmeticStore>();

  return {
    Service: {
      name: "CosmeticsService",

      onInit() {
        for (const cosmetic of config.cosmetics) {
          cosmeticRegistry.register(cosmetic);
        }
        logger.info(`Cosmetic registry initialized — ${cosmeticRegistry.count()} items.`);
      },

      onStart() {
        logger.info("CosmeticsService started.");
      },

      onDestroy() {
        playerCosmetics.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved cosmetics for player ${playerId}`);
          }
        });
        logger.info("CosmeticsService stopped.");
      },
    },

    getCosmeticRegistry() {
      return cosmeticRegistry;
    },

    getCosmeticStore(playerId: number) {
      return playerCosmetics.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new CosmeticStore(playerId, cosmeticRegistry, {
        datastoreName: config.datastoreName,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();
      playerCosmetics.set(playerId, store);
      logger.info(`Cosmetics loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerCosmetics.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerCosmetics.delete(playerId);
    },
  };
}
