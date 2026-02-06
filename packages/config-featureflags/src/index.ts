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
 */

// ============================================================================
// Types
// ============================================================================

export type FlagValue = boolean | number | string;

/**
 * A segment targets a subset of users by user-ID list and/or an attribute
 * predicate. When segments are attached to a flag override, the override
 * only applies to users who match at least one segment.
 */
export interface FlagSegment {
  /** Human-readable segment name */
  name: string;
  /** Explicitly included user IDs */
  userIds?: number[];
  /** An attribute key/value pair the user must match (e.g. { key: "locale", value: "en" }) */
  attribute?: { key: string; value: string };
}

/**
 * A time window during which a flag override is active.
 * Both fields are Unix timestamps (seconds).
 */
export interface FlagSchedule {
  /** Override becomes active at this time (inclusive) */
  startTime?: number;
  /** Override expires at this time (exclusive) */
  endTime?: number;
}

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
  /** Optional segments for targeted rollout */
  segments?: FlagSegment[];
  /** Optional schedule for time-based activation */
  schedule?: FlagSchedule;
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

/**
 * A single entry in the rollout history audit log.
 */
export interface FlagChangeRecord {
  /** Flag that changed */
  flagName: string;
  /** Value after the change */
  newValue: FlagValue;
  /** Value before the change (undefined if first set) */
  oldValue: FlagValue | undefined;
  /** Source of the change */
  source: "local" | "remote" | "kill-switch" | "schedule";
  /** Unix timestamp (seconds) of the change */
  timestamp: number;
}

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

/** Segment overrides per flag */
const flagSegmentOverrides = new Map<string, FlagSegment[]>();

/** Schedule overrides per flag */
const flagScheduleOverrides = new Map<string, FlagSchedule>();

/** User attribute store for segment evaluation */
const userAttributes = new Map<number, Map<string, string>>();

/** In-memory rollout history (capped) */
const rolloutHistory: FlagChangeRecord[] = [];
const MAX_HISTORY_SIZE = 500;

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
 *
 * @param name - Flag name
 * @param userId - User ID for deterministic bucketing
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
  if (segments !== undefined && segments.length > 0) {
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
  for (let i = 0; i < flagName.length; i++) {
    // charCodeAt works in both Node and roblox-ts
    const char = flagName.charCodeAt(i);
    hash = (hash * 31 + char) % 10000000;
  }
  return math.abs(hash);
}

// ============================================================================
// Segments
// ============================================================================

/**
 * Check whether a user matches at least one segment.
 */
function matchesAnySegment(userId: number, segments: FlagSegment[]): boolean {
  for (const segment of segments) {
    if (matchesSegment(userId, segment)) return true;
  }
  return false;
}

function matchesSegment(userId: number, segment: FlagSegment): boolean {
  // Check explicit user-ID list
  if (segment.userIds !== undefined && segment.userIds.length > 0) {
    for (const id of segment.userIds) {
      if (id === userId) return true;
    }
  }

  // Check attribute predicate
  if (segment.attribute !== undefined) {
    const attrs = userAttributes.get(userId);
    if (attrs) {
      const val = attrs.get(segment.attribute.key);
      if (val === segment.attribute.value) return true;
    }
  }

  return false;
}

/**
 * Set a user attribute used for segment evaluation.
 */
export function setUserAttribute(userId: number, key: string, value: string): void {
  let attrs = userAttributes.get(userId);
  if (!attrs) {
    attrs = new Map<string, string>();
    userAttributes.set(userId, attrs);
  }
  attrs.set(key, value);
}

/**
 * Get a user attribute.
 */
export function getUserAttribute(userId: number, key: string): string | undefined {
  return userAttributes.get(userId)?.get(key);
}

/**
 * Clear all attributes for a user (e.g. on disconnect).
 */
export function clearUserAttributes(userId: number): void {
  userAttributes.delete(userId);
}

/**
 * Set segment overrides for a flag.
 */
export function setFlagSegments(name: string, segments: FlagSegment[]): void {
  flagSegmentOverrides.set(name, segments);
}

/**
 * Clear segment overrides for a flag.
 */
export function clearFlagSegments(name: string): void {
  flagSegmentOverrides.delete(name);
}

// ============================================================================
// Scheduling
// ============================================================================

/**
 * Check whether we are within the schedule window for a flag.
 * If no schedule is defined this returns true (always active).
 */
function isWithinSchedule(name: string): boolean {
  const schedule = flagScheduleOverrides.get(name) ?? flagDefinitions.get(name)?.schedule;
  if (!schedule) return true;

  const now = os.clock !== undefined ? os.clock() : os.time();
  if (schedule.startTime !== undefined && now < schedule.startTime) return false;
  if (schedule.endTime !== undefined && now >= schedule.endTime) return false;
  return true;
}

/**
 * Set a schedule override for a flag.
 */
export function setFlagSchedule(name: string, schedule: FlagSchedule): void {
  flagScheduleOverrides.set(name, schedule);
}

/**
 * Clear a schedule override.
 */
export function clearFlagSchedule(name: string): void {
  flagScheduleOverrides.delete(name);
}

// ============================================================================
// Rollout History
// ============================================================================

function recordHistory(
  flagName: string,
  newValue: FlagValue,
  oldValue: FlagValue | undefined,
  source: FlagChangeRecord["source"]
): void {
  const record: FlagChangeRecord = {
    flagName,
    newValue,
    oldValue,
    source,
    timestamp: os.clock !== undefined ? os.clock() : os.time(),
  };
  rolloutHistory.push(record);
  // Cap history length
  while (rolloutHistory.length > MAX_HISTORY_SIZE) {
    rolloutHistory.shift();
  }
}

/**
 * Get the full rollout history (oldest-first).
 */
export function getRolloutHistory(): FlagChangeRecord[] {
  return [...rolloutHistory];
}

/**
 * Get history for a specific flag.
 */
export function getFlagHistory(name: string): FlagChangeRecord[] {
  const result: FlagChangeRecord[] = [];
  for (const record of rolloutHistory) {
    if (record.flagName === name) {
      result.push(record);
    }
  }
  return result;
}

/**
 * Clear rollout history.
 */
export function clearRolloutHistory(): void {
  rolloutHistory.length = 0;
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
  /** Segments to apply for this flag */
  segments?: FlagSegment[];
  /** Schedule window for this flag */
  schedule?: FlagSchedule;
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
    recordHistory(name, newValue as FlagValue, oldValue as FlagValue | undefined, "local");
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

export function clearFlagEnabledOverride(name: string): void {
  const oldValue = getFlagValue(name);
  flagEnabledOverrides.delete(name);
  const newValue = getFlagValue(name);
  if (oldValue !== newValue) {
    recordHistory(name, newValue as FlagValue, oldValue as FlagValue | undefined, "local");
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
    recordHistory(name, newValue as FlagValue, oldValue as FlagValue | undefined, "kill-switch");
    notifyListeners(name, newValue as FlagValue, oldValue as FlagValue | undefined);
  }
}

/**
 * Apply a remote snapshot (e.g. from the dashboard). This will replace the
 * current enabled/rollout/kill/segment/schedule overrides for the provided keys.
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
      changeListeners.splice(index, 1);
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
