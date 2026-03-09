/**
 * @broblox/hazards — createHazardService Factory
 *
 * Standard factory pattern: accepts config, returns { Service, getters }.
 * Game-level wrapper services call this once and re-export the getters.
 */

import { createLogger } from "@broblox/core";
import { createHazardRegistry } from "./hazard-registry";
import { createHazardManager } from "./hazard-manager";
import type {
  HazardServiceConfig,
  HazardServiceHandle,
  HazardRegistry,
  HazardManager,
} from "./types";

export function createHazardService(config: HazardServiceConfig): HazardServiceHandle {
  const logger = createLogger("HazardService");
  const registry = createHazardRegistry(config.definitions);

  const onDamage =
    config.onDamage ??
    ((_playerId: number, _damage: number, _hazardId: string) => {
      // fallback: no-op (game must provide real implementation)
      return false;
    });

  const onKill =
    config.onKill ??
    ((_playerId: number, _hazardId: string) => {
      // fallback: no-op
    });

  let managerInstance: ReturnType<typeof createHazardManager> | undefined;

  function getManager() {
    if (!managerInstance) {
      throw new Error("HazardService not initialized");
    }
    return managerInstance;
  }

  const handle: HazardServiceHandle = {
    Service: {
      name: "HazardService",
      onInit() {
        managerInstance = createHazardManager(registry, {
          onDamage,
          onKill,
          onToggle(instanceKey, active) {
            logger.debug(`Hazard ${instanceKey} → ${active ? "active" : "inactive"}`);
          },
        });
        logger.info(`Initialized with ${registry.count()} hazard definitions`);
      },
      onStart() {
        if (config.onPlayerRemoving) {
          config.onPlayerRemoving((player) => {
            handle.cleanupPlayer(player.UserId);
          });
        }
        logger.info("HazardService started");
      },
    },

    getHazardRegistry(): HazardRegistry {
      return registry;
    },

    getHazardManager(): HazardManager {
      return getManager();
    },

    initPlayer(playerId: number) {
      const mgr = getManager() as ReturnType<typeof createHazardManager>;
      mgr._initPlayer(playerId);
    },

    cleanupPlayer(playerId: number) {
      const mgr = getManager() as ReturnType<typeof createHazardManager>;
      mgr._cleanupPlayer(playerId);
    },
  };

  return handle;
}
