/**
 * @broblox/hazards — Hazard Manager Tests
 */

import { describe, it, expect, vi } from "vitest";
import { createHazardRegistry } from "./hazard-registry";
import { createHazardManager, type HazardManagerCallbacks } from "./hazard-manager";
import type { HazardDefinition } from "./types";

// ── Test Definitions ───────────────────────────────────────────────────

const LAVA: HazardDefinition = {
  id: "lava_floor",
  displayName: "Lava Floor",
  behaviour: "instant_kill",
  damage: 0,
  tag: "HazardLava",
};

const FIRE_JET: HazardDefinition = {
  id: "fire_jet",
  displayName: "Fire Jet",
  behaviour: "timed_burst",
  damage: 25,
  activeDuration: 2,
  cooldownDuration: 3,
  tickInterval: 0.5,
  tag: "HazardFireJet",
};

const POISON: HazardDefinition = {
  id: "poison_zone",
  displayName: "Poison Zone",
  behaviour: "damage_zone",
  damage: 10,
  tickInterval: 1,
  tag: "HazardPoison",
};

const SPIKE: HazardDefinition = {
  id: "spike_trap",
  displayName: "Spike Trap",
  behaviour: "contact_damage",
  damage: 15,
  cooldownDuration: 1.5,
  tag: "HazardSpike",
};

const CRUMBLE: HazardDefinition = {
  id: "crumble_plat",
  displayName: "Crumbling Platform",
  behaviour: "crumbling",
  damage: 0,
  activeDuration: 1.5,
  cooldownDuration: 5,
  tag: "HazardCrumble",
};

// ── Helpers ────────────────────────────────────────────────────────────

