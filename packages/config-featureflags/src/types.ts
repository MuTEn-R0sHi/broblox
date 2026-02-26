/**
 * @broblox/config-featureflags — Type definitions
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
