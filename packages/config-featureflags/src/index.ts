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

  // Fall back to definition default
  const definition = flagDefinitions.get(name);
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

  // If no rollout percentage, use default value
  if (definition.rolloutPercentage === undefined) {
    return definition.defaultValue === true;
  }

  // Deterministic percentage check based on userId and flag name
  const bucket = hashUserFlag(userId, name) % 100;
  return bucket < definition.rolloutPercentage;
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
  setFlagValue(name, false);
  return true;
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
