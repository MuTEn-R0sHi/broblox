/**
 * Factory for game-level EquipmentService.
 *
 * Encapsulates gear registry + per-player equipment store lifecycle.
 */

import { Service, createLogger } from "@broblox/core";
import type { GearDefinition } from "./types";
import { GearRegistry } from "./gear-registry";
import { EquipmentStore } from "./equipment-store";

export interface EquipmentServiceConfig {
  /** Gear definitions to register. */
  gear: readonly GearDefinition[];
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

export interface EquipmentServiceHandle {
  Service: Service;
  getGearRegistry(): GearRegistry;
  getEquipmentStore(playerId: number): EquipmentStore | undefined;
  initPlayer(playerId: number): EquipmentStore;
  cleanupPlayer(playerId: number): void;
}

export function createEquipmentService(config: EquipmentServiceConfig): EquipmentServiceHandle {
  const logger = createLogger("EquipmentService");
  const gearRegistry = new GearRegistry();
  const playerStores = new Map<number, EquipmentStore>();

  const handle: EquipmentServiceHandle = {
    Service: {
      name: "EquipmentService",

      onInit() {
        gearRegistry.registerAll(config.gear);
        logger.info(`Gear registry initialized — ${gearRegistry.count()} items.`);

        config.onPlayerRemoving?.((player) => {
          playerStores.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("EquipmentService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        playerStores.clear();
        logger.info("EquipmentService stopped.");
      },
    },

    getGearRegistry() {
      return gearRegistry;
    },

    getEquipmentStore(playerId: number) {
      return playerStores.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new EquipmentStore(playerId, gearRegistry);
      playerStores.set(playerId, store);
      logger.info(`Equipment store created for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      playerStores.delete(playerId);
    },
  };

  return handle;
}
