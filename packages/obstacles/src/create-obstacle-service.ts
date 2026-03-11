/**
 * @broblox/obstacles — createObstacleService Factory
 *
 * Standard factory pattern: accepts config, returns { Service, getters }.
 * Game-level wrapper services call this once and re-export the getters.
 */

import { createLogger } from "@broblox/core";
import { createObstacleRegistry } from "./obstacle-registry";
import { createObstacleManager } from "./obstacle-manager";
import type {
  ObstacleServiceConfig,
  ObstacleServiceHandle,
  ObstacleRegistry,
  ObstacleManager,
} from "./types";

export function createObstacleService(config: ObstacleServiceConfig): ObstacleServiceHandle {
  const logger = createLogger("ObstacleService");
  const registry = createObstacleRegistry(config.definitions);

  let managerInstance: ObstacleManager | undefined;

  function getManager(): ObstacleManager {
    if (!managerInstance) {
      error("ObstacleService not initialized");
    }
    return managerInstance;
  }

  const handle: ObstacleServiceHandle = {
    Service: {
      name: "ObstacleService",
      onInit() {
        managerInstance = createObstacleManager(registry, {
          onUpdate: config.onUpdate,
          onToggle: config.onToggle,
        });
        logger.info(`Initialized with ${registry.count()} obstacle definitions`);
      },
      onStart() {
        logger.info("ObstacleService started");
      },
    },

    getObstacleRegistry(): ObstacleRegistry {
      return registry;
    },

    getObstacleManager(): ObstacleManager {
      return getManager();
    },
  };

  return handle;
}
