/**
 * @broblox/obstacles — Obstacle Registry Tests
 */

import { describe, it, expect } from "vitest";
import { createObstacleRegistry } from "./obstacle-registry";
import type { ObstacleDefinition } from "./types";

const SLOW_PLATFORM: ObstacleDefinition = {
  id: "slow_platform",
  displayName: "Slow Platform",
  behaviour: "moving_platform",
  speed: 5,
  distance: 20,
  tag: "ObstacleSlowPlatform",
};

const FAST_SPINNER: ObstacleDefinition = {
  id: "fast_spinner",
  displayName: "Fast Spinner",
  behaviour: "rotating_beam",
  speed: 180,
  tag: "ObstacleFastSpinner",
};

const BLINK_PLATFORM: ObstacleDefinition = {
  id: "blink_platform",
  displayName: "Blink Platform",
  behaviour: "timed_sequence",
  activeDuration: 2,
  cooldownDuration: 2,
  tag: "ObstacleBlink",
};

describe("ObstacleRegistry", () => {
  it("registers and retrieves definitions by id", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM, FAST_SPINNER]);
    expect(reg.get("slow_platform")).toEqual(SLOW_PLATFORM);
    expect(reg.get("fast_spinner")).toEqual(FAST_SPINNER);
  });

  it("returns undefined for unknown id", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM]);
    expect(reg.get("nonexistent")).toBeUndefined();
  });

  it("getAll returns all definitions", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM, FAST_SPINNER, BLINK_PLATFORM]);
    expect(reg.getAll()).toHaveLength(3);
  });

  it("getByTag finds definition by tag", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM, FAST_SPINNER]);
    expect(reg.getByTag("ObstacleFastSpinner")).toEqual(FAST_SPINNER);
  });

  it("getByTag returns undefined for unknown tag", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM]);
    expect(reg.getByTag("Unknown")).toBeUndefined();
  });

  it("has returns true for registered ids", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM]);
    expect(reg.has("slow_platform")).toBe(true);
    expect(reg.has("nonexistent")).toBe(false);
  });

  it("count returns number of definitions", () => {
    const reg = createObstacleRegistry([SLOW_PLATFORM, FAST_SPINNER]);
    expect(reg.count()).toBe(2);
  });

  it("throws on duplicate id", () => {
    expect(() => createObstacleRegistry([SLOW_PLATFORM, SLOW_PLATFORM])).toThrow(
      "Duplicate obstacle id: slow_platform"
    );
  });

  it("throws on duplicate tag", () => {
    const dup = { ...FAST_SPINNER, id: "other_spinner" };
    expect(() => createObstacleRegistry([FAST_SPINNER, dup])).toThrow(
      "Duplicate obstacle tag: ObstacleFastSpinner"
    );
  });
});
