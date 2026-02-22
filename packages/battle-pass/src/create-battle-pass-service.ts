/**
 * Factory for game-level BattlePassService.
 *
 * Eliminates per-game boilerplate by encapsulating the common
 * registry + per-player store lifecycle.
 */

import { Service, createLogger } from "@rbx/core";
import { SeasonDefinition, BattlePassConfig } from "./types";
import { SeasonRegistry } from "./season-registry";
import { BattlePassStore } from "./battle-pass-store";

export interface BattlePassServiceConfig {
  /** Seasons to register at init (usually one active). */
  seasons: SeasonDefinition[];
  /** DataStore name, e.g. "StarterBattlePass". */
  datastoreName: string;
  /** Extra BattlePassStore options. */
  storeOptions?: Partial<BattlePassConfig>;
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

export interface BattlePassServiceHandle {
  /** The Roblox Service object — register with your game's Application. */
  Service: Service;
  /** Access the shared SeasonRegistry. */
  getSeasonRegistry(): SeasonRegistry;
  /** Get a player's BattlePassStore (undefined if not yet initialised). */
  getBattlePassStore(playerId: number): BattlePassStore | undefined;
  /** Call from PlayerAdded — creates, inits, loads, and sets the active season. */
  initPlayer(playerId: number): BattlePassStore;
  /** Call from PlayerRemoving — saves dirty data then removes the store. */
  cleanupPlayer(playerId: number): void;
}

export function createBattlePassService(config: BattlePassServiceConfig): BattlePassServiceHandle {
  const logger = createLogger("BattlePassService");
  const seasonRegistry = new SeasonRegistry();
  const playerStores = new Map<number, BattlePassStore>();

  const handle: BattlePassServiceHandle = {
    Service: {
      name: "BattlePassService",

      onInit() {
        for (const season of config.seasons) {
          seasonRegistry.register(season);
        }
        logger.info(`Season registry initialized — ${seasonRegistry.count()} seasons.`);
        config.onPlayerRemoving?.((player) => {
          const store = playerStores.get(player.UserId);
          if (store && store.isDirty()) {
            store.save();
          }
          playerStores.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("BattlePassService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        playerStores.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved battle pass data for player ${playerId}`);
          }
        });
        logger.info("BattlePassService stopped.");
      },
    },

    getSeasonRegistry() {
      return seasonRegistry;
    },

    getBattlePassStore(playerId: number) {
      return playerStores.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new BattlePassStore(playerId, seasonRegistry, {
        datastoreName: config.datastoreName,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();
      const active = seasonRegistry.getActive();
      if (active !== undefined) {
        store.setSeason(active.id);
      }
      playerStores.set(playerId, store);
      logger.info(`Battle pass loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerStores.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerStores.delete(playerId);
    },
  };
  return handle;
}
