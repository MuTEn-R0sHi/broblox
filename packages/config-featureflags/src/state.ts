/**
 * @broblox/config-featureflags — Shared mutable state
 *
 * All module-level Maps/Sets live here so every sub-module reads/writes
 * the same singletons.
 */

import type {
  FlagDefinition,
  FlagValue,
  FlagSegment,
  FlagSchedule,
  FlagChangeListener,
  FlagChangeRecord,
} from "./types";

/** All registered flag definitions */
export const flagDefinitions = new Map<string, FlagDefinition>();

/** Current flag values (overrides defaults) */
export const flagOverrides = new Map<string, FlagValue>();

/** Enabled overrides for boolean flags (used for environment toggles) */
export const flagEnabledOverrides = new Map<string, boolean>();

/** Rollout overrides for boolean flags (0-100) */
export const flagRolloutOverrides = new Map<string, number>();

/** Kill-switch overrides (forces boolean flags off) */
export const killedFlags = new Set<string>();

/** Flag change listeners */
export const changeListeners: FlagChangeListener[] = [];

/** Segment overrides per flag */
export const flagSegmentOverrides = new Map<string, FlagSegment[]>();

/** Schedule overrides per flag */
export const flagScheduleOverrides = new Map<string, FlagSchedule>();

/** User attribute store for segment evaluation */
export const userAttributes = new Map<number, Map<string, string>>();

/** In-memory rollout history (capped) */
export const rolloutHistory: FlagChangeRecord[] = [];
export const MAX_HISTORY_SIZE = 500;
