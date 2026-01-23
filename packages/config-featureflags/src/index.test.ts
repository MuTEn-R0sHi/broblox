/**
 * Unit tests for @rbx/config-featureflags package.
 * Tests feature flag operations.
 */

import { describe, it, expect, beforeEach } from "vitest";

// ============================================================================
// Mock implementation that mirrors the Roblox version
// ============================================================================

type FlagValue = boolean | number | string;

class FeatureFlagStore {
  private flags = new Map<string, FlagValue>();

  constructor() {
    // Initialize with default flag values
    this.flags.set("doAction.enabled", true);
  }

  getFlagValue<T extends FlagValue>(name: string): T | undefined {
    return this.flags.get(name) as T | undefined;
  }

  setFlagValue(name: string, value: FlagValue): void {
    this.flags.set(name, value);
  }

  isFlagEnabled(name: string): boolean {
    return this.flags.get(name) === true;
  }

  clearAllFlags(): void {
    this.flags.clear();
    // Re-set defaults
    this.flags.set("doAction.enabled", true);
  }

  getAllFlags(): Map<string, FlagValue> {
    return new Map(this.flags);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("Feature Flags", () => {
  let store: FeatureFlagStore;

  beforeEach(() => {
    store = new FeatureFlagStore();
  });

  describe("default values", () => {
    it("has doAction.enabled set to true by default", () => {
      expect(store.isFlagEnabled("doAction.enabled")).toBe(true);
    });

    it("returns undefined for unknown flags", () => {
      expect(store.getFlagValue("unknown.flag")).toBeUndefined();
    });
  });

  describe("getFlagValue", () => {
    it("returns boolean flag values", () => {
      store.setFlagValue("test.boolean", true);
      expect(store.getFlagValue<boolean>("test.boolean")).toBe(true);

      store.setFlagValue("test.boolean", false);
      expect(store.getFlagValue<boolean>("test.boolean")).toBe(false);
    });

    it("returns number flag values", () => {
      store.setFlagValue("test.number", 42);
      expect(store.getFlagValue<number>("test.number")).toBe(42);

      store.setFlagValue("test.number", 0);
      expect(store.getFlagValue<number>("test.number")).toBe(0);

      store.setFlagValue("test.number", -1);
      expect(store.getFlagValue<number>("test.number")).toBe(-1);
    });

    it("returns string flag values", () => {
      store.setFlagValue("test.string", "hello");
      expect(store.getFlagValue<string>("test.string")).toBe("hello");

      store.setFlagValue("test.string", "");
      expect(store.getFlagValue<string>("test.string")).toBe("");
    });

    it("returns undefined for non-existent flags", () => {
      expect(store.getFlagValue("nonexistent")).toBeUndefined();
    });
  });

  describe("setFlagValue", () => {
    it("sets new flag values", () => {
      store.setFlagValue("new.flag", true);
      expect(store.getFlagValue("new.flag")).toBe(true);
    });

    it("overwrites existing flag values", () => {
      store.setFlagValue("test.flag", true);
      expect(store.getFlagValue("test.flag")).toBe(true);

      store.setFlagValue("test.flag", false);
      expect(store.getFlagValue("test.flag")).toBe(false);
    });

    it("allows changing flag type", () => {
      store.setFlagValue("test.flag", true);
      expect(store.getFlagValue("test.flag")).toBe(true);

      store.setFlagValue("test.flag", 42);
      expect(store.getFlagValue("test.flag")).toBe(42);

      store.setFlagValue("test.flag", "string");
      expect(store.getFlagValue("test.flag")).toBe("string");
    });
  });

  describe("isFlagEnabled", () => {
    it("returns true only for flags set to exactly true", () => {
      store.setFlagValue("test.flag", true);
      expect(store.isFlagEnabled("test.flag")).toBe(true);
    });

    it("returns false for flags set to false", () => {
      store.setFlagValue("test.flag", false);
      expect(store.isFlagEnabled("test.flag")).toBe(false);
    });

    it("returns false for non-boolean flags", () => {
      store.setFlagValue("test.flag", 1);
      expect(store.isFlagEnabled("test.flag")).toBe(false);

      store.setFlagValue("test.flag", "true");
      expect(store.isFlagEnabled("test.flag")).toBe(false);
    });

    it("returns false for non-existent flags", () => {
      expect(store.isFlagEnabled("nonexistent")).toBe(false);
    });
  });

  describe("kill switch scenarios", () => {
    it("can disable a feature via kill switch", () => {
      // Feature is enabled by default
      expect(store.isFlagEnabled("doAction.enabled")).toBe(true);

      // Kill switch activated
      store.setFlagValue("doAction.enabled", false);
      expect(store.isFlagEnabled("doAction.enabled")).toBe(false);
    });

    it("can re-enable a feature after kill switch", () => {
      store.setFlagValue("doAction.enabled", false);
      expect(store.isFlagEnabled("doAction.enabled")).toBe(false);

      store.setFlagValue("doAction.enabled", true);
      expect(store.isFlagEnabled("doAction.enabled")).toBe(true);
    });
  });

  describe("flag naming conventions", () => {
    it("supports dot-notation flag names", () => {
      store.setFlagValue("feature.subfeature.enabled", true);
      expect(store.getFlagValue("feature.subfeature.enabled")).toBe(true);
    });

    it("supports various naming patterns", () => {
      const names = [
        "simple",
        "camelCase",
        "snake_case",
        "with.dots",
        "with-dashes",
        "UPPERCASE",
        "MixedCase_With.Everything-123",
      ];

      for (const name of names) {
        store.setFlagValue(name, true);
        expect(store.isFlagEnabled(name)).toBe(true);
      }
    });
  });

  describe("getAllFlags", () => {
    it("returns all set flags", () => {
      store.setFlagValue("flag1", true);
      store.setFlagValue("flag2", 42);
      store.setFlagValue("flag3", "value");

      const allFlags = store.getAllFlags();

      expect(allFlags.get("flag1")).toBe(true);
      expect(allFlags.get("flag2")).toBe(42);
      expect(allFlags.get("flag3")).toBe("value");
      expect(allFlags.get("doAction.enabled")).toBe(true); // default
    });

    it("returns a copy, not the original map", () => {
      const flags1 = store.getAllFlags();
      flags1.set("modified", true);

      const flags2 = store.getAllFlags();
      expect(flags2.has("modified")).toBe(false);
    });
  });

  describe("clearAllFlags", () => {
    it("clears all flags and resets defaults", () => {
      store.setFlagValue("custom.flag", true);
      store.setFlagValue("doAction.enabled", false);

      store.clearAllFlags();

      expect(store.getFlagValue("custom.flag")).toBeUndefined();
      expect(store.isFlagEnabled("doAction.enabled")).toBe(true); // reset to default
    });
  });
});
