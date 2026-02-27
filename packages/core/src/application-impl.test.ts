/**
 * Tests for Application class — imports from source for real coverage.
 *
 * The existing application.test.ts mirrors the class locally.
 * This file imports the actual source module.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Application, type Service } from "./application";

describe("Application (source)", () => {
  let app: Application;

  beforeEach(() => {
    app = new Application();
  });

  // ==========================================================================
  // State
  // ==========================================================================

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

  // ==========================================================================
  // Register
  // ==========================================================================

  describe("register", () => {
    it("registers a service and increases size", () => {
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
      app.register(service).register(service);
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

    it("throws on name collisions", () => {
      const s1: Service = { name: "SameName" };
      const s2: Service = { name: "SameName" };
      app.register(s1);
      expect(() => app.register(s2)).toThrow('Service name "SameName" is already registered');
      expect(app.getSize()).toBe(1);
    });

    it("prevents registration after boot", () => {
      app.boot();
      app.register({});
      expect(app.getSize()).toBe(0);
    });
  });

  // ==========================================================================
  // RegisterAll
  // ==========================================================================

  describe("registerAll", () => {
    it("registers multiple services", () => {
      app.registerAll({}, {}, {});
      expect(app.getSize()).toBe(3);
    });
  });

  // ==========================================================================
  // Boot
  // ==========================================================================

  describe("boot", () => {
    it("calls onInit on all services", () => {
      const onInit = vi.fn();
      app.register({ onInit }).boot();
      expect(onInit).toHaveBeenCalledOnce();
    });

    it("calls onStart after onInit", () => {
      const order: string[] = [];
      app
        .register({
          onInit: () => order.push("init"),
          onStart: () => order.push("start"),
        })
        .boot();
      expect(order).toEqual(["init", "start"]);
    });

    it("sets state to running", () => {
      app.boot();
      expect(app.getState()).toBe("running");
      expect(app.isBooted()).toBe(true);
    });

    it("prevents double boot", () => {
      app.boot();
      app.boot(); // no-op
      expect(app.getState()).toBe("running");
    });

    it("isolates init errors — later services still init", () => {
      const fn1 = vi.fn();
      const fnFail = vi.fn(() => {
        throw new Error("boom");
      });
      const fn3 = vi.fn();

      app.registerAll({ onInit: fn1 }, { onInit: fnFail }, { onInit: fn3 }).boot();
      expect(fn1).toHaveBeenCalled();
      expect(fnFail).toHaveBeenCalled();
      expect(fn3).toHaveBeenCalled();
    });

    it("skips services without onInit/onStart", () => {
      // Should not throw
      app.register({}).boot();
      expect(app.getState()).toBe("running");
    });
  });

  // ==========================================================================
  // Shutdown
  // ==========================================================================

  describe("shutdown", () => {
    it("calls onDestroy on all services", () => {
      const onDestroy = vi.fn();
      app.register({ onDestroy }).boot();
      app.shutdown();
      expect(onDestroy).toHaveBeenCalledOnce();
    });

    it("destroys in reverse registration order", () => {
      const order: number[] = [];
      app
        .registerAll(
          { onDestroy: () => order.push(1) },
          { onDestroy: () => order.push(2) },
          { onDestroy: () => order.push(3) }
        )
        .boot();
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
      app.shutdown(); // no-op
      expect(onDestroy).toHaveBeenCalledOnce();
    });

    it("isolates destroy errors", () => {
      const fn1 = vi.fn();
      const fnFail = vi.fn(() => {
        throw new Error("destroy error");
      });
      const fn3 = vi.fn();

      app.registerAll({ onDestroy: fn1 }, { onDestroy: fnFail }, { onDestroy: fn3 }).boot();
      app.shutdown();

      expect(fn1).toHaveBeenCalled();
      expect(fnFail).toHaveBeenCalled();
      expect(fn3).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ServiceContainer
  // ==========================================================================

  describe("ServiceContainer", () => {
    it("get returns the registered item", () => {
      const service: Service = {};
      app.register(service);
      expect(app.get(service)).toBe(service);
    });

    it("get throws for unregistered item", () => {
      expect(() => app.get({})).toThrow();
    });

    it("has returns true/false correctly", () => {
      const s: Service = {};
      expect(app.has(s)).toBe(false);
      app.register(s);
      expect(app.has(s)).toBe(true);
    });

    it("getByName returns service or undefined", () => {
      const s: Service = { name: "Finder" };
      app.register(s);
      expect(app.getByName("Finder")).toBe(s);
      expect(app.getByName("Nope")).toBeUndefined();
    });

    it("getAll returns a copy of items", () => {
      const s1: Service = {};
      const s2: Service = {};
      app.registerAll(s1, s2);
      const all = app.getAll();
      expect(all).toEqual([s1, s2]);
      all.push({});
      expect(app.getSize()).toBe(2); // original unchanged
    });
  });

  // ==========================================================================
  // Full lifecycle
  // ==========================================================================

  describe("complete lifecycle", () => {
    it("init → start → destroy in correct order", () => {
      const steps: string[] = [];
      app
        .register({
          name: "LC",
          onInit: () => steps.push("init"),
          onStart: () => steps.push("start"),
          onDestroy: () => steps.push("destroy"),
        })
        .boot();
      app.shutdown();
      expect(steps).toEqual(["init", "start", "destroy"]);
    });
  });
});
