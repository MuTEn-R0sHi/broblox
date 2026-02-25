/**
 * @rbx/config-featureflags — Flag value overrides, boolean helpers, kill-switches,
 * change listeners, and remote snapshot application.
 */

import type { FlagValue, FlagChangeListener, FlagSegment, FlagSchedule } from "./types";
import {
  flagDefinitions,
  flagOverrides,
  flagEnabledOverrides,
  flagRolloutOverrides,
  killedFlags,
  changeListeners,
  flagSegmentOverrides,
  flagScheduleOverrides,
} from "./state";
import { recordHistory } from "./history";
import { matchesAnySegment, isWithinSchedule, setFlagSegments, setFlagSchedule } from "./segments";

// ============================================================================
// Flag Values
// ============================================================================

/**
 * Get the current value of a flag.
 * Returns override if set, otherwise default from definition.
 */
export function getFlagValue<T extends FlagValue>(name: string): T | undefined {
  // Check for override first
  if (flagOverrides.has(name)) {
    return flagOverrides.get(name) as T;
  }

  const definition = flagDefinitions.get(name);
  const isBoolean = definition ? typeOf(definition.defaultValue as unknown) === "boolean" : false;

  if (isBoolean) {
    if (killedFlags.has(name)) {
      return false as T;
    }

    if (flagEnabledOverrides.has(name)) {
      return flagEnabledOverrides.get(name) as unknown as T;
    }
  }

  // Fall back to definition default
  if (definition) {
    return definition.defaultValue as T;
  }

  return undefined;
}

/**
 * Get the current value of a flag, with a fallback if not defined.
 */
export function getFlagValueOr<T extends FlagValue>(name: string, fallback: T): T {
  const value = getFlagValue<T>(name);
  return value !== undefined ? value : fallback;
}

/**
 * Set a flag override value.
 * This takes precedence over the default value.
 */
export function setFlagValue(name: string, value: FlagValue): void {
  const oldValue = getFlagValue(name);
  flagOverrides.set(name, value);
  recordHistory(name, value, oldValue, "local");
  notifyListeners(name, value, oldValue);
}

/**
 * Clear a flag override, reverting to the default value.
 */
export function clearFlagOverride(name: string): void {
  const oldValue = getFlagValue(name);
  flagOverrides.delete(name);
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    recordHistory(name, newValue!, oldValue, "local");
    notifyListeners(name, newValue!, oldValue);
  }
}

/**
 * Clear all flag overrides.
 */
export function clearAllOverrides(): void {
  flagOverrides.clear();
  flagEnabledOverrides.clear();
  flagRolloutOverrides.clear();
  killedFlags.clear();
  flagSegmentOverrides.clear();
  flagScheduleOverrides.clear();
}

// ============================================================================
// Boolean Flag Helpers
// ============================================================================

/**
 * Check if a boolean flag is enabled.
 * Respects schedule windows — outside the window the flag returns its default.
 */
export function isFlagEnabled(name: string): boolean {
  // Schedule check: if a schedule is active and we're outside the window, skip overrides
  if (!isWithinSchedule(name)) {
    const def = flagDefinitions.get(name);
    return def ? def.defaultValue === true : false;
  }
  const value = getFlagValue<boolean>(name);
  return value === true;
}

/**
 * Check if a flag is enabled for a specific user based on rollout percentage
 * and segments. Uses deterministic hashing for consistent results per user.
 *
 * Evaluation order:
 * 1. Schedule window check
 * 2. Value override (setFlagValue)
 * 3. Kill-switch
 * 4. Segment check (if segments exist, user must match one)
 * 5. Enabled override / base enabled
 * 6. Rollout percentage bucket
 */
export function isFlagEnabledForUser(name: string, userId: number): boolean {
  const definition = flagDefinitions.get(name);
  if (!definition) {
    return false;
  }

  // Schedule check
  if (!isWithinSchedule(name)) {
    return definition.defaultValue === true;
  }

  // Check value override first
  if (flagOverrides.has(name)) {
    return flagOverrides.get(name) === true;
  }

  if (typeOf(definition.defaultValue as unknown) !== "boolean") {
    return false;
  }

  if (killedFlags.has(name)) {
    return false;
  }

  // Segment check: if segments are defined, user must match at least one
  const segments = flagSegmentOverrides.get(name) ?? definition.segments;
  if (segments !== undefined && segments.size() > 0) {
    if (!matchesAnySegment(userId, segments)) {
      return definition.defaultValue === true;
    }
  }

  const baseEnabled = flagEnabledOverrides.has(name)
    ? (flagEnabledOverrides.get(name) as boolean)
    : definition.defaultValue === true;

  if (!baseEnabled) {
    return false;
  }

  const rolloutPercentage = flagRolloutOverrides.has(name)
    ? (flagRolloutOverrides.get(name) as number)
    : definition.rolloutPercentage;

  // If no rollout percentage, use default value
  if (rolloutPercentage === undefined) {
    return true;
  }

  // Deterministic percentage check based on userId and flag name
  const bucket = hashUserFlag(userId, name) % 100;
  return bucket < rolloutPercentage;
}

