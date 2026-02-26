/**
 * Factory for game-level DataService.
 *
 * Wraps PlayerDataStore with session management and player lifecycle.
 */

import { Service, createLogger } from "@broblox/core";
import { VersionedData, StoreConfig } from "./types";
import { PlayerDataStore } from "./player-data-store";
import { SessionManager } from "./session";

export interface DataServiceConfig<T extends VersionedData> {
  /** PlayerDataStore configuration. */
  storeConfig: StoreConfig<T>;
  /** Auto-save interval in seconds (default 60). */
  autoSaveIntervalSec?: number;
}

export interface DataServiceHandle<T extends VersionedData> {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the underlying PlayerDataStore. */
  getStore(): PlayerDataStore<T>;
  /** Access the SessionManager. */
  getSessionManager(): SessionManager<T>;
  /** Call from PlayerAdded — loads data and starts session. */
  initPlayer(player: Player): void;
  /** Call from PlayerRemoving — saves and ends session. */
  cleanupPlayer(player: Player): void;
}

export function createDataService<T extends VersionedData>(
  config: DataServiceConfig<T>
): DataServiceHandle<T> {
  const logger = createLogger("DataService");
  const store = new PlayerDataStore<T>(config.storeConfig);
  const sessionManager = new SessionManager<T>(store, config.autoSaveIntervalSec ?? 60);

  return {
    Service: {
      name: "DataService",

      onInit() {
        logger.info(`DataService initialized (store: ${config.storeConfig.name}).`);
      },

      onStart() {
        sessionManager.startAutoSave();
        logger.info("DataService started.");
      },

      onDestroy() {
        sessionManager.closeAll();
        logger.info("DataService stopped.");
      },
    },

    getStore() {
      return store;
    },

    getSessionManager() {
      return sessionManager;
    },

    initPlayer(player: Player) {
      sessionManager.startSession(player);
      logger.info(`Data loaded for player ${player.Name}`);
    },

    cleanupPlayer(player: Player) {
      sessionManager.endSession(player);
      logger.info(`Data saved for player ${player.Name}`);
    },
  };
}
