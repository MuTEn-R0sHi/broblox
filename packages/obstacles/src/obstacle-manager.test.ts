/**
 * @broblox/obstacles — Obstacle Manager Tests
 */

import { describe, it, expect, vi } from "vitest";
import { createObstacleRegistry } from "./obstacle-registry";
import { createObstacleManager } from "./obstacle-manager";
import type { ObstacleDefinition } from "./types";

// ── Test Definitions ───────────────────────────────────────────────────

const SLOW_PLATFORM: ObstacleDefinition = {
  id: "slow_platform",
  displayName: "Slow Platform",
  behaviour: "moving_platform",
  speed: 10, // 10 studs/sec
  distance: 20, // 20 studs total travel
  tag: "ObstacleSlowPlatform",
};

const FAST_SPINNER: ObstacleDefinition = {
  id: "fast_spinner",
  displayName: "Fast Spinner",
  behaviour: "rotating_beam",
  speed: 360, // full rotation per second
  tag: "ObstacleFastSpinner",
};

const BLINK_PLATFORM: ObstacleDefinition = {
  id: "blink_platform",
  displayName: "Blink Platform",
  behaviour: "timed_sequence",
  activeDuration: 2,
  cooldownDuration: 3,
  tag: "ObstacleBlink",
};

const PHASED_BLINK: ObstacleDefinition = {
  id: "phased_blink",
  displayName: "Phased Blink",
  behaviour: "timed_sequence",
  activeDuration: 2,
  cooldownDuration: 2,
  phaseOffset: 0.5, // starts halfway through cycle
  tag: "ObstaclePhasedBlink",
};

const CONVEYOR: ObstacleDefinition = {
  id: "conveyor_belt",
  displayName: "Conveyor Belt",
  behaviour: "conveyor",
  speed: 15,
  tag: "ObstacleConveyor",
};

function makeCallbacks() {
  return {
    onUpdate: vi.fn(),
    onToggle: vi.fn(),
  };
}

