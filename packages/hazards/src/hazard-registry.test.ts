/**
 * @broblox/hazards — Hazard Registry Tests
 */

import { describe, it, expect } from "vitest";
import { createHazardRegistry } from "./hazard-registry";
import type { HazardDefinition } from "./types";

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

const SPIKE: HazardDefinition = {
  id: "spike_trap",
  displayName: "Spike Trap",
  behaviour: "contact_damage",
  damage: 15,
  cooldownDuration: 1.5,
  tag: "HazardSpike",
};

describe("createHazardRegistry", () => {
  it("registers definitions and counts them", () => {
    const reg = createHazardRegistry([LAVA, FIRE_JET, SPIKE]);
    expect(reg.count()).toBe(3);
  });

  it("retrieves by id", () => {
    const reg = createHazardRegistry([LAVA, FIRE_JET]);
    expect(reg.get("lava_floor")).toBe(LAVA);
    expect(reg.get("fire_jet")).toBe(FIRE_JET);
    expect(reg.get("nonexistent")).toBeUndefined();
  });

  it("retrieves by tag", () => {
    const reg = createHazardRegistry([LAVA, SPIKE]);
    expect(reg.getByTag("HazardLava")).toBe(LAVA);
    expect(reg.getByTag("HazardSpike")).toBe(SPIKE);
    expect(reg.getByTag("Unknown")).toBeUndefined();
  });

  it("has() checks existence", () => {
    const reg = createHazardRegistry([LAVA]);
    expect(reg.has("lava_floor")).toBe(true);
    expect(reg.has("nope")).toBe(false);
  });

  it("getAll returns all definitions", () => {
    const reg = createHazardRegistry([LAVA, FIRE_JET, SPIKE]);
    const all = reg.getAll();
    expect(all).toHaveLength(3);
    expect(all).toContain(LAVA);
    expect(all).toContain(FIRE_JET);
    expect(all).toContain(SPIKE);
  });

  it("rejects duplicate ids", () => {
    expect(() => createHazardRegistry([LAVA, LAVA])).toThrow("Duplicate hazard id");
  });

  it("rejects duplicate tags", () => {
    const dup: HazardDefinition = { ...FIRE_JET, id: "other", tag: LAVA.tag };
    expect(() => createHazardRegistry([LAVA, dup])).toThrow("Duplicate hazard tag");
  });

  it("works with empty array", () => {
    const reg = createHazardRegistry([]);
    expect(reg.count()).toBe(0);
    expect(reg.getAll()).toHaveLength(0);
  });
});
