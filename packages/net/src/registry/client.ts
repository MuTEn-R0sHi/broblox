/**
 * Client-side Remote Registry
 *
 * Waits for and connects to RemoteFunction/RemoteEvent instances.
 * Provides type-safe invocation.
 */

import { REMOTES_WAIT_TIMEOUT_SECONDS } from "@rbx/constants";
import {
  RemoteDefinition,
  RemoteRegistry,
  InferRequest,
  InferResponse,
  ClientEventHandler,
} from "./types";

// Use Roblox services at runtime
declare const game: {
  GetService(name: "ReplicatedStorage"): {
    WaitForChild(name: string, timeout?: number): Instance | undefined;
    FindFirstChild(name: string): Instance | undefined;
  };
};

/**
 * Client-side registry that connects to server-created remotes.
 */
export class ClientRemoteRegistry<TRegistry extends RemoteRegistry> {
  private folder?: Folder;
  private instances = new Map<string, RemoteFunction | RemoteEvent>();
  private connections = new Map<string, RBXScriptConnection>();

  constructor(
    private registry: TRegistry,
    private folderName = "Remotes"
  ) {}

  /**
   * Wait for and connect to all remotes from the registry.
   * Call this in your RemoteController.onInit().
   */
  initialize(): void {
    const ReplicatedStorage = game.GetService("ReplicatedStorage");
    const folder = ReplicatedStorage.WaitForChild(this.folderName, REMOTES_WAIT_TIMEOUT_SECONDS) as
      | Folder
      | undefined;

    if (!folder) {
      error(
        `[ClientRemoteRegistry] Remotes folder '${this.folderName}' not found after ${REMOTES_WAIT_TIMEOUT_SECONDS}s`
      );
    }

    this.folder = folder;

    // Use pairs to iterate (compiles to Lua pairs())
    for (const [key, def] of pairs(this.registry as unknown as Map<string, RemoteDefinition>)) {
      this.connectRemote(key as string, def);
    }
  }

  /**
   * Clean up all connections.
   */
  destroy(): void {
    this.connections.forEach((connection) => connection.Disconnect());
    this.connections.clear();
    this.instances.clear();
  }

  /**
   * Invoke a client-to-server RemoteFunction.
   */
  invoke<K extends keyof TRegistry>(
    key: K,
    request: InferRequest<TRegistry[K]>
  ): InferResponse<TRegistry[K]> {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "function") {
      error(`Remote '${key as string}' is not a function`);
    }
    if (def.direction !== "client-to-server") {
      error(`Remote '${key as string}' is not client-to-server`);
    }

    const remote = this.getRemote(key) as RemoteFunction;
    return remote.InvokeServer(request) as InferResponse<TRegistry[K]>;
  }

  /**
   * Fire a client-to-server RemoteEvent.
   */
  fire<K extends keyof TRegistry>(key: K, request: InferRequest<TRegistry[K]>): void {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "event") {
      error(`Remote '${key as string}' is not an event`);
    }
    if (def.direction !== "client-to-server") {
      error(`Remote '${key as string}' is not client-to-server`);
    }

    const remote = this.getRemote(key) as RemoteEvent;
    remote.FireServer(request);
  }

  /**
   * Listen for a server-to-client RemoteEvent.
   */
  onEvent<K extends keyof TRegistry>(
    key: K,
    handler: ClientEventHandler<InferRequest<TRegistry[K]>>
  ): RBXScriptConnection {
    const def = this.registry[key] as RemoteDefinition;
    if (def.type !== "event") {
      error(`Remote '${key as string}' is not an event`);
    }
    if (def.direction !== "server-to-client") {
      error(`Remote '${key as string}' is not server-to-client`);
    }

    const remote = this.getRemote(key) as RemoteEvent;
    const connection = remote.OnClientEvent.Connect((...args: unknown[]) => {
      handler(args[0] as InferRequest<TRegistry[K]>);
    });

    // Track connection for cleanup
    const existing = this.connections.get(key as string);
    if (existing) {
      existing.Disconnect();
    }
    this.connections.set(key as string, connection);

    return connection;
  }

  private getRemote<K extends keyof TRegistry>(key: K): RemoteFunction | RemoteEvent {
    const instance = this.instances.get(key as string);
    if (!instance) {
      error(`Remote '${key as string}' not found. Did you call initialize()?`);
    }
    return instance;
  }

  private connectRemote(key: string, def: RemoteDefinition): void {
    if (!this.folder) {
      error("[ClientRemoteRegistry] Not initialized");
    }

    const instance = this.folder.WaitForChild(def.name, REMOTES_WAIT_TIMEOUT_SECONDS);
    if (!instance) {
      error(
        `[ClientRemoteRegistry] Remote '${def.name}' not found after ${REMOTES_WAIT_TIMEOUT_SECONDS}s`
      );
    }

    this.instances.set(key, instance as RemoteFunction | RemoteEvent);
  }
}

/**
 * Creates a new client remote registry.
 */
export function createClientRegistry<T extends RemoteRegistry>(
  registry: T,
  folderName?: string
): ClientRemoteRegistry<T> {
  return new ClientRemoteRegistry(registry, folderName);
}
