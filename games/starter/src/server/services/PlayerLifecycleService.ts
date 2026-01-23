import { Service, createLogger } from "@rbx/core";
import { Players } from "@rbxts/services";

const logger = createLogger("PlayerLifecycleService");

type PlayerCallback = (player: Player) => void;

// Module-level state (cleaner than object properties for roblox-ts)
const addedCallbacks: PlayerCallback[] = [];
const removingCallbacks: PlayerCallback[] = [];
const connections: RBXScriptConnection[] = [];

/**
 * Centralized service for player lifecycle events.
 * Other services subscribe here instead of connecting to Players events directly.
 * This ensures consistent cleanup and avoids duplicate event connections.
 */
export const PlayerLifecycleService: Service & {
  onPlayerAdded(callback: PlayerCallback): void;
  onPlayerRemoving(callback: PlayerCallback): void;
} = {
  onPlayerAdded(callback: PlayerCallback) {
    addedCallbacks.push(callback);
  },

  onPlayerRemoving(callback: PlayerCallback) {
    removingCallbacks.push(callback);
  },

  onInit() {
    logger.debug("Initializing player lifecycle listeners...");

    // Handle players joining
    const addedConnection = Players.PlayerAdded.Connect((player) => {
      logger.debug(`Player joined: ${player.Name}`);
      for (const callback of addedCallbacks) {
        const [success, err] = pcall(() => callback(player));
        if (!success) {
          logger.error(`PlayerAdded callback failed: ${err}`);
        }
      }
    });

    // Handle players leaving
    const removingConnection = Players.PlayerRemoving.Connect((player) => {
      logger.debug(`Player leaving: ${player.Name}`);
      for (const callback of removingCallbacks) {
        const [success, err] = pcall(() => callback(player));
        if (!success) {
          logger.error(`PlayerRemoving callback failed: ${err}`);
        }
      }
    });

    connections.push(addedConnection);
    connections.push(removingConnection);

    // Handle players already in the game (for late server script execution)
    for (const player of Players.GetPlayers()) {
      for (const callback of addedCallbacks) {
        const [success, err] = pcall(() => callback(player));
        if (!success) {
          logger.error(`PlayerAdded callback failed for existing player: ${err}`);
        }
      }
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
  },
};
