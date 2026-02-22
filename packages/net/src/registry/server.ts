/**
 * Server-side Remote Registry
 *
 * Creates and manages RemoteFunction/RemoteEvent instances on the server.
 * Provides type-safe handlers with automatic validation and rate limiting.
 */

import { err, ErrorCode } from "@rbx/shared-types";
import {
  RemoteDefinition,
  RemoteRegistry,
  InferRequest,
  InferResponse,
  ServerFunctionHandler,
  ServerEventHandler,
  RateLimitConfig,
} from "./types";
import { RateLimiter } from "../ratelimit";

// Declare Roblox services at runtime
declare const game: {
  GetService(name: "ReplicatedStorage"): {
    FindFirstChild(name: string): Instance | undefined;
  };
};

// ============================================================================
// Server Registry Class
// ============================================================================

/**
 * Server-side registry that creates and manages remotes.
 */
export class ServerRemoteRegistry<TRegistry extends RemoteRegistry> {
  private folder: Folder;
  private instances = new Map<string, RemoteFunction | RemoteEvent>();
  private rateLimiters = new Map<string, RateLimiter>();
  private onRateLimitedCallback?: (player: Player, endpoint: string, retryAfterMs: number) => void;

  constructor(
    private registry: TRegistry,
    options?: {
      /** Folder name in ReplicatedStorage (default: "Remotes"). */
      folderName?: string;
      /** Called whenever a player is rate-limited on an endpoint. Wire to security/telemetry. */
      onRateLimited?: (player: Player, endpoint: string, retryAfterMs: number) => void;
    }
  ) {
    this.onRateLimitedCallback = options?.onRateLimited;
    const folderName = options?.folderName ?? "Remotes";
    // Create or find the remotes folder
    const ReplicatedStorage = game.GetService("ReplicatedStorage");
    let folder = ReplicatedStorage.FindFirstChild(folderName) as Folder | undefined;
    if (!folder) {
      folder = new Instance("Folder");
      folder.Name = folderName;
      folder.Parent = ReplicatedStorage as unknown as Instance;
    }
    this.folder = folder;
  }

  /**
   * Initialize all remotes from the registry.
   * Call this in your RemoteService.onInit().
   */
  initialize(): void {
    // Use pairs to iterate (compiles to Lua pairs())
    for (const [key, def] of pairs(this.registry as unknown as Map<string, RemoteDefinition>)) {
      this.createRemote(key as string, def);

      // Create per-endpoint rate limiter once (token bucket).
      if (def.rateLimit) {
        this.getOrCreateRateLimiter(key as string, def.rateLimit);
      }
    }
  }

  /**
   * Get a remote instance by key.
   */
  getRemote<K extends keyof TRegistry>(
    key: K
  ): TRegistry[K]["type"] extends "function" ? RemoteFunction : RemoteEvent {
    const instance = this.instances.get(key as string);
    if (!instance) {
      error(`Remote '${key as string}' not found. Did you call initialize()?`);
    }
    return instance as TRegistry[K]["type"] extends "function" ? RemoteFunction : RemoteEvent;
  }

  /**
   * Register a handler for a client-to-server RemoteFunction.
   * Automatically applies validation and rate limiting.
   */
  onFunction<K extends keyof TRegistry>(
    key: K,
    handler: ServerFunctionHandler<InferRequest<TRegistry[K]>, InferResponse<TRegistry[K]>>
  ): void {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "function") {
      error(`Remote '${key as string}' is not a function`);
    }
    if (def.direction !== "client-to-server") {
      error(`Remote '${key as string}' is not client-to-server`);
    }

