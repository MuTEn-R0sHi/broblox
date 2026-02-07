/**
 * Remote Service
 *
 * Creates and manages all remotes using the type-safe registry.
 * Other services access remotes through this service.
 */

import { Service, createLogger } from "@rbx/core";
import { createServerRegistry, ServerRemoteRegistry } from "@rbx/net";
import { ObbyRemotes, ObbyRemotesType } from "shared/remotes";

const logger = createLogger("RemoteService");

// Registry instance — initialized in onInit
let registry: ServerRemoteRegistry<ObbyRemotesType>;

export const RemoteService: Service & {
  /** Access the remote registry for handlers */
  getRegistry(): ServerRemoteRegistry<ObbyRemotesType>;
} = {
  getRegistry() {
    if (!registry) {
      error("RemoteService not initialized");
    }
    return registry;
  },

  onInit() {
    logger.debug("Initializing remotes...");
    registry = createServerRegistry(ObbyRemotes, "ObbyRemotes");
    registry.initialize();
    logger.debug("Remotes initialized");
  },
};
