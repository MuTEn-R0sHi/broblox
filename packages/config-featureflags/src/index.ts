/**
 * @rbx/config-featureflags
 * Feature flags and kill-switch support.
 * Compatible with roblox-ts.
 *
 * Features:
 * - Typed flag definitions with metadata
 * - Percentage-based rollouts
 * - Override system for testing/debugging
 * - Flag change listeners
 * - User/group segments for targeted rollouts
 * - Schedule-based activation windows
 * - In-memory rollout history / audit log
 *
 * This file is a barrel — all logic lives in sub-modules.
 */

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  FlagValue,
  FlagSegment,
  FlagSchedule,
  FlagDefinition,
  FlagCategory,
  FlagChangeListener,
  FlagChangeRecord,
} from "./types";

// ── Registry ───────────────────────────────────────────────────────────────
export {
  defineFlag,
  getFlagDefinition,
  getAllFlagDefinitions,
  getFlagsByCategory,
  getKillSwitches,
} from "./registry";

// ── Overrides / values ─────────────────────────────────────────────────────
export {
  getFlagValue,
  getFlagValueOr,
  setFlagValue,
  clearFlagOverride,
  clearAllOverrides,
  isFlagEnabled,
  isFlagEnabledForUser,
  triggerKillSwitch,
  setFlagEnabledOverride,
  clearFlagEnabledOverride,
  setFlagRolloutPercentageOverride,
  clearFlagRolloutPercentageOverride,
  setFlagKilled,
  applyRemoteFeatureFlagSnapshot,
  onFlagChange,
} from "./overrides";

export type { RemoteBooleanFlagOverride, RemoteFeatureFlagSnapshot } from "./overrides";

// ── Segments ───────────────────────────────────────────────────────────────
export {
  setUserAttribute,
  getUserAttribute,
  clearUserAttributes,
  setFlagSegments,
  clearFlagSegments,
  setFlagSchedule,
  clearFlagSchedule,
} from "./segments";

// ── History ────────────────────────────────────────────────────────────────
export { getRolloutHistory, getFlagHistory, clearRolloutHistory } from "./history";

// ── Sync service ───────────────────────────────────────────────────────────
export * from "./create-feature-flag-sync-service";

// ============================================================================
// Default Platform Flags
// ============================================================================

import { defineFlag } from "./registry";

// Gameplay flags
defineFlag({
  name: "doAction.enabled",
  defaultValue: true,
  description: "Enable the DoAction remote endpoint",
  category: "gameplay",
  isKillSwitch: true,
});

defineFlag({
  name: "movement.validation.enabled",
  defaultValue: true,
  description: "Enable server-side movement validation (anti-cheat)",
  category: "security",
  isKillSwitch: true,
});

// Debug flags
defineFlag({
  name: "debug.verboseLogging",
  defaultValue: false,
  description: "Enable verbose debug logging",
  category: "debug",
});

defineFlag({
  name: "debug.showDevUI",
  defaultValue: false,
  description: "Show developer UI elements",
  category: "debug",
});

// Experiment flags
defineFlag({
  name: "experiment.newMatchmaking",
  defaultValue: false,
  description: "Enable new matchmaking algorithm",
  category: "experiment",
  rolloutPercentage: 0,
});