function makeManager(defs: ObstacleDefinition[] = [SLOW_PLATFORM, FAST_SPINNER, BLINK_PLATFORM]) {
  const registry = createObstacleRegistry(defs);
  const callbacks = makeCallbacks();
  const manager = createObstacleManager(registry, callbacks);
  return { manager, callbacks };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("ObstacleManager", () => {
  describe("instance management", () => {
    it("addInstance returns true for new instances", () => {
      const { manager } = makeManager();
      expect(manager.addInstance("slow_platform", "platform_1")).toBe(true);
      expect(manager.instanceCount()).toBe(1);
    });

    it("addInstance returns false for duplicate keys", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "platform_1");
      expect(manager.addInstance("slow_platform", "platform_1")).toBe(false);
    });

    it("addInstance returns false for unknown definition", () => {
      const { manager } = makeManager();
      expect(manager.addInstance("nonexistent", "platform_1")).toBe(false);
    });

    it("removeInstance returns true and decrements count", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "platform_1");
      expect(manager.removeInstance("platform_1")).toBe(true);
      expect(manager.instanceCount()).toBe(0);
    });

    it("removeInstance returns false for unknown key", () => {
      const { manager } = makeManager();
      expect(manager.removeInstance("nonexistent")).toBe(false);
    });

    it("getInstanceState returns state for existing instance", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "platform_1");
      const state = manager.getInstanceState("platform_1");
      expect(state).toBeDefined();
      expect(state!.definitionId).toBe("slow_platform");
      expect(state!.progress).toBe(0);
      expect(state!.direction).toBe(1);
      expect(state!.active).toBe(true);
    });

    it("getInstanceState returns undefined for unknown key", () => {
      const { manager } = makeManager();
      expect(manager.getInstanceState("nonexistent")).toBeUndefined();
    });
  });

  describe("moving_platform", () => {
    it("advances progress forward based on speed and distance", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "p1");

      // speed=10, distance=20 → rate = 0.5/sec → 1 sec = 0.5 progress
      manager.update(1.0);
      const state = manager.getInstanceState("p1")!;
      expect(state.progress).toBeCloseTo(0.5);
      expect(state.direction).toBe(1);
    });

    it("ping-pongs at boundaries", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "p1");

      // After 2s: reaches end (progress=1), reverses
      manager.update(2.0);
      const state = manager.getInstanceState("p1")!;
      expect(state.progress).toBe(1);
      expect(state.direction).toBe(-1);

      // After another 1s: moves back to 0.5
      manager.update(1.0);
      expect(state.progress).toBeCloseTo(0.5);
      expect(state.direction).toBe(-1);
    });

    it("reverses again at origin", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "p1");

      // Forward 2s (→ end), back 2s (→ origin)
      manager.update(2.0);
      manager.update(2.0);
      const state = manager.getInstanceState("p1")!;
      expect(state.progress).toBe(0);
      expect(state.direction).toBe(1);
    });

    it("calls onUpdate each frame", () => {
      const { manager, callbacks } = makeManager();
      manager.addInstance("slow_platform", "p1");
      manager.update(0.5);
      expect(callbacks.onUpdate).toHaveBeenCalledWith("p1", expect.any(Number), true);
    });
  });

  describe("rotating_beam", () => {
    it("advances progress based on speed", () => {
      const { manager } = makeManager();
      manager.addInstance("fast_spinner", "s1");

      // speed=360 → full rotation in 1s → progress from 0 to ~1 (wraps)
      manager.update(0.5);
      const state = manager.getInstanceState("s1")!;
      expect(state.progress).toBeCloseTo(0.5);
    });

    it("wraps progress at 1.0", () => {
      const { manager } = makeManager();
      manager.addInstance("fast_spinner", "s1");

      manager.update(1.5); // 1.5 rotations → 0.5 after wrap
      const state = manager.getInstanceState("s1")!;
      expect(state.progress).toBeCloseTo(0.5);
    });

    it("calls onUpdate each frame", () => {
      const { manager, callbacks } = makeManager();
      manager.addInstance("fast_spinner", "s1");
      manager.update(0.1);
      expect(callbacks.onUpdate).toHaveBeenCalledWith("s1", expect.any(Number), true);
    });
  });

  describe("timed_sequence", () => {
    it("starts active with progress=0", () => {
      const { manager } = makeManager();
      manager.addInstance("blink_platform", "b1");
      const state = manager.getInstanceState("b1")!;
      expect(state.active).toBe(true);
      expect(state.progress).toBe(0);
    });

    it("toggles to inactive after activeDuration", () => {
      const { manager, callbacks } = makeManager();
      manager.addInstance("blink_platform", "b1");

      // activeDuration=2 → after 2s should toggle off
      manager.update(2.0);
      const state = manager.getInstanceState("b1")!;
      expect(state.active).toBe(false);
      expect(callbacks.onToggle).toHaveBeenCalledWith("b1", false);
    });

    it("toggles back to active after cooldownDuration", () => {
      const { manager, callbacks } = makeManager();
      manager.addInstance("blink_platform", "b1");

      // active 2s → inactive
      manager.update(2.0);
      // cooldown 3s → active again
      manager.update(3.0);
      const state = manager.getInstanceState("b1")!;
      expect(state.active).toBe(true);
      expect(callbacks.onToggle).toHaveBeenCalledWith("b1", true);
    });

    it("respects phaseOffset", () => {
      const defs = [PHASED_BLINK];
      const registry = createObstacleRegistry(defs);
      const callbacks = makeCallbacks();
      const manager = createObstacleManager(registry, callbacks);

      // phaseOffset=0.5, cycle=4s → starts 2s into cycle → inactive with progress=0
      manager.addInstance("phased_blink", "pb1");
      const state = manager.getInstanceState("pb1")!;
      expect(state.active).toBe(false);
      expect(state.progress).toBe(0);
    });

    it("phaseOffset within active duration starts active", () => {
      const phased: ObstacleDefinition = {
        id: "phased_quarter",
        displayName: "Phased Quarter",
        behaviour: "timed_sequence",
        activeDuration: 4,
        cooldownDuration: 4,
        phaseOffset: 0.25, // 25% of 8s cycle = 2s into active phase
        tag: "ObstaclePhasedQuarter",
      };
      const registry = createObstacleRegistry([phased]);
      const callbacks = makeCallbacks();
      const manager = createObstacleManager(registry, callbacks);

      manager.addInstance("phased_quarter", "pq1");
      const state = manager.getInstanceState("pq1")!;
      expect(state.active).toBe(true);
      expect(state.progress).toBe(2); // 2 seconds into active phase
    });
  });

  describe("conveyor", () => {
    it("can add conveyor instances", () => {
      const { manager } = makeManager([CONVEYOR]);
      expect(manager.addInstance("conveyor_belt", "c1")).toBe(true);
    });

    it("does not change state on update", () => {
      const { manager } = makeManager([CONVEYOR]);
      manager.addInstance("conveyor_belt", "c1");
      manager.update(1.0);
      const state = manager.getInstanceState("c1")!;
      expect(state.progress).toBe(0); // conveyor doesn't use progress
    });

    it("calls onUpdate each frame", () => {
      const { manager, callbacks } = makeManager([CONVEYOR]);
      manager.addInstance("conveyor_belt", "c1");
      manager.update(0.1);
      expect(callbacks.onUpdate).toHaveBeenCalledWith("c1", 0, true);
    });
  });

  describe("edge cases", () => {
    it("update with no instances does nothing", () => {
      const { manager, callbacks } = makeManager();
      manager.update(1.0);
      expect(callbacks.onUpdate).not.toHaveBeenCalled();
    });

    it("multiple instances update independently", () => {
      const { manager } = makeManager();
      manager.addInstance("slow_platform", "p1");
      manager.addInstance("fast_spinner", "s1");
      manager.update(0.5);

      const p1 = manager.getInstanceState("p1")!;
      const s1 = manager.getInstanceState("s1")!;
      expect(p1.progress).toBeCloseTo(0.25); // speed10/dist20 * 0.5 = 0.25
      expect(s1.progress).toBeCloseTo(0.5); // speed360/360 * 0.5 = 0.5
    });

    it("handles zero distance moving platform gracefully", () => {
      const zeroDist: ObstacleDefinition = {
        id: "zero_dist",
        displayName: "Zero Dist",
        behaviour: "moving_platform",
        speed: 10,
        distance: 0,
        tag: "ObstacleZero",
      };
      const registry = createObstacleRegistry([zeroDist]);
      const callbacks = makeCallbacks();
      const manager = createObstacleManager(registry, callbacks);
      manager.addInstance("zero_dist", "z1");
      manager.update(1.0);
      // Should not crash, progress stays at 0
      expect(manager.getInstanceState("z1")!.progress).toBe(0);
    });
  });
});
