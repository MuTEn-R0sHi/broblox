/**
 * Factory for game-level GachaService.
 *
 * Encapsulates egg registry + per-player gacha store lifecycle.
 */

import { Service, createLogger } from "@broblox/core";
import { EggDefinition, GachaConfig } from "./types";
import { EggRegistry } from "./egg-registry";
import { GachaStore } from "./gacha-store";

export interface GachaServiceConfig {
  /** Egg definitions with loot tables to register. */
  eggs: EggDefinition[];
  /** DataStore name, e.g. "StarterGacha". */
  datastoreName: string;
  /** Extra GachaStore options. */
  storeOptions?: Partial<GachaConfig>;
  /**
   * Wires player-leave cleanup.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
  /**
   * Wires player-join initialization.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: Player) => void) => void;
}

export interface GachaServiceHandle {
  Service: Service;
  getEggRegistry(): EggRegistry;
  getGachaStore(playerId: number): GachaStore | undefined;
  initPlayer(playerId: number): GachaStore;
  cleanupPlayer(playerId: number): void;
}

export function createGachaService(config: GachaServiceConfig): GachaServiceHandle {
  const logger = createLogger("GachaService");
  const eggRegistry = new EggRegistry();
  const playerGacha = new Map<number, GachaStore>();

  const handle: GachaServiceHandle = {
    Service: {
      name: "GachaService",

      onInit() {
        for (const egg of config.eggs) {
          eggRegistry.register(egg);
        }
        logger.info(`Egg registry initialized — ${eggRegistry.count()} eggs.`);
        config.onPlayerRemoving?.((player) => {
          const store = playerGacha.get(player.UserId);
          if (store && store.isDirty()) {
            store.save();
          }
          playerGacha.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("GachaService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        playerGacha.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved gacha data for player ${playerId}`);
          }
        });
        logger.info("GachaService stopped.");
      },
    },

    getEggRegistry() {
      return eggRegistry;
    },

    getGachaStore(playerId: number) {
      return playerGacha.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new GachaStore(playerId, eggRegistry, {
        datastoreName: config.datastoreName,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();
      playerGacha.set(playerId, store);
      logger.info(`Gacha loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerGacha.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerGacha.delete(playerId);
    },
  };
  return handle;
}
