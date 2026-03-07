/**
 * Factory for game-level PetService.
 *
 * Encapsulates pet registry + per-player store lifecycle.
 */

import { Service, createLogger } from "@broblox/core";
import { PetSpecies, PetConfig } from "./types";
import { PetRegistry } from "./pet-registry";
import { PetStore } from "./pet-store";

export interface PetServiceConfig {
  /** Pet species to register. */
  pets: PetSpecies[];
  /** DataStore name, e.g. "TestParkPets". */
  datastoreName: string;
  /** Max simultaneously equipped pets. */
  maxEquipped?: number;
  /** Extra PetStore options. */
  storeOptions?: Partial<PetConfig>;
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

export interface PetServiceHandle {
  Service: Service;
  getPetRegistry(): PetRegistry;
  getPetStore(playerId: number): PetStore | undefined;
  initPlayer(playerId: number): PetStore;
  cleanupPlayer(playerId: number): void;
}

export function createPetService(config: PetServiceConfig): PetServiceHandle {
  const logger = createLogger("PetService");
  const petRegistry = new PetRegistry();
  const playerPets = new Map<number, PetStore>();

  const handle: PetServiceHandle = {
    Service: {
      name: "PetService",

      onInit() {
        for (const pet of config.pets) {
          petRegistry.register(pet);
        }
        logger.info(`Pet registry initialized — ${petRegistry.count()} species.`);
        config.onPlayerRemoving?.((player) => {
          const store = playerPets.get(player.UserId);
          if (store && store.isDirty()) {
            store.save();
          }
          playerPets.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("PetService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        playerPets.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved pets for player ${playerId}`);
          }
        });
        logger.info("PetService stopped.");
      },
    },

    getPetRegistry() {
      return petRegistry;
    },

    getPetStore(playerId: number) {
      return playerPets.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new PetStore(playerId, petRegistry, {
        datastoreName: config.datastoreName,
        maxEquipped: config.maxEquipped ?? 3,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();
      playerPets.set(playerId, store);
      logger.info(`Pets loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerPets.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerPets.delete(playerId);
    },
  };
  return handle;
}
