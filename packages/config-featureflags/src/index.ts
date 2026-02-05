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
 */

// ============================================================================
// Types
// ============================================================================

export type FlagValue = boolean | number | string;

export interface FlagDefinition<T extends FlagValue = FlagValue> {
  /** Unique flag identifier */
  name: string;
  /** Default value when not overridden */
  defaultValue: T;
  /** Human-readable description */
  description: string;
  /** Flag category for organization */
  category: FlagCategory;
  /** Percentage of users who see this flag enabled (0-100). Only for boolean flags. */
  rolloutPercentage?: number;
  /** Whether this flag is a kill-switch (can disable features in emergencies) */
  isKillSwitch?: boolean;
}

export type FlagCategory =
  | "gameplay"
  | "networking"
  | "economy"
  | "ui"
  | "security"
  | "debug"
  | "experiment";

export type FlagChangeListener = (
  name: string,
  newValue: FlagValue,
  oldValue: FlagValue | undefined
) => void;

// ============================================================================
// Flag Registry
// ============================================================================

/** All registered flag definitions */
const flagDefinitions = new Map<string, FlagDefinition>();

/** Current flag values (overrides defaults) */
const flagOverrides = new Map<string, FlagValue>();

/** Enabled overrides for boolean flags (used for environment toggles) */
const flagEnabledOverrides = new Map<string, boolean>();

/** Rollout overrides for boolean flags (0-100) */
const flagRolloutOverrides = new Map<string, number>();

/** Kill-switch overrides (forces boolean flags off) */
const killedFlags = new Set<string>();

/** Flag change listeners */
const changeListeners: FlagChangeListener[] = [];

// ============================================================================
// Flag Definitions
// ============================================================================

/**
 * Register a flag definition.
 * Call this at module load time to define all flags.
 */
export function defineFlag<T extends FlagValue>(definition: FlagDefinition<T>): FlagDefinition<T> {
  if (flagDefinitions.has(definition.name)) {
    warn(`[FeatureFlags] Flag "${definition.name}" already defined, skipping duplicate`);
    return definition;
  }
  flagDefinitions.set(definition.name, definition);
  return definition;
}

/**
 * Get a flag definition by name.
 */
export function getFlagDefinition(name: string): FlagDefinition | undefined {
  return flagDefinitions.get(name);
}

/**
 * Get all registered flag definitions.
 */
export function getAllFlagDefinitions(): FlagDefinition[] {
  const definitions: FlagDefinition[] = [];
  flagDefinitions.forEach((def) => definitions.push(def));
  return definitions;
}

/**
 * Get all flags in a specific category.
 */
export function getFlagsByCategory(category: FlagCategory): FlagDefinition[] {
  const definitions: FlagDefinition[] = [];
  flagDefinitions.forEach((def) => {
    if (def.category === category) {
      definitions.push(def);
    }
  });
  return definitions;
}

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
}

// ============================================================================
// Boolean Flag Helpers
// ============================================================================

/**
 * Check if a boolean flag is enabled.
 */
export function isFlagEnabled(name: string): boolean {
  const value = getFlagValue<boolean>(name);
  return value === true;
}

/**
 * Check if a flag is enabled for a specific user based on rollout percentage.
 * Uses deterministic hashing for consistent results per user.
 *
 * @param name - Flag name
 * @param userId - User ID for deterministic bucketing
 */
export function isFlagEnabledForUser(name: string, userId: number): boolean {
  const definition = flagDefinitions.get(name);
  if (!definition) {
    return false;
  }

  // Check override first
  if (flagOverrides.has(name)) {
    return flagOverrides.get(name) === true;
  }

  if (typeOf(definition.defaultValue as unknown) !== "boolean") {
    return false;
  }

  if (killedFlags.has(name)) {
    return false;
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
 * Get all kill-switch flags.
 */
export function getKillSwitches(): FlagDefinition[] {
  const switches: FlagDefinition[] = [];
  flagDefinitions.forEach((def) => {
    if (def.isKillSwitch) {
      switches.push(def);
    }
  });
  return switches;
}

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

export type RemoteBooleanFlagOverride = {
  enabled?: boolean;
  rolloutPercentage?: number;
  isKilled?: boolean;
  value?: FlagValue;
};

export type RemoteFeatureFlagSnapshot = {
  updatedAt?: number;
  flags: Record<string, RemoteBooleanFlagOverride>;
};

function clampPercentage(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return math.floor(value);
}

export function setFlagEnabledOverride(name: string, enabled: boolean): void {
  const definition = flagDefinitions.get(name);
  const isBoolean = definition ? typeOf(definition.defaultValue as unknown) === "boolean" : false;
  if (!isBoolean) return;

  const oldValue = getFlagValue(name);
  flagEnabledOverrides.set(name, enabled);
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

export function clearFlagEnabledOverride(name: string): void {
  const oldValue = getFlagValue(name);
  flagEnabledOverrides.delete(name);
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

export function setFlagRolloutPercentageOverride(name: string, rolloutPercentage: number): void {
  const definition = flagDefinitions.get(name);
  const isBoolean = definition ? typeOf(definition.defaultValue as unknown) === "boolean" : false;
  if (!isBoolean) return;

  flagRolloutOverrides.set(name, clampPercentage(rolloutPercentage));
}

export function clearFlagRolloutPercentageOverride(name: string): void {
  flagRolloutOverrides.delete(name);
}

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
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

/**
 * Apply a remote snapshot (e.g. from the dashboard). This will replace the
 * current enabled/rollout/kill overrides for the provided keys.
 */
export function applyRemoteFeatureFlagSnapshot(snapshot: RemoteFeatureFlagSnapshot): void {
  // Replace all remote-managed overrides.
  flagEnabledOverrides.clear();
  flagRolloutOverrides.clear();
  killedFlags.clear();

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

    if (override.value !== undefined) {
      setFlagValue(key, override.value);
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

// ============================================================================
// Default Platform Flags
// ============================================================================

// Gameplay flags
defineFlag({
  name: "doAction.enabled",
  defaultValue: true,
  description: "Enable the DoAction remote endpoint",
  category: "gameplay",
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
