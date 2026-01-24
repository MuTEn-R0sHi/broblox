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

// Declare Roblox services at runtime
declare const game: {
  GetService(name: "ReplicatedStorage"): {
    FindFirstChild(name: string): Instance | undefined;
  };
};

/**
 * Internal rate limit state per player
 */
interface RateLimitState {
  tokens: number;
  lastRefill: number;
}

// ============================================================================
// Server Registry Class
// ============================================================================

/**
 * Server-side registry that creates and manages remotes.
 */
export class ServerRemoteRegistry<TRegistry extends RemoteRegistry> {
  private folder: Folder;
  private instances = new Map<string, RemoteFunction | RemoteEvent>();
  private rateLimitStates = new Map<string, Map<number, RateLimitState>>();

  constructor(
    private registry: TRegistry,
    folderName = "Remotes"
  ) {
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
        const result = this.checkPlayerRateLimit(key as string, player, def.rateLimit);
        if (!result.allowed) {
          return err(ErrorCode.RateLimited, {
            retryAfterMs: result.retryAfterMs,
          });
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
        const result = this.checkPlayerRateLimit(key as string, player, def.rateLimit);
        if (!result.allowed) {
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

  private checkPlayerRateLimit(
    key: string,
    player: Player,
    config: RateLimitConfig
  ): { allowed: boolean; retryAfterMs?: number } {
    // Get or create rate limit state map for this remote
    let stateMap = this.rateLimitStates.get(key);
    if (!stateMap) {
      stateMap = new Map();
      this.rateLimitStates.set(key, stateMap);
    }

    // Get or create state for this player
    let state = stateMap.get(player.UserId);
    const now = os.clock();
    if (!state) {
      state = { tokens: config.maxRequests, lastRefill: now };
      stateMap.set(player.UserId, state);
    }

    // Token bucket refill
    const windowSec = config.windowMs / 1000;
    const elapsed = now - state.lastRefill;
    const refillRate = config.maxRequests / windowSec;
    const tokensToAdd = elapsed * refillRate;
    state.tokens = math.min(config.maxRequests, state.tokens + tokensToAdd);
    state.lastRefill = now;

    // Check if allowed
    if (state.tokens >= 1) {
      state.tokens -= 1;
      return { allowed: true };
    }

    // Not allowed - calculate retry time
    const tokensNeeded = 1 - state.tokens;
    const retryAfterSec = tokensNeeded / refillRate;
    return { allowed: false, retryAfterMs: retryAfterSec * 1000 };
  }
}

/**
 * Creates a new server remote registry.
 */
export function createServerRegistry<T extends RemoteRegistry>(
  registry: T,
  folderName?: string
): ServerRemoteRegistry<T> {
  return new ServerRemoteRegistry(registry, folderName);
}
