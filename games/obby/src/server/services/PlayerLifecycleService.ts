/**
 * Player Lifecycle Service
 * Handles player join/leave events.
 */

import { Service, createLogger } from "@rbx/core";
import { Players } from "@rbxts/services";

const logger = createLogger("PlayerLifecycle");

type PlayerCallback = (player: Player) => void;

// Module-level state
const addedCallbacks: PlayerCallback[] = [];
const removingCallbacks: PlayerCallback[] = [];
const connections: RBXScriptConnection[] = [];

export const PlayerLifecycleService: Service & {
  onPlayerAdded(callback: PlayerCallback): void;
  onPlayerRemoving(callback: PlayerCallback): void;
  getPlayers(): Player[];
} = {
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

    const addedConnection = Players.PlayerAdded.Connect((player) => {
      logger.debug(`Player joined: ${player.Name}`);
      for (const callback of addedCallbacks) {
        const [success, err] = pcall(() => callback(player));
        if (!success) {
          logger.error(`PlayerAdded callback failed: ${err}`);
        }
      }
    });

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
  },

  onStart() {
    // Handle players already in the game
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
    logger.debug("Cleaning up...");
    for (const connection of connections) {
      connection.Disconnect();
    }
    connections.clear();
    addedCallbacks.clear();
    removingCallbacks.clear();
  },
};
