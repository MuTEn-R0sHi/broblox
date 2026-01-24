/**
 * Remote Controller
 *
 * Connects to server remotes using the type-safe registry.
 * Other controllers access remotes through this controller.
 */

import { Controller, createLogger } from "@rbx/core";
import { createClientRegistry, ClientRemoteRegistry } from "@rbx/net";
import { GameRemotes, GameRemotesType } from "shared/remotes";

const logger = createLogger("RemoteController");

// Registry instance - initialized in onInit
let registry: ClientRemoteRegistry<GameRemotesType>;

export const RemoteController: Controller & {
  /** Access the remote registry for invocations */
  getRegistry(): ClientRemoteRegistry<GameRemotesType>;
} = {
  getRegistry() {
    if (!registry) {
      error("RemoteController not initialized");
    }
    return registry;
  },

  onInit() {
    logger.debug("Connecting to remotes...");
    registry = createClientRegistry(GameRemotes);
    registry.initialize();
    logger.debug("Remotes connected");
  },

  onDestroy() {
    if (registry) {
      registry.destroy();
    }
  },
};
