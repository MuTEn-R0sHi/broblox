export interface Service {
  /**
   * Called during the initialization phase.
   * Services should not interact with other services here.
   */
  onInit?(): void;

  /**
   * Called during the start phase.
   * Services can now safely interact with other initialized services.
   */
  onStart?(): void;
}

export interface Controller {
  onInit?(): void;
  onStart?(): void;
}

/**
 * Bootstrapper for Services (Server) and Controllers (Client)
 */
export class Application {
  private items: (Service | Controller)[] = [];

  register(item: Service | Controller): this {
    this.items.push(item);
    return this;
  }

  boot(): void {
    // Phase 1: Init
    for (const item of this.items) {
      if (item.onInit !== undefined) {
        const [success, err] = pcall(() => item.onInit!());
        if (!success) {
          warn(`Failed to init Service/Controller: ${err}`);
        }
      }
    }

    // Phase 2: Start
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
}
