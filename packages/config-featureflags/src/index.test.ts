/**
 * Unit tests for @rbx/config-featureflags package.
 *
 * Tests the real exported API — defineFlag, getFlagValue, isFlagEnabled,
 * isFlagEnabledForUser, kill-switches, segments, scheduling, rollout
 * history, change listeners, and remote snapshots.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  defineFlag,
  getFlagDefinition,
  getAllFlagDefinitions,
  getFlagsByCategory,
  getFlagValue,
  getFlagValueOr,
  setFlagValue,
  clearFlagOverride,
  clearAllOverrides,
  isFlagEnabled,
  isFlagEnabledForUser,
  getKillSwitches,
  triggerKillSwitch,
  setFlagEnabledOverride,
  clearFlagEnabledOverride,
  setFlagRolloutPercentageOverride,
  clearFlagRolloutPercentageOverride,
  setFlagKilled,
  applyRemoteFeatureFlagSnapshot,
  onFlagChange,
  // Segments
  setUserAttribute,
  getUserAttribute,
  clearUserAttributes,
  setFlagSegments,
  clearFlagSegments,
  // Scheduling
  setFlagSchedule,
  clearFlagSchedule,
  // Rollout History
  getRolloutHistory,
  getFlagHistory,
  clearRolloutHistory,
} from "./index";

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  clearAllOverrides();
  clearRolloutHistory();
});

// ============================================================================
// Flag Definitions
// ============================================================================

describe("flag definitions", () => {
  it("retrieves a registered flag by name", () => {
    // "doAction.enabled" is registered at module-load time
    const def = getFlagDefinition("doAction.enabled");
    expect(def).toBeDefined();
    expect(def!.defaultValue).toBe(true);
    expect(def!.category).toBe("gameplay");
    expect(def!.isKillSwitch).toBe(true);
  });

  it("returns undefined for unknown flags", () => {
    expect(getFlagDefinition("does.not.exist")).toBeUndefined();
  });

  it("getAllFlagDefinitions returns all registered flags", () => {
    const all = getAllFlagDefinitions();
    expect(all.length).toBeGreaterThanOrEqual(5); // 5 default platform flags
    const names = all.map((d) => d.name);
    expect(names).toContain("doAction.enabled");
    expect(names).toContain("movement.validation.enabled");
    expect(names).toContain("debug.verboseLogging");
    expect(names).toContain("experiment.newMatchmaking");
  });

  it("getFlagsByCategory filters correctly", () => {
    const debug = getFlagsByCategory("debug");
    expect(debug.every((d) => d.category === "debug")).toBe(true);
    const names = debug.map((d) => d.name);
    expect(names).toContain("debug.verboseLogging");
    expect(names).toContain("debug.showDevUI");
  });
});

// ============================================================================
// getFlagValue / getFlagValueOr
// ============================================================================

describe("getFlagValue", () => {
  it("returns default when no override set", () => {
    expect(getFlagValue("doAction.enabled")).toBe(true);
    expect(getFlagValue("debug.verboseLogging")).toBe(false);
  });

  it("returns override when set", () => {
    setFlagValue("doAction.enabled", false);
    expect(getFlagValue("doAction.enabled")).toBe(false);
  });

  it("returns undefined for unknown flag", () => {
    expect(getFlagValue("nope")).toBeUndefined();
  });

  it("getFlagValueOr returns fallback for unknown flag", () => {
    expect(getFlagValueOr("nope", 42)).toBe(42);
  });

  it("getFlagValueOr returns current value for known flag", () => {
    expect(getFlagValueOr("doAction.enabled", false)).toBe(true);
  });
});

// ============================================================================
// setFlagValue / clearFlagOverride / clearAllOverrides
// ============================================================================

describe("flag overrides", () => {
  it("setFlagValue overrides the default", () => {
    setFlagValue("debug.verboseLogging", true);
    expect(getFlagValue("debug.verboseLogging")).toBe(true);
  });

  it("clearFlagOverride reverts to default", () => {
    setFlagValue("debug.verboseLogging", true);
    clearFlagOverride("debug.verboseLogging");
    expect(getFlagValue("debug.verboseLogging")).toBe(false);
  });

  it("clearAllOverrides reverts everything", () => {
    setFlagValue("doAction.enabled", false);
    setFlagKilled("movement.validation.enabled", true);
    clearAllOverrides();
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
    expect(isFlagEnabled("movement.validation.enabled")).toBe(true);
  });
});

// ============================================================================
// isFlagEnabled
// ============================================================================

describe("isFlagEnabled", () => {
  it("returns true for flags defaulting to true", () => {
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });

  it("returns false for flags defaulting to false", () => {
    expect(isFlagEnabled("debug.verboseLogging")).toBe(false);
  });

  it("returns false for unknown flags", () => {
    expect(isFlagEnabled("nope")).toBe(false);
  });

  it("respects killed state", () => {
    setFlagKilled("doAction.enabled", true);
    expect(isFlagEnabled("doAction.enabled")).toBe(false);
  });

  it("respects enabled override", () => {
    setFlagEnabledOverride("debug.verboseLogging", true);
    expect(isFlagEnabled("debug.verboseLogging")).toBe(true);
  });
});

// ============================================================================
// isFlagEnabledForUser (rollout percentage)
// ============================================================================

describe("isFlagEnabledForUser", () => {
  it("returns false for unknown flags", () => {
    expect(isFlagEnabledForUser("nope", 12345)).toBe(false);
  });

  it("returns true for flags at 100% rollout", () => {
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 999999)).toBe(true);
  });

  it("returns false for flags at 0% rollout", () => {
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 0);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(false);
  });

  it("deterministic: same user always gets same result", () => {
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 50);
    const first = isFlagEnabledForUser("experiment.newMatchmaking", 42);
    const second = isFlagEnabledForUser("experiment.newMatchmaking", 42);
    expect(first).toBe(second);
  });

  it("respects kill-switch even with rollout", () => {
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);
    setFlagKilled("experiment.newMatchmaking", true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(false);
  });
});

// ============================================================================
// Kill Switches
// ============================================================================

describe("kill switches", () => {
  it("getKillSwitches returns only kill-switch flags", () => {
    const ks = getKillSwitches();
    expect(ks.every((d) => d.isKillSwitch === true)).toBe(true);
    expect(ks.length).toBeGreaterThanOrEqual(2);
  });

  it("triggerKillSwitch disables the flag", () => {
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
    const result = triggerKillSwitch("doAction.enabled");
    expect(result).toBe(true);
    expect(isFlagEnabled("doAction.enabled")).toBe(false);
  });

  it("triggerKillSwitch returns false for non-kill-switch flags", () => {
    const result = triggerKillSwitch("debug.verboseLogging");
    expect(result).toBe(false);
  });

  it("setFlagKilled(false) undoes the kill", () => {
    triggerKillSwitch("doAction.enabled");
    expect(isFlagEnabled("doAction.enabled")).toBe(false);
    setFlagKilled("doAction.enabled", false);
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });
});

// ============================================================================
// Change Listeners
// ============================================================================

describe("onFlagChange", () => {
  it("fires on value change", () => {
    const calls: [string, unknown, unknown][] = [];
    const unsub = onFlagChange((n, nv, ov) => calls.push([n, nv, ov]));

    setFlagValue("doAction.enabled", false);
    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual(["doAction.enabled", false, true]);

    unsub();
  });

  it("unsubscribe prevents future calls", () => {
    const calls: unknown[] = [];
    const unsub = onFlagChange(() => calls.push(1));
    unsub();

    setFlagValue("doAction.enabled", false);
    expect(calls.length).toBe(0);
  });
});

// ============================================================================
// Remote Snapshots
// ============================================================================

describe("applyRemoteFeatureFlagSnapshot", () => {
  it("applies enabled overrides from snapshot", () => {
    applyRemoteFeatureFlagSnapshot({
      updatedAt: 1000,
      flags: {
        "doAction.enabled": { enabled: false },
      },
    });
    expect(isFlagEnabled("doAction.enabled")).toBe(false);
  });

  it("applies kill-switch from snapshot", () => {
    applyRemoteFeatureFlagSnapshot({
      flags: {
        "movement.validation.enabled": { isKilled: true },
      },
    });
    expect(isFlagEnabled("movement.validation.enabled")).toBe(false);
  });

  it("applies rollout percentage from snapshot", () => {
    applyRemoteFeatureFlagSnapshot({
      flags: {
        "experiment.newMatchmaking": {
          enabled: true,
          rolloutPercentage: 100,
        },
      },
    });
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(true);
  });

  it("clears previous overrides before applying", () => {
    setFlagKilled("doAction.enabled", true);
    expect(isFlagEnabled("doAction.enabled")).toBe(false);

    applyRemoteFeatureFlagSnapshot({ flags: {} });
    // Kill should be cleared
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });

  it("applies segments from snapshot", () => {
    applyRemoteFeatureFlagSnapshot({
      flags: {
        "experiment.newMatchmaking": {
          enabled: true,
          rolloutPercentage: 100,
          segments: [{ name: "testers", userIds: [42] }],
        },
      },
    });
    // User 42 matches segment → passes to rollout (100%)
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 42)).toBe(true);
    // User 99 doesn't match segment → falls back to default (false)
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 99)).toBe(false);
  });

  it("applies schedule from snapshot", () => {
    const now = os.clock();
    applyRemoteFeatureFlagSnapshot({
      flags: {
        "doAction.enabled": {
          enabled: true,
          schedule: { startTime: now + 9999 }, // far in the future
        },
      },
    });
    // Outside schedule → returns default (true for this flag)
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });
});

// ============================================================================
// Segments
// ============================================================================

describe("segments", () => {
  it("user matches segment by userId", () => {
    setFlagSegments("experiment.newMatchmaking", [
      { name: "beta-testers", userIds: [100, 200, 300] },
    ]);
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);

    expect(isFlagEnabledForUser("experiment.newMatchmaking", 100)).toBe(true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 200)).toBe(true);
    // User not in segment → default (false)
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 999)).toBe(false);
  });

  it("user matches segment by attribute", () => {
    setFlagSegments("experiment.newMatchmaking", [
      { name: "en-locale", attribute: { key: "locale", value: "en" } },
    ]);
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);

    setUserAttribute(500, "locale", "en");
    setUserAttribute(600, "locale", "fr");

    expect(isFlagEnabledForUser("experiment.newMatchmaking", 500)).toBe(true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 600)).toBe(false);

    clearUserAttributes(500);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 500)).toBe(false);
  });

  it("clearFlagSegments removes segment gating", () => {
    setFlagSegments("experiment.newMatchmaking", [{ name: "select", userIds: [1] }]);
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);

    expect(isFlagEnabledForUser("experiment.newMatchmaking", 999)).toBe(false);

    clearFlagSegments("experiment.newMatchmaking");
    // No segments → all users pass through
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 999)).toBe(true);
  });

  it("getUserAttribute returns undefined for unset attributes", () => {
    expect(getUserAttribute(123, "foo")).toBeUndefined();
  });

  it("getUserAttribute returns the set value", () => {
    setUserAttribute(123, "plan", "premium");
    expect(getUserAttribute(123, "plan")).toBe("premium");
  });
});

// ============================================================================
// Scheduling
// ============================================================================

describe("scheduling", () => {
  it("flag is active when within schedule window", () => {
    const now = os.clock();
    setFlagSchedule("doAction.enabled", {
      startTime: now - 100,
      endTime: now + 100,
    });
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });

  it("flag falls back to default when before schedule starts", () => {
    const now = os.clock();
    // doAction.enabled defaults to true, so with override off + schedule not yet active,
    // schedule check returns default
    setFlagEnabledOverride("doAction.enabled", false);
    setFlagSchedule("doAction.enabled", {
      startTime: now + 9999,
    });
    // Schedule not active → returns default (true)
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });

  it("flag falls back to default when after schedule expires", () => {
    const now = os.clock();
    setFlagEnabledOverride("doAction.enabled", false);
    setFlagSchedule("doAction.enabled", {
      endTime: now - 100,
    });
    // Schedule expired → returns default (true)
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });

  it("clearFlagSchedule removes schedule gating", () => {
    const now = os.clock();
    setFlagEnabledOverride("doAction.enabled", false);
    setFlagSchedule("doAction.enabled", {
      startTime: now + 9999,
    });
    // Schedule not active → default (true)
    expect(isFlagEnabled("doAction.enabled")).toBe(true);

    clearFlagSchedule("doAction.enabled");
    // No schedule → uses override (false)
    expect(isFlagEnabled("doAction.enabled")).toBe(false);
  });

  it("schedule works with isFlagEnabledForUser", () => {
    const now = os.clock();
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);
    setFlagSchedule("experiment.newMatchmaking", {
      startTime: now + 9999,
    });
    // Schedule not active → returns default (false for experiment.newMatchmaking)
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(false);
  });
});

// ============================================================================
// Rollout History
// ============================================================================

describe("rollout history", () => {
  it("records changes on setFlagValue", () => {
    setFlagValue("debug.verboseLogging", true);
    const history = getRolloutHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    const last = history[history.length - 1];
    expect(last.flagName).toBe("debug.verboseLogging");
    expect(last.newValue).toBe(true);
    expect(last.source).toBe("local");
  });

  it("records kill-switch changes", () => {
    triggerKillSwitch("doAction.enabled");
    const history = getFlagHistory("doAction.enabled");
    expect(history.length).toBeGreaterThanOrEqual(1);
    const killRecord = history.find((r) => r.source === "kill-switch");
    expect(killRecord).toBeDefined();
    expect(killRecord!.newValue).toBe(false);
  });

  it("getFlagHistory filters by flag name", () => {
    setFlagValue("debug.verboseLogging", true);
    setFlagValue("debug.showDevUI", true);
    const h = getFlagHistory("debug.verboseLogging");
    expect(h.every((r) => r.flagName === "debug.verboseLogging")).toBe(true);
  });

  it("clearRolloutHistory empties the log", () => {
    setFlagValue("debug.verboseLogging", true);
    expect(getRolloutHistory().length).toBeGreaterThan(0);
    clearRolloutHistory();
    expect(getRolloutHistory().length).toBe(0);
  });

  it("records remote snapshot changes", () => {
    applyRemoteFeatureFlagSnapshot({
      flags: {
        "doAction.enabled": { value: false },
      },
    });
    const h = getFlagHistory("doAction.enabled");
    const remote = h.find((r) => r.source === "remote");
    expect(remote).toBeDefined();
    expect(remote!.newValue).toBe(false);
  });
});

// ============================================================================
// Enabled/Rollout Overrides
// ============================================================================

describe("enabled and rollout overrides", () => {
  it("setFlagEnabledOverride changes boolean flag", () => {
    setFlagEnabledOverride("doAction.enabled", false);
    expect(isFlagEnabled("doAction.enabled")).toBe(false);
  });

  it("clearFlagEnabledOverride reverts", () => {
    setFlagEnabledOverride("doAction.enabled", false);
    clearFlagEnabledOverride("doAction.enabled");
    expect(isFlagEnabled("doAction.enabled")).toBe(true);
  });

  it("setFlagRolloutPercentageOverride clamps to 0-100", () => {
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 150);
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    // Should be clamped to 100 → all users enabled
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(true);
  });

  it("clearFlagRolloutPercentageOverride reverts to definition", () => {
    setFlagRolloutPercentageOverride("experiment.newMatchmaking", 100);
    setFlagEnabledOverride("experiment.newMatchmaking", true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(true);

    clearFlagRolloutPercentageOverride("experiment.newMatchmaking");
    // Reverts to definition's rolloutPercentage (0%) → no users
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 1)).toBe(false);
  });
});

// ============================================================================
// Edge cases — branch coverage
// ============================================================================

describe("isFlagEnabledForUser edge cases", () => {
  it("returns false for non-boolean flags", () => {
    // Define a string flag — isFlagEnabledForUser should return false
    defineFlag({
      name: "test.stringFlag",
      defaultValue: "hello",
      description: "A string flag",
      category: "debug",
    });
    expect(isFlagEnabledForUser("test.stringFlag", 1)).toBe(false);
  });

  it("returns false when baseEnabled is false (enabledOverride false)", () => {
    // doAction.enabled defaults to true, override to false
    setFlagEnabledOverride("doAction.enabled", false);
    expect(isFlagEnabledForUser("doAction.enabled", 1)).toBe(false);
  });

  it("returns true when no rollout percentage is defined", () => {
    // doAction.enabled has no rolloutPercentage → should return true via baseEnabled
    expect(isFlagEnabledForUser("doAction.enabled", 1)).toBe(true);
  });

  it("returns true when value override is true (bypasses rollout)", () => {
    setFlagValue("experiment.newMatchmaking", true);
    expect(isFlagEnabledForUser("experiment.newMatchmaking", 99)).toBe(true);
  });

  it("returns false when value override is false", () => {
    setFlagValue("doAction.enabled", false);
    expect(isFlagEnabledForUser("doAction.enabled", 99)).toBe(false);
  });

  it("user not matching any segment falls back to default", () => {
    defineFlag({
      name: "test.segmentedFlag",
      defaultValue: false,
      description: "Segmented flag",
      category: "experiment",
      segments: [{ name: "beta-testers", userIds: [100, 200] }],
    });
    // userId 999 is not in segment → falls back to defaultValue (false)
    expect(isFlagEnabledForUser("test.segmentedFlag", 999)).toBe(false);
  });
});

describe("rollout history cap", () => {
  it("caps history at MAX_HISTORY_SIZE (500 entries)", () => {
    // Generate > 500 changes to trigger the history cap
    for (let i = 0; i < 510; i++) {
      setFlagValue("doAction.enabled", i % 2 === 0);
    }
    const history = getRolloutHistory();
    expect(history.length).toBeLessThanOrEqual(500);
    expect(history.length).toBeGreaterThan(0);
  });
});

describe("defineFlag edge cases", () => {
  it("skips duplicate registration", () => {
    // "doAction.enabled" is already defined at module load
    defineFlag({
      name: "doAction.enabled",
      defaultValue: false,
      description: "Duplicate",
      category: "debug",
    });
    // Original definition should be unchanged (defaultValue true)
    expect(getFlagValue("doAction.enabled")).toBe(true);
  });

  it("defines a numeric flag", () => {
    defineFlag({
      name: "test.maxRetries",
      defaultValue: 3,
      description: "Max retry count",
      category: "networking",
    });
    expect(getFlagValue("test.maxRetries")).toBe(3);
  });
});

describe("setFlagEnabledOverride edge cases", () => {
  it("ignores non-boolean flags", () => {
    defineFlag({
      name: "test.numericFlag",
      defaultValue: 42,
      description: "Numeric config",
      category: "gameplay",
    });
    setFlagEnabledOverride("test.numericFlag", true);
    // Should not have changed the value (it's not boolean)
    expect(getFlagValue("test.numericFlag")).toBe(42);
  });
});

describe("setFlagKilled edge cases", () => {
  it("ignores non-boolean flags", () => {
    defineFlag({
      name: "test.stringConfig",
      defaultValue: "value",
      description: "String config",
      category: "gameplay",
    });
    setFlagKilled("test.stringConfig", true);
    // Should not affect non-boolean flag
    expect(getFlagValue("test.stringConfig")).toBe("value");
  });
});

describe("clearUserAttributes", () => {
  it("removes user from attribute store", () => {
    setUserAttribute(42, "locale", "en");
    expect(getUserAttribute(42, "locale")).toBe("en");
    clearUserAttributes(42);
    expect(getUserAttribute(42, "locale")).toBeUndefined();
  });
});

describe("applyRemoteFeatureFlagSnapshot edge cases", () => {
  it("applies value overrides and records history as remote source", () => {
    clearRolloutHistory();
    applyRemoteFeatureFlagSnapshot({
      flags: {
        "doAction.enabled": { value: false },
      },
    });
    expect(getFlagValue("doAction.enabled")).toBe(false);
    const history = getRolloutHistory();
    const remoteEntries = history.filter((h) => h.source === "remote");
    expect(remoteEntries.length).toBeGreaterThan(0);
  });
});
