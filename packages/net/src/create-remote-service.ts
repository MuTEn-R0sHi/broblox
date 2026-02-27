/**
 * Factory for game-level RemoteService (server-side).
 *
 * Creates and manages the ServerRemoteRegistry with lifecycle integration.
 * Games call this from their server entry point.
 */

import { Service, createLogger } from "@broblox/core";
import { RemoteRegistry } from "./registry/types";
import { ServerRemoteRegistry } from "./registry/server";

export interface RemoteServiceConfig<TRegistry extends RemoteRegistry> {
  /** The remote definitions object. */
  registry: TRegistry;
  /** Folder name in ReplicatedStorage (default "Remotes"). */
  folderName?: string;
  /** Called whenever a player is rate-limited. Wire to security/telemetry. */
  onRateLimited?: (player: Player, endpoint: string, retryAfterMs: number) => void;
  /**
   * Wires player-leave cleanup for rate limiter state.
   * Typically: `onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
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
  const registry = new ServerRemoteRegistry<TRegistry>(config.registry, {
    folderName: config.folderName,
    onRateLimited: config.onRateLimited,
  });

  return {
    Service: {
      name: "RemoteService",

      onInit() {
        registry.initialize();
        // Wire player-leave cleanup for rate limiter state
        config.onPlayerRemoving?.((player) => {
          registry.cleanupPlayer(player.UserId);
        });
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
