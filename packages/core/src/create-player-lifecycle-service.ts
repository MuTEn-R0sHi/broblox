/**
 * Player Lifecycle Service Factory
 *
 * Creates a Service that centralizes player join/leave events.
 * Other services subscribe via `onPlayerAdded` / `onPlayerRemoving`
 * instead of connecting to `Players` events directly.
 */

import { createLogger } from "./logger";
import type { Service } from "./application";

type PlayerCallback = (player: Player) => void;

export interface PlayerLifecycleConfig {
  /** Logger name (default "PlayerLifecycleService"). */
  loggerName?: string;

  /**
   * When to fire callbacks for players already in the game.
   * - `"onInit"` — fires during onInit (starter pattern)
   * - `"onStart"` — fires during onStart (obby pattern)
   * Defaults to `"onInit"`.
   */
  catchUpPhase?: "onInit" | "onStart";
}

export interface PlayerLifecycleHandle {
  /** The Service to register with Application.register(). */
  Service: Service & {
    onPlayerAdded(callback: PlayerCallback): void;
    onPlayerRemoving(callback: PlayerCallback): void;
    getPlayers(): Player[];
  };
}

/**
 * Create a player lifecycle service.
 *
 * @example
 * ```ts
 * const handle = createPlayerLifecycleService();
 * export const PlayerLifecycleService = handle.Service;
 * ```
 */
export function createPlayerLifecycleService(
  config?: PlayerLifecycleConfig
): PlayerLifecycleHandle {
  const Players = game.GetService("Players") as Players;
  const loggerName = config?.loggerName ?? "PlayerLifecycleService";
  const catchUpPhase = config?.catchUpPhase ?? "onInit";
  const logger = createLogger(loggerName);

  const addedCallbacks: PlayerCallback[] = [];
  const removingCallbacks: PlayerCallback[] = [];
  const connections: RBXScriptConnection[] = [];
  /** Tracks players that have already had their onPlayerAdded callbacks fired. */
  const processedPlayers = new Set<number>();

  function fireAddedForExisting(): void {
    for (const player of Players.GetPlayers()) {
      if (processedPlayers.has(player.UserId)) {
        logger.debug(`Skipping already-processed player: ${player.Name}`);
        continue;
      }
      processedPlayers.add(player.UserId);
      for (const callback of addedCallbacks) {
        const [success, err] = pcall(() => callback(player));
        if (!success) {
          logger.error(`PlayerAdded callback failed for existing player: ${err}`);
        }
      }
    }
  }

  const PlayerLifecycleService: PlayerLifecycleHandle["Service"] = {
    onPlayerAdded(callback: PlayerCallback) {
      addedCallbacks.push(callback);
    },

    onPlayerRemoving(callback: PlayerCallback) {
      removingCallbacks.push(callback);
    },

    getPlayers(): Player[] {
      return Players.GetPlayers();
    },

    onInit() {
      logger.debug("Initializing player lifecycle listeners...");

      const addedConnection = Players.PlayerAdded.Connect((player: Player) => {
        if (processedPlayers.has(player.UserId)) {
          logger.debug(`Skipping duplicate PlayerAdded for: ${player.Name}`);
          return;
        }
        processedPlayers.add(player.UserId);
        logger.debug(`Player joined: ${player.Name}`);
        for (const callback of addedCallbacks) {
          const [success, err] = pcall(() => callback(player));
          if (!success) {
            logger.error(`PlayerAdded callback failed: ${err}`);
          }
        }
      });

      const removingConnection = Players.PlayerRemoving.Connect((player: Player) => {
        logger.debug(`Player leaving: ${player.Name}`);
        processedPlayers.delete(player.UserId);
        for (const callback of removingCallbacks) {
          const [success, err] = pcall(() => callback(player));
          if (!success) {
            logger.error(`PlayerRemoving callback failed: ${err}`);
          }
        }
      });

      connections.push(addedConnection);
      connections.push(removingConnection);

      if (catchUpPhase === "onInit") {
        fireAddedForExisting();
      }
    },

    onStart() {
      if (catchUpPhase === "onStart") {
        fireAddedForExisting();
      }
    },

    onDestroy() {
      logger.debug("Cleaning up player lifecycle listeners...");
      for (const connection of connections) {
        connection.Disconnect();
      }
      connections.clear();
      addedCallbacks.clear();
      removingCallbacks.clear();
      processedPlayers.clear();
    },
  };

  return { Service: PlayerLifecycleService };
}