function setup(defs: HazardDefinition[] = [LAVA, FIRE_JET, POISON, SPIKE, CRUMBLE]) {
  const callbacks: HazardManagerCallbacks = {
    onDamage: vi.fn(() => false),
    onKill: vi.fn(),
    onToggle: vi.fn(),
  };
  const registry = createHazardRegistry(defs);
  const manager = createHazardManager(registry, callbacks);
  return { manager, callbacks, registry };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("HazardManager", () => {
  describe("instance management", () => {
    it("adds instances", () => {
      const { manager } = setup();
      expect(manager.addInstance("lava_floor", "lava_1")).toBe(true);
      expect(manager.instanceCount()).toBe(1);
    });

    it("rejects duplicate instance keys", () => {
      const { manager } = setup();
      manager.addInstance("lava_floor", "lava_1");
      expect(manager.addInstance("lava_floor", "lava_1")).toBe(false);
      expect(manager.instanceCount()).toBe(1);
    });

    it("rejects unknown definition ids", () => {
      const { manager } = setup();
      expect(manager.addInstance("unknown", "x")).toBe(false);
      expect(manager.instanceCount()).toBe(0);
    });

    it("removes instances", () => {
      const { manager } = setup();
      manager.addInstance("lava_floor", "lava_1");
      expect(manager.removeInstance("lava_1")).toBe(true);
      expect(manager.instanceCount()).toBe(0);
    });

    it("returns false for removing non-existent instance", () => {
      const { manager } = setup();
      expect(manager.removeInstance("nope")).toBe(false);
    });
  });

  describe("instant_kill", () => {
    it("kills player on touch", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("lava_floor", "lava_1");

      const result = manager.processTouch(1, "lava_1", 0);
      expect(result).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledWith(1, 9999, "lava_floor");
      expect(callbacks.onKill).toHaveBeenCalledWith(1, "lava_floor");
    });

    it("ignores untracked players", () => {
      const { manager, callbacks } = setup();
      manager.addInstance("lava_floor", "lava_1");

      const result = manager.processTouch(99, "lava_1", 0);
      expect(result).toBe(false);
      expect(callbacks.onDamage).not.toHaveBeenCalled();
    });
  });

  describe("contact_damage", () => {
    it("deals damage on touch and sets immunity", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("spike_trap", "spike_1");

      expect(manager.processTouch(1, "spike_1", 0)).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledWith(1, 15, "spike_trap");

      // Immune within cooldown
      expect(manager.isImmune(1, "spike_1", 0.5)).toBe(true);
      expect(manager.processTouch(1, "spike_1", 0.5)).toBe(false);

      // Not immune after cooldown
      expect(manager.isImmune(1, "spike_1", 2)).toBe(false);
      expect(manager.processTouch(1, "spike_1", 2)).toBe(true);
    });

    it("calls onKill when damage kills player", () => {
      const { manager, callbacks } = setup();
      (callbacks.onDamage as ReturnType<typeof vi.fn>).mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("spike_trap", "spike_1");

      manager.processTouch(1, "spike_1", 0);
      expect(callbacks.onKill).toHaveBeenCalledWith(1, "spike_trap");
    });
  });

  describe("damage_zone", () => {
    it("deals tick damage with interval immunity", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("poison_zone", "poison_1");

      // First tick
      expect(manager.processTouch(1, "poison_1", 0)).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledWith(1, 10, "poison_zone");

      // Immune for 1s (tickInterval)
      expect(manager.processTouch(1, "poison_1", 0.5)).toBe(false);

      // Next tick after interval
      expect(manager.processTouch(1, "poison_1", 1.1)).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledTimes(2);
    });
  });

  describe("timed_burst", () => {
    it("toggles active/inactive state", () => {
      const { manager, callbacks } = setup();
      manager.addInstance("fire_jet", "jet_1");

      // Starts active; after activeDuration (2s) should toggle
      manager.update(2.1);
      expect(callbacks.onToggle).toHaveBeenCalledWith("jet_1", false);

      // After cooldownDuration (3s) should toggle back
      manager.update(3.1);
      expect(callbacks.onToggle).toHaveBeenCalledWith("jet_1", true);
    });

    it("doesn't damage when inactive", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("fire_jet", "jet_1");

      // Toggle off
      manager.update(2.1);

      // Touch while inactive → no damage
      expect(manager.processTouch(1, "jet_1", 3)).toBe(false);
      expect(callbacks.onDamage).not.toHaveBeenCalled();
    });

    it("damages when active", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("fire_jet", "jet_1");

      // Should be active initially
      expect(manager.processTouch(1, "jet_1", 0)).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledWith(1, 25, "fire_jet");
    });

    it("grants immunity between ticks via tickInterval", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("fire_jet", "jet_1");

      // First touch deals damage
      expect(manager.processTouch(1, "jet_1", 0)).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledTimes(1);

      // Immune for tickInterval (0.5s)
      expect(manager.processTouch(1, "jet_1", 0.3)).toBe(false);
      expect(callbacks.onDamage).toHaveBeenCalledTimes(1);

      // Damage again after tickInterval
      expect(manager.processTouch(1, "jet_1", 0.6)).toBe(true);
      expect(callbacks.onDamage).toHaveBeenCalledTimes(2);
    });
  });

  describe("crumbling", () => {
    it("does not deal damage on touch", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("crumble_plat", "plat_1");

      // Touch starts break timer
      expect(manager.processTouch(1, "plat_1", 0)).toBe(false);
      expect(callbacks.onDamage).not.toHaveBeenCalled();
    });

    it("breaks after activeDuration and respawns after cooldown", () => {
      const { manager, callbacks } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("crumble_plat", "plat_1");

      // Touch to start timer
      manager.processTouch(1, "plat_1", 0);

      // Break after activeDuration (1.5s)
      manager.update(1.6);
      expect(callbacks.onToggle).toHaveBeenCalledWith("plat_1", false);

      // Respawn after cooldown (5s)
      manager.update(5.1);
      expect(callbacks.onToggle).toHaveBeenCalledWith("plat_1", true);
    });
  });

  describe("player lifecycle", () => {
    it("initPlayer / cleanupPlayer", () => {
      const { manager } = setup();
      manager.addInstance("lava_floor", "lava_1");

      // Not tracked → no damage
      expect(manager.processTouch(1, "lava_1", 0)).toBe(false);

      // Init → damage works
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      expect(manager.processTouch(1, "lava_1", 0)).toBe(true);

      // Cleanup → damage stops
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._cleanupPlayer(1);
      expect(manager.processTouch(1, "lava_1", 0)).toBe(false);
    });

    it("cleanupPlayer clears immunity state", () => {
      const { manager } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      manager.addInstance("spike_trap", "spike_1");

      manager.processTouch(1, "spike_1", 0);
      expect(manager.isImmune(1, "spike_1", 0.5)).toBe(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._cleanupPlayer(1);
      // After cleanup, no immunity entries should remain
      // (re-init wouldn't carry over)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      expect(manager.isImmune(1, "spike_1", 0.5)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("processTouch with unknown instance returns false", () => {
      const { manager } = setup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (manager as any)._initPlayer(1);
      expect(manager.processTouch(1, "nope", 0)).toBe(false);
    });

    it("update with no instances does nothing", () => {
      const { manager, callbacks } = setup();
      manager.update(10);
      expect(callbacks.onToggle).not.toHaveBeenCalled();
    });

    it("update skips non-timed hazards", () => {
      const { manager, callbacks } = setup();
      manager.addInstance("lava_floor", "lava_1");
      manager.addInstance("spike_trap", "spike_1");
      manager.update(100);
      expect(callbacks.onToggle).not.toHaveBeenCalled();
    });
  });
});
