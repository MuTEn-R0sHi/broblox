/**
 * Factory for game-level LeaderboardService.
 *
 * Wraps LeaderboardStore with lifecycle management and
 * pre-registers leaderboard definitions.
 */

import { Service, createLogger } from "@broblox/core";
import { LeaderboardsConfig, LeaderboardDefinition } from "./types";
import { LeaderboardStore } from "./leaderboard-store";

export interface LeaderboardServiceConfig {
  /** Leaderboard definitions to register at init. */
  definitions: LeaderboardDefinition[];
  /** Store configuration overrides. */
  storeConfig?: Partial<LeaderboardsConfig>;
}

export interface LeaderboardServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the LeaderboardStore. */
  getLeaderboardStore(): LeaderboardStore;
}

export function createLeaderboardService(
  config: LeaderboardServiceConfig
): LeaderboardServiceHandle {
  const logger = createLogger("LeaderboardService");
  const store = new LeaderboardStore(config.storeConfig);

  return {
    Service: {
      name: "LeaderboardService",

      onInit() {
        for (const def of config.definitions) {
          store.register(def);
        }
        logger.info(
          `LeaderboardService initialized — ${config.definitions.size()} leaderboards registered.`
        );
      },

      onStart() {
        logger.info("LeaderboardService started.");
      },

      onDestroy() {
        logger.info("LeaderboardService stopped.");
      },
    },

    getLeaderboardStore() {
      return store;
    },
  };
}