/**
 * Simple deterministic hash for user+flag bucketing.
 */
function hashUserFlag(userId: number, flagName: string): number {
  let hash = userId;
  for (let i = 0; i < flagName.size(); i++) {
    const char = flagName.byte(i + 1)[0];
    hash = (hash * 31 + char) % 10000000;
  }
  return math.abs(hash);
}

// ============================================================================
// Kill Switches
// ============================================================================

/**
 * Disable a kill-switch (set to false).
 */
export function triggerKillSwitch(name: string): boolean {
  const definition = flagDefinitions.get(name);
  if (!definition?.isKillSwitch) {
    warn(`[FeatureFlags] "${name}" is not a kill-switch`);
    return false;
  }
  setFlagKilled(name, true);
  return true;
}

// ============================================================================
// Remote/Environment Overrides
// ============================================================================

/** @internal Used by `applyRemoteFeatureFlagSnapshot` — not part of the public API. */
export type RemoteBooleanFlagOverride = {
  enabled?: boolean;
  rolloutPercentage?: number;
  isKilled?: boolean;
  value?: FlagValue;
  /** Segments to apply for this flag */
  segments?: FlagSegment[];
  /** Schedule window for this flag */
  schedule?: FlagSchedule;
};

/** @internal Used by `applyRemoteFeatureFlagSnapshot` — not part of the public API. */
export type RemoteFeatureFlagSnapshot = {
  updatedAt?: number;
  flags: Record<string, RemoteBooleanFlagOverride>;
};

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return math.floor(value);
}

/** @internal */
export function setFlagEnabledOverride(name: string, enabled: boolean): void {
  const definition = flagDefinitions.get(name);
  const isBoolean = definition ? typeOf(definition.defaultValue as unknown) === "boolean" : false;
  if (!isBoolean) return;

  const oldValue = getFlagValue(name);
  flagEnabledOverrides.set(name, enabled);
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    recordHistory(name, newValue as FlagValue, oldValue as FlagValue | undefined, "local");
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

/** @internal */
export function clearFlagEnabledOverride(name: string): void {
  const oldValue = getFlagValue(name);
  flagEnabledOverrides.delete(name);
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    recordHistory(name, newValue as FlagValue, oldValue as FlagValue | undefined, "local");
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

/** @internal */
export function setFlagRolloutPercentageOverride(name: string, rolloutPercentage: number): void {
  const definition = flagDefinitions.get(name);
  const isBoolean = definition ? typeOf(definition.defaultValue as unknown) === "boolean" : false;
  if (!isBoolean) return;

  flagRolloutOverrides.set(name, clampPercentage(rolloutPercentage));
}

/** @internal */
export function clearFlagRolloutPercentageOverride(name: string): void {
  flagRolloutOverrides.delete(name);
}

/** @internal */
export function setFlagKilled(name: string, killed: boolean): void {
  const definition = flagDefinitions.get(name);
  const isBoolean = definition ? typeOf(definition.defaultValue as unknown) === "boolean" : false;
  if (!isBoolean) return;

  const oldValue = getFlagValue(name);
  if (killed) {
    killedFlags.add(name);
  } else {
    killedFlags.delete(name);
  }
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    recordHistory(name, newValue as FlagValue, oldValue as FlagValue | undefined, "kill-switch");
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

/**
 * Apply a remote snapshot (e.g. from the dashboard).
 */
export function applyRemoteFeatureFlagSnapshot(snapshot: RemoteFeatureFlagSnapshot): void {
  // Replace all remote-managed overrides.
  flagEnabledOverrides.clear();
  flagRolloutOverrides.clear();
  killedFlags.clear();
  flagSegmentOverrides.clear();
  flagScheduleOverrides.clear();

  for (const [key, override] of pairs(snapshot.flags)) {
    if (override.isKilled !== undefined) {
      setFlagKilled(key, override.isKilled);
    }

    if (override.enabled !== undefined) {
      setFlagEnabledOverride(key, override.enabled);
    }

    if (override.rolloutPercentage !== undefined) {
      setFlagRolloutPercentageOverride(key, override.rolloutPercentage);
    }

    if (override.segments !== undefined) {
      setFlagSegments(key, override.segments);
    }

    if (override.schedule !== undefined) {
      setFlagSchedule(key, override.schedule);
    }

    if (override.value !== undefined) {
      const oldValue = getFlagValue(key);
      flagOverrides.set(key, override.value);
      recordHistory(key, override.value, oldValue, "remote");
      notifyListeners(key, override.value, oldValue);
    }
  }
}

// ============================================================================
// Change Listeners
// ============================================================================

/**
 * Add a listener for flag changes.
 */
export function onFlagChange(listener: FlagChangeListener): () => void {
  changeListeners.push(listener);
  return () => {
    const index = changeListeners.indexOf(listener);
    if (index !== -1) {
      changeListeners.remove(index);
    }
  };
}

function notifyListeners(name: string, newValue: FlagValue, oldValue: FlagValue | undefined): void {
  for (const listener of changeListeners) {
    pcall(() => listener(name, newValue, oldValue));
  }
}
