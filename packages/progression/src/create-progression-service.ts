/**
 * Factory for game-level ProgressionService.
 *
 * Encapsulates per-player progression store lifecycle.
 */

import { Service, createLogger } from "@rbx/core";
import { ProgressionConfig } from "./types";
import { ProgressionStore } from "./progression-store";

export interface ProgressionServiceConfig {
  /** DataStore name, e.g. "StarterProgression". */
  datastoreName: string;
  /** Progression curve and prestige settings. */
  maxLevel: number;
  xpCurve: "linear" | "quadratic" | "exponential" | "custom";
  baseXp: number;
  growthFactor: number;
  prestigeEnabled?: boolean;
  prestigeMinLevel?: number;
  maxPrestige?: number;
  prestigeXpBonus?: number;
  /** Callbacks for level/prestige events. */
  onLevelUp?: (playerId: number, level: number) => void;
  onPrestige?: (playerId: number, prestige: number) => void;
  /** Extra ProgressionStore options. */
  storeOptions?: Partial<ProgressionConfig>;
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

export interface ProgressionServiceHandle {
  Service: Service;
  getProgressionStore(playerId: number): ProgressionStore | undefined;
  initPlayer(playerId: number): ProgressionStore;
  cleanupPlayer(playerId: number): void;
}

export function createProgressionService(
  config: ProgressionServiceConfig
): ProgressionServiceHandle {
  const logger = createLogger("ProgressionService");
  const playerProgression = new Map<number, ProgressionStore>();

  const handle: ProgressionServiceHandle = {
    Service: {
      name: "ProgressionService",

      onInit() {
        logger.info(
          `Progression config: maxLevel=${config.maxLevel}, curve=${config.xpCurve}, prestige=${config.prestigeEnabled ?? false}`
        );
        config.onPlayerRemoving?.((player) => {
          const store = playerProgression.get(player.UserId);
          if (store && store.isDirty()) {
            store.save();
          }
          playerProgression.delete(player.UserId);
        });
      },

      onStart() {
        logger.info("ProgressionService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        playerProgression.forEach((store, playerId) => {
          if (store.isDirty()) {
            store.save();
            logger.info(`Saved progression for player ${playerId}`);
          }
        });
        logger.info("ProgressionService stopped.");
      },
    },

    getProgressionStore(playerId: number) {
      return playerProgression.get(playerId);
    },

    initPlayer(playerId: number) {
      const store = new ProgressionStore(playerId, {
        datastoreName: config.datastoreName,
        maxLevel: config.maxLevel,
        xpCurve: config.xpCurve,
        baseXp: config.baseXp,
        growthFactor: config.growthFactor,
        prestigeEnabled: config.prestigeEnabled ?? false,
        prestigeMinLevel: config.prestigeMinLevel ?? config.maxLevel,
        maxPrestige: config.maxPrestige ?? 10,
        prestigeXpBonus: config.prestigeXpBonus ?? 0.1,
        enableLogging: true,
        ...config.storeOptions,
      });
      store.init();
      store.load();

      if (config.onLevelUp) {
        store.onLevelUp((event) => {
          config.onLevelUp!(playerId, event.newLevel);
        });
      }
      if (config.onPrestige) {
        store.onPrestige((event) => {
          config.onPrestige!(playerId, event.newPrestige);
        });
      }

      playerProgression.set(playerId, store);
      logger.info(`Progression loaded for player ${playerId}`);
      return store;
    },

    cleanupPlayer(playerId: number) {
      const store = playerProgression.get(playerId);
      if (store && store.isDirty()) {
        store.save();
      }
      playerProgression.delete(playerId);
    },
  };
  return handle;
}
