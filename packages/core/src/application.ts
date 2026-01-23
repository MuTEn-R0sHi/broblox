export interface Service {
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
  onInit?(): void;
  onStart?(): void;
  onDestroy?(): void;
}

/**
 * Bootstrapper for Services (Server) and Controllers (Client)
 */
export class Application {
  private items: (Service | Controller)[] = [];
  private booted = false;

  register(item: Service | Controller): this {
    this.items.push(item);
    return this;
  }

  boot(): void {
    if (this.booted) {
      warn("Application already booted");
      return;
    }
    this.booted = true;

    // Phase 1: Init (synchronous, order-independent)
    for (const item of this.items) {
      if (item.onInit !== undefined) {
        const [success, err] = pcall(() => item.onInit!());
        if (!success) {
          warn(`Failed to init Service/Controller: ${err}`);
        }
      }
    }

    // Phase 2: Start (async, can interact with other services)
    for (const item of this.items) {
      if (item.onStart !== undefined) {
        task.spawn(() => {
          const [success, err] = pcall(() => item.onStart!());
          if (!success) {
            warn(`Failed to start Service/Controller: ${err}`);
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
    // Destroy in reverse registration order
    for (let i = this.items.size() - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.onDestroy !== undefined) {
        const [success, err] = pcall(() => item.onDestroy!());
        if (!success) {
          warn(`Failed to destroy Service/Controller: ${err}`);
        }
      }
    }
  }
}
