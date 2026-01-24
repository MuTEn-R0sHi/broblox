/**
 * Tests for Application lifecycle management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================================
// Mock implementations that mirror the Roblox Application class
// ============================================================================

interface Service {
  readonly name?: string;
  onInit?(): void;
  onStart?(): void;
  onDestroy?(): void;
}

type ApplicationState = "idle" | "initializing" | "running" | "shutting-down" | "stopped";

class Application {
  private items: Service[] = [];
  private nameToItem = new Map<string, Service>();
  private itemNames = new Map<Service, string>();
  private _state: ApplicationState = "idle";

  getState(): ApplicationState {
    return this._state;
  }

  isBooted(): boolean {
    return this._state === "running" || this._state === "shutting-down";
  }

  getSize(): number {
    return this.items.length;
  }

  register(item: Service): this {
    if (this._state !== "idle") {
      console.warn(`[Application] Cannot register after boot. State: ${this._state}`);
      return this;
    }

    if (this.items.includes(item)) {
      console.warn("[Application] Item already registered, skipping duplicate");
      return this;
    }

    const name = item.name ?? `Service_${this.items.length + 1}`;

    if (this.nameToItem.has(name)) {
      console.warn(`[Application] Name "${name}" already registered`);
      const uniqueName = `${name}_${this.items.length}`;
      this.nameToItem.set(uniqueName, item);
      this.itemNames.set(item, uniqueName);
    } else {
      this.nameToItem.set(name, item);
      this.itemNames.set(item, name);
    }

    this.items.push(item);
    return this;
  }

  registerAll(...items: Service[]): this {
    for (const item of items) {
      this.register(item);
    }
    return this;
  }

  boot(): void {
    if (this._state !== "idle") {
      console.warn(`[Application] Already booted. State: ${this._state}`);
      return;
    }

    this._state = "initializing";

    // Phase 1: Init
    for (const item of this.items) {
      if (item.onInit) {
        try {
          item.onInit();
        } catch (e) {
          console.warn(`[Application] Failed to init: ${e}`);
        }
      }
    }

    this._state = "running";

    // Phase 2: Start
    for (const item of this.items) {
      if (item.onStart) {
        try {
          item.onStart();
        } catch (e) {
          console.warn(`[Application] Failed to start: ${e}`);
        }
      }
    }
  }

  shutdown(): void {
    if (this._state === "stopped" || this._state === "shutting-down") {
      return;
    }

    this._state = "shutting-down";

    // Destroy in reverse order
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.onDestroy) {
        try {
          item.onDestroy();
        } catch (e) {
          console.warn(`[Application] Failed to destroy: ${e}`);
        }
      }
    }

    this._state = "stopped";
  }

  get<T extends Service>(item: T): T {
    if (!this.items.includes(item)) {
      throw new Error("[Application] Item not registered");
    }
    return item;
  }

  has(item: Service): boolean {
    return this.items.includes(item);
  }

  getByName<T extends Service>(name: string): T | undefined {
    return this.nameToItem.get(name) as T | undefined;
  }

  getItemName(item: Service): string | undefined {
    return this.itemNames.get(item);
  }

  getAll(): Service[] {
    return [...this.items];
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("Application", () => {
  let app: Application;

  beforeEach(() => {
    app = new Application();
  });

  describe("initial state", () => {
    it("starts in idle state", () => {
      expect(app.getState()).toBe("idle");
    });

    it("is not booted initially", () => {
      expect(app.isBooted()).toBe(false);
    });

    it("has no services initially", () => {
      expect(app.getSize()).toBe(0);
    });
  });

  describe("register", () => {
    it("registers a service", () => {
      const service: Service = {};
      app.register(service);
      expect(app.getSize()).toBe(1);
      expect(app.has(service)).toBe(true);
    });

    it("allows chaining", () => {
      const s1: Service = {};
      const s2: Service = {};
      app.register(s1).register(s2);
      expect(app.getSize()).toBe(2);
    });

    it("prevents duplicate registration", () => {
      const service: Service = {};
      app.register(service);
      app.register(service);
      expect(app.getSize()).toBe(1);
    });

    it("auto-generates names for unnamed services", () => {
      const service: Service = {};
      app.register(service);
      expect(app.getItemName(service)).toBe("Service_1");
    });

    it("uses provided name", () => {
      const service: Service = { name: "MyService" };
      app.register(service);
      expect(app.getItemName(service)).toBe("MyService");
    });

    it("handles name collisions", () => {
      const s1: Service = { name: "SameName" };
      const s2: Service = { name: "SameName" };
      app.register(s1).register(s2);
      expect(app.getItemName(s1)).toBe("SameName");
      expect(app.getItemName(s2)).toBe("SameName_1");
    });
  });

  describe("registerAll", () => {
    it("registers multiple services", () => {
      const s1: Service = {};
      const s2: Service = {};
      const s3: Service = {};
      app.registerAll(s1, s2, s3);
      expect(app.getSize()).toBe(3);
    });
  });

  describe("boot", () => {
    it("calls onInit on all services", () => {
      const onInit = vi.fn();
      const service: Service = { onInit };
      app.register(service).boot();
      expect(onInit).toHaveBeenCalledOnce();
    });

    it("calls onStart after onInit", () => {
      const order: string[] = [];
      const service: Service = {
        onInit: () => order.push("init"),
        onStart: () => order.push("start"),
      };
      app.register(service).boot();
      expect(order).toEqual(["init", "start"]);
    });

    it("sets state to running after boot", () => {
      app.register({}).boot();
      expect(app.getState()).toBe("running");
      expect(app.isBooted()).toBe(true);
    });

    it("prevents double boot", () => {
      app.boot();
      const initialState = app.getState();
      app.boot();
      expect(app.getState()).toBe(initialState);
    });

    it("prevents registration after boot", () => {
      app.boot();
      app.register({});
      expect(app.getSize()).toBe(0);
    });

    it("initializes services in registration order", () => {
      const order: number[] = [];
      const s1: Service = { onInit: () => order.push(1) };
      const s2: Service = { onInit: () => order.push(2) };
      const s3: Service = { onInit: () => order.push(3) };
      app.registerAll(s1, s2, s3).boot();
      expect(order).toEqual([1, 2, 3]);
    });

    it("isolates errors - one service failure does not crash others", () => {
      const onInit1 = vi.fn();
      const onInit2 = vi.fn(() => {
        throw new Error("Service failed");
      });
      const onInit3 = vi.fn();

      const s1: Service = { onInit: onInit1 };
      const s2: Service = { onInit: onInit2 };
      const s3: Service = { onInit: onInit3 };

      app.registerAll(s1, s2, s3).boot();

      expect(onInit1).toHaveBeenCalled();
      expect(onInit2).toHaveBeenCalled();
      expect(onInit3).toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("calls onDestroy on all services", () => {
      const onDestroy = vi.fn();
      const service: Service = { onDestroy };
      app.register(service).boot();
      app.shutdown();
      expect(onDestroy).toHaveBeenCalledOnce();
    });

    it("destroys services in reverse registration order", () => {
      const order: number[] = [];
      const s1: Service = { onDestroy: () => order.push(1) };
      const s2: Service = { onDestroy: () => order.push(2) };
      const s3: Service = { onDestroy: () => order.push(3) };
      app.registerAll(s1, s2, s3).boot();
      app.shutdown();
      expect(order).toEqual([3, 2, 1]);
    });

    it("sets state to stopped", () => {
      app.boot();
      app.shutdown();
      expect(app.getState()).toBe("stopped");
    });

    it("prevents double shutdown", () => {
      const onDestroy = vi.fn();
      app.register({ onDestroy }).boot();
      app.shutdown();
      app.shutdown();
      expect(onDestroy).toHaveBeenCalledOnce();
    });

    it("isolates errors during shutdown", () => {
      const onDestroy1 = vi.fn();
      const onDestroy2 = vi.fn(() => {
        throw new Error("Destroy failed");
      });
      const onDestroy3 = vi.fn();

      const s1: Service = { onDestroy: onDestroy1 };
      const s2: Service = { onDestroy: onDestroy2 };
      const s3: Service = { onDestroy: onDestroy3 };

      app.registerAll(s1, s2, s3).boot();
      app.shutdown();

      // All should be called despite s2 throwing
      expect(onDestroy1).toHaveBeenCalled();
      expect(onDestroy2).toHaveBeenCalled();
      expect(onDestroy3).toHaveBeenCalled();
    });
  });

  describe("ServiceContainer", () => {
    it("get returns registered service", () => {
      const service: Service = {};
      app.register(service);
      expect(app.get(service)).toBe(service);
    });

    it("get throws for unregistered service", () => {
      const service: Service = {};
      expect(() => app.get(service)).toThrow();
    });

    it("has returns true for registered service", () => {
      const service: Service = {};
      app.register(service);
      expect(app.has(service)).toBe(true);
    });

    it("has returns false for unregistered service", () => {
      const service: Service = {};
      expect(app.has(service)).toBe(false);
    });

    it("getByName returns service by name", () => {
      const service: Service = { name: "TestService" };
      app.register(service);
      expect(app.getByName("TestService")).toBe(service);
    });

    it("getByName returns undefined for unknown name", () => {
      expect(app.getByName("Unknown")).toBeUndefined();
    });

    it("getAll returns copy of all services", () => {
      const s1: Service = {};
      const s2: Service = {};
      app.registerAll(s1, s2);
      const all = app.getAll();
      expect(all).toEqual([s1, s2]);
      // Verify it's a copy
      all.push({});
      expect(app.getSize()).toBe(2);
    });
  });

  describe("complete lifecycle", () => {
    it("executes full lifecycle correctly", () => {
      const lifecycle: string[] = [];

      const service: Service = {
        name: "LifecycleService",
        onInit: () => lifecycle.push("init"),
        onStart: () => lifecycle.push("start"),
        onDestroy: () => lifecycle.push("destroy"),
      };

      app.register(service);
      expect(app.getState()).toBe("idle");

      app.boot();
      expect(app.getState()).toBe("running");
      expect(lifecycle).toEqual(["init", "start"]);

      app.shutdown();
      expect(app.getState()).toBe("stopped");
      expect(lifecycle).toEqual(["init", "start", "destroy"]);
    });

    it("supports services with only some lifecycle methods", () => {
      const lifecycle: string[] = [];

      const s1: Service = { onInit: () => lifecycle.push("s1:init") };
      const s2: Service = { onStart: () => lifecycle.push("s2:start") };
      const s3: Service = { onDestroy: () => lifecycle.push("s3:destroy") };
      const s4: Service = {}; // No lifecycle methods

      app.registerAll(s1, s2, s3, s4).boot();
      expect(lifecycle).toEqual(["s1:init", "s2:start"]);

      app.shutdown();
      expect(lifecycle).toEqual(["s1:init", "s2:start", "s3:destroy"]);
    });
  });
});
