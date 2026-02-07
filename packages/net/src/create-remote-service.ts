/**
 * Factory for game-level RemoteService (server-side).
 *
 * Creates and manages the ServerRemoteRegistry with lifecycle integration.
 * Games call this from their server entry point.
 */

import { Service, createLogger } from "@rbx/core";
import { RemoteRegistry } from "./registry/types";
import { ServerRemoteRegistry } from "./registry/server";

export interface RemoteServiceConfig<TRegistry extends RemoteRegistry> {
  /** The remote definitions object. */
  registry: TRegistry;
  /** Folder name in ReplicatedStorage (default "Remotes"). */
  folderName?: string;
}

export interface RemoteServiceHandle<TRegistry extends RemoteRegistry> {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the server remote registry. */
  getRegistry(): ServerRemoteRegistry<TRegistry>;
}

export function createRemoteService<TRegistry extends RemoteRegistry>(
  config: RemoteServiceConfig<TRegistry>
): RemoteServiceHandle<TRegistry> {
  const logger = createLogger("RemoteService");
  const registry = new ServerRemoteRegistry<TRegistry>(config.registry, config.folderName);

  return {
    Service: {
      name: "RemoteService",

      onInit() {
        registry.initialize();
        logger.info("RemoteService initialized — remotes created.");
      },

      onStart() {
        logger.info("RemoteService started.");
      },

      onDestroy() {
        logger.info("RemoteService stopped.");
      },
    },

    getRegistry() {
      return registry;
    },
  };
}
