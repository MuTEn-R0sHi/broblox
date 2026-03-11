/**
 * @broblox/obstacles — createObstacleService Tests
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

import { createObstacleService } from "./create-obstacle-service";
import type { ObstacleDefinition } from "./types";

const SLOW_PLATFORM: ObstacleDefinition = {
  id: "slow_platform",
  displayName: "Slow Platform",
  behaviour: "moving_platform",
  speed: 10,
  distance: 20,
  tag: "ObstacleSlowPlatform",
};

const BLINK_PLATFORM: ObstacleDefinition = {
  id: "blink_platform",
  displayName: "Blink Platform",
  behaviour: "timed_sequence",
  activeDuration: 2,
  cooldownDuration: 3,
  tag: "ObstacleBlink",
};

describe("createObstacleService", () => {
  it("returns a valid service handle", () => {
    const handle = createObstacleService({ definitions: [SLOW_PLATFORM] });
    expect(handle.Service).toBeDefined();
    expect(handle.Service.name).toBe("ObstacleService");
    expect(typeof handle.getObstacleRegistry).toBe("function");
    expect(typeof handle.getObstacleManager).toBe("function");
  });

  it("registry is available before init", () => {
    const handle = createObstacleService({
      definitions: [SLOW_PLATFORM, BLINK_PLATFORM],
    });
    const reg = handle.getObstacleRegistry();
    expect(reg.count()).toBe(2);
    expect(reg.get("slow_platform")).toBe(SLOW_PLATFORM);
  });

  it("throws if getObstacleManager called before init", () => {
    const handle = createObstacleService({ definitions: [SLOW_PLATFORM] });
    expect(() => handle.getObstacleManager()).toThrow("not initialized");
  });

  it("manager available after onInit", () => {
    const handle = createObstacleService({ definitions: [SLOW_PLATFORM] });
    handle.Service.onInit!();
    const manager = handle.getObstacleManager();
    expect(manager).toBeDefined();
    expect(manager.instanceCount()).toBe(0);
  });

  it("forwards onUpdate callback to manager", () => {
    const onUpdate = vi.fn();
    const handle = createObstacleService({
      definitions: [SLOW_PLATFORM],
      onUpdate,
    });
    handle.Service.onInit!();
    const manager = handle.getObstacleManager();
    manager.addInstance("slow_platform", "p1");
    manager.update(0.5);
    expect(onUpdate).toHaveBeenCalledWith("p1", expect.any(Number), true);
  });

  it("forwards onToggle callback to manager", () => {
    const onToggle = vi.fn();
    const handle = createObstacleService({
      definitions: [BLINK_PLATFORM],
      onToggle,
    });
    handle.Service.onInit!();
    const manager = handle.getObstacleManager();
    manager.addInstance("blink_platform", "b1");
    // activeDuration=2, so this should toggle
    manager.update(2.0);
    expect(onToggle).toHaveBeenCalledWith("b1", false);
  });

  it("uses default no-op callbacks when not provided", () => {
    const handle = createObstacleService({ definitions: [SLOW_PLATFORM] });
    handle.Service.onInit!();
    const manager = handle.getObstacleManager();
    manager.addInstance("slow_platform", "p1");
    // Should not throw with default no-op callbacks
    manager.update(1.0);
  });
});