    const remote = this.getRemote(key) as RemoteFunction;
    remote.OnServerInvoke = (player: Player, ...args: unknown[]) => {
      // Rate limiting
      if (def.rateLimit) {
        const limiter = this.getOrCreateRateLimiter(key as string, def.rateLimit);
        const rl = limiter.check(player.UserId);
        if (!rl.ok) {
          const retryMs = rl.retryAfterMs ?? 0;
          this.onRateLimitedCallback?.(player, key as string, retryMs);
          return err(ErrorCode.RateLimited, { retryAfterMs: retryMs });
        }
      }

      // Validation
      const request = args[0];
      if (def.validate && !def.validate(request)) {
        return err(ErrorCode.InvalidPayload);
      }

      // Call handler
      try {
        const response = handler(player, request as InferRequest<TRegistry[K]>);
        return response;
      } catch (e) {
        warn(`[RemoteRegistry] Error in handler for '${key as string}':`, e);
        return err(ErrorCode.InternalError);
      }
    };
  }

  /**
   * Register a handler for a client-to-server RemoteEvent.
   * Automatically applies validation and rate limiting.
   */
  onEvent<K extends keyof TRegistry>(
    key: K,
    handler: ServerEventHandler<InferRequest<TRegistry[K]>>
  ): void {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "event") {
      error(`Remote '${key as string}' is not an event`);
    }
    if (def.direction !== "client-to-server") {
      error(`Remote '${key as string}' is not client-to-server`);
    }

    const remote = this.getRemote(key) as RemoteEvent;
    remote.OnServerEvent.Connect((player: Player, ...args: unknown[]) => {
      // Rate limiting
      if (def.rateLimit) {
        const limiter = this.getOrCreateRateLimiter(key as string, def.rateLimit);
        const rl = limiter.check(player.UserId);
        if (!rl.ok) {
          this.onRateLimitedCallback?.(player, key as string, rl.retryAfterMs ?? 0);
          return; // Silently drop rate-limited events
        }
      }

      // Validation
      const request = args[0];
      if (def.validate && !def.validate(request)) {
        warn(`[RemoteRegistry] Invalid payload from ${player.Name} on '${key as string}'`);
        return;
      }

      // Call handler
      try {
        handler(player, request as InferRequest<TRegistry[K]>);
      } catch (e) {
        warn(`[RemoteRegistry] Error in handler for '${key as string}':`, e);
      }
    });
  }

  /**
   * Fire a server-to-client event to a specific player.
   */
  fireClient<K extends keyof TRegistry>(
    key: K,
    player: Player,
    data: InferRequest<TRegistry[K]>
  ): void {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "event") {
      error(`Remote '${key as string}' is not an event`);
    }
    if (def.direction !== "server-to-client") {
      error(`Remote '${key as string}' is not server-to-client`);
    }

    const remote = this.getRemote(key) as RemoteEvent;
    remote.FireClient(player, data);
  }

  /**
   * Fire a server-to-client event to all players.
   */
  fireAllClients<K extends keyof TRegistry>(key: K, data: InferRequest<TRegistry[K]>): void {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "event") {
      error(`Remote '${key as string}' is not an event`);
    }
    if (def.direction !== "server-to-client") {
      error(`Remote '${key as string}' is not server-to-client`);
    }

    const remote = this.getRemote(key) as RemoteEvent;
    remote.FireAllClients(data);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createRemote(key: string, def: RemoteDefinition): void {
    const existing = this.folder.FindFirstChild(def.name);
    if (existing) {
      this.instances.set(key, existing as RemoteFunction | RemoteEvent);
      return;
    }

    let instance: RemoteFunction | RemoteEvent;
    if (def.type === "function") {
      instance = new Instance("RemoteFunction");
    } else {
      instance = new Instance("RemoteEvent");
    }
    instance.Name = def.name;
    instance.Parent = this.folder;
    this.instances.set(key, instance);
  }

  private getOrCreateRateLimiter(key: string, config: RateLimitConfig): RateLimiter {
    const existing = this.rateLimiters.get(key);
    if (existing) return existing;

    const limiter = new RateLimiter(config);
    this.rateLimiters.set(key, limiter);
    return limiter;
  }
}

/**
 * Creates a new server remote registry.
 */
export function createServerRegistry<T extends RemoteRegistry>(
  registry: T,
  options?: {
    /** Folder name in ReplicatedStorage (default: "Remotes"). */
    folderName?: string;
    /** Called whenever a player is rate-limited on an endpoint. Wire to security/telemetry. */
    onRateLimited?: (player: Player, endpoint: string, retryAfterMs: number) => void;
  }
): ServerRemoteRegistry<T> {
  return new ServerRemoteRegistry(registry, options);
}
