// ============================================================================
// Types
// ============================================================================

export interface Service {
  /**
   * Unique name for this service. Used for dependency resolution and logging.
   * If not provided, uses the object reference.
   */
  readonly name?: string;

  /**
   * Called during the initialization phase.
   * Services should not interact with other services here.
   * DO NOT YIELD here.
   */
  onInit?(): void;

  /**
   * Called during the start phase.
   * Services can now safely interact with other initialized services.
   */
  onStart?(): void;

  /**
   * Called during shutdown (game.BindToClose).
   * Use for cleanup, saving state, disconnecting listeners.
   */
  onDestroy?(): void;
}

export interface Controller {
  readonly name?: string;
  onInit?(): void;
  onStart?(): void;
  onDestroy?(): void;
}

export type ServiceOrController = Service | Controller;

export interface ServiceContainer {
  /**
   * Get a registered service/controller by reference.
   */
  get<T extends ServiceOrController>(item: T): T;

  /**
   * Check if a service/controller is registered.
   */
  has(item: ServiceOrController): boolean;

  /**
   * Get a service/controller by name.
   */
  getByName<T extends ServiceOrController>(name: string): T | undefined;
}

export type ApplicationState = "idle" | "initializing" | "running" | "shutting-down" | "stopped";

// ============================================================================
// Application
// ============================================================================

/**
 * Bootstrapper for Services (Server) and Controllers (Client).
 *
 * Lifecycle:
 * 1. Register services with register()
 * 2. Call boot() to initialize and start
 * 3. Call shutdown() on game close
 *
 * Features:
 * - Named service registration for dependency resolution
 * - Service container for retrieving registered services
 * - State tracking for debugging
 * - Error isolation (one service failure doesn't crash others)
 */
export class Application implements ServiceContainer {
  private items: ServiceOrController[] = [];
  private nameToItem = new Map<string, ServiceOrController>();
  private itemNames = new Map<ServiceOrController, string>();
  private _state: ApplicationState = "idle";

  /**
   * Get current application state.
   */
  getState(): ApplicationState {
    return this._state;
  }

  /**
   * Whether the application has been booted.
   */
  isBooted(): boolean {
    return this._state === "running" || this._state === "shutting-down";
  }

  /**
   * Number of registered services/controllers.
   */
  getSize(): number {
    return this.items.size();
  }

  /**
   * Register a service/controller.
   * Returns this for chaining.
   */
  register(item: ServiceOrController): this {
    if (this._state !== "idle") {
      warn(`[Application] Cannot register after boot. State: ${this._state}`);
      return this;
    }

    // Check for duplicate registration
    if (this.items.includes(item)) {
      warn("[Application] Item already registered, skipping duplicate");
      return this;
    }

    // Generate or use provided name
    const name = item.name ?? `Service_${this.items.size() + 1}`;

    // Check for name collision
    if (this.nameToItem.has(name)) {
      warn(`[Application] Name "${name}" already registered, using ${name}_${this.items.size()}`);
      const uniqueName = `${name}_${this.items.size()}`;
      this.nameToItem.set(uniqueName, item);
      this.itemNames.set(item, uniqueName);
    } else {
      this.nameToItem.set(name, item);
      this.itemNames.set(item, name);
    }

    this.items.push(item);
    return this;
  }

  /**
   * Register multiple services/controllers at once.
   */
  registerAll(...items: ServiceOrController[]): this {
    for (const item of items) {
      this.register(item);
    }
    return this;
  }

  /**
   * Boot the application.
   * Initializes all services, then starts them.
   */
  boot(): void {
    if (this._state !== "idle") {
      warn(`[Application] Already booted. State: ${this._state}`);
      return;
    }

    this._state = "initializing";

    // Phase 1: Init (synchronous, order-dependent based on registration)
    for (const item of this.items) {
      if (item.onInit !== undefined) {
        const itemName = this.itemNames.get(item) ?? "unknown";
        const [success, err] = pcall(() => item.onInit!());
        if (!success) {
          warn(`[Application] Failed to init "${itemName}": ${err}`);
        }
      }
    }

    this._state = "running";

    // Phase 2: Start (async, can interact with other services)
    for (const item of this.items) {
      if (item.onStart !== undefined) {
        const itemName = this.itemNames.get(item) ?? "unknown";
        task.spawn(() => {
          const [success, err] = pcall(() => item.onStart!());
          if (!success) {
            warn(`[Application] Failed to start "${itemName}": ${err}`);
          }
        });
      }
    }
  }

  /**
   * Shutdown all services/controllers in reverse order.
   * Call this from game.BindToClose on server.
   */
  shutdown(): void {
    if (this._state === "stopped" || this._state === "shutting-down") {
      return;
    }

    this._state = "shutting-down";

    // Destroy in reverse registration order
    for (let i = this.items.size() - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.onDestroy !== undefined) {
        const itemName = this.itemNames.get(item) ?? "unknown";
        const [success, err] = pcall(() => item.onDestroy!());
        if (!success) {
          warn(`[Application] Failed to destroy "${itemName}": ${err}`);
        }
      }
    }

    this._state = "stopped";
  }

  // ============================================================================
  // ServiceContainer Implementation
  // ============================================================================

  /**
   * Get a registered service/controller by reference.
   * Throws if not found.
   */
  get<T extends ServiceOrController>(item: T): T {
    if (!this.items.includes(item)) {
      error(`[Application] Item not registered`);
    }
    return item;
  }

  /**
   * Check if a service/controller is registered.
   */
  has(item: ServiceOrController): boolean {
    return this.items.includes(item);
  }

  /**
   * Get a service/controller by name.
   */
  getByName<T extends ServiceOrController>(name: string): T | undefined {
    return this.nameToItem.get(name) as T | undefined;
  }

  /**
   * Get the name of a registered item.
   */
  getItemName(item: ServiceOrController): string | undefined {
    return this.itemNames.get(item);
  }

  /**
   * Get all registered items.
   */
  getAll(): ServiceOrController[] {
    return [...this.items];
  }
}
