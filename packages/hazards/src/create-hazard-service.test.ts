/**
 * @broblox/hazards — createHazardService Tests
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@broblox/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

import { createHazardService } from "./create-hazard-service";
import type { HazardDefinition } from "./types";

const LAVA: HazardDefinition = {
  id: "lava_floor",
  displayName: "Lava Floor",
  behaviour: "instant_kill",
  damage: 0,
  tag: "HazardLava",
};

const SPIKE: HazardDefinition = {
  id: "spike_trap",
  displayName: "Spike Trap",
  behaviour: "contact_damage",
  damage: 15,
  cooldownDuration: 1.5,
  tag: "HazardSpike",
};

describe("createHazardService", () => {
  it("returns a valid service handle", () => {
    const handle = createHazardService({ definitions: [LAVA] });
    expect(handle.Service).toBeDefined();
    expect(handle.Service.name).toBe("HazardService");
    expect(typeof handle.getHazardRegistry).toBe("function");
    expect(typeof handle.getHazardManager).toBe("function");
    expect(typeof handle.initPlayer).toBe("function");
    expect(typeof handle.cleanupPlayer).toBe("function");
  });

  it("registry is available before init", () => {
    const handle = createHazardService({ definitions: [LAVA, SPIKE] });
    const reg = handle.getHazardRegistry();
    expect(reg.count()).toBe(2);
    expect(reg.get("lava_floor")).toBe(LAVA);
  });

  it("throws if getHazardManager called before init", () => {
    const handle = createHazardService({ definitions: [LAVA] });
    expect(() => handle.getHazardManager()).toThrow("not initialized");
  });

  it("manager available after onInit", () => {
    const handle = createHazardService({ definitions: [LAVA] });
    handle.Service.onInit!();
    const manager = handle.getHazardManager();
    expect(manager).toBeDefined();
    expect(manager.instanceCount()).toBe(0);
  });

  it("initPlayer and cleanupPlayer delegate to manager", () => {
    const handle = createHazardService({
      definitions: [LAVA],
      onDamage: vi.fn(() => false),
      onKill: vi.fn(),
    });
    handle.Service.onInit!();

    // Should not throw
    handle.initPlayer(42);
    handle.cleanupPlayer(42);
  });

  it("onStart wires onPlayerRemoving", () => {
    const onPlayerRemoving = vi.fn();
    const handle = createHazardService({
      definitions: [LAVA],
      onPlayerRemoving,
    });
    handle.Service.onInit!();
    handle.Service.onStart!();
    expect(onPlayerRemoving).toHaveBeenCalledWith(expect.any(Function));
  });

  it("onPlayerRemoving callback calls cleanupPlayer", () => {
    let removingCallback: ((player: { UserId: number }) => void) | undefined;
    const handle = createHazardService({
      definitions: [LAVA],
      onPlayerRemoving: (cb) => {
        removingCallback = cb;
      },
    });
    handle.Service.onInit!();
    handle.Service.onStart!();
    handle.initPlayer(42);

    // Simulate player leaving
    removingCallback!({ UserId: 42 });
    // Shouldn't throw — cleanup is idempotent
  });

  it("uses default no-op callbacks when not provided", () => {
    const handle = createHazardService({ definitions: [SPIKE] });
    handle.Service.onInit!();
    handle.initPlayer(1);

    const mgr = handle.getHazardManager();
    mgr.addInstance("spike_trap", "spike_1");

    // Should not throw with default no-op callbacks
    const result = mgr.processTouch(1, "spike_1", 0);
    expect(result).toBe(true);
  });
});
