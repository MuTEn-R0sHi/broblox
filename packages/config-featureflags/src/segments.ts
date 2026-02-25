/**
 * @rbx/config-featureflags — Segment & scheduling helpers
 */

import type { FlagSegment, FlagSchedule } from "./types";
import {
  flagDefinitions,
  flagSegmentOverrides,
  flagScheduleOverrides,
  userAttributes,
} from "./state";

// ============================================================================
// Segments
// ============================================================================

/**
 * Check whether a user matches at least one segment.
 */
export function matchesAnySegment(userId: number, segments: FlagSegment[]): boolean {
  for (const segment of segments) {
    if (matchesSegment(userId, segment)) return true;
  }
  return false;
}

function matchesSegment(userId: number, segment: FlagSegment): boolean {
  // Check explicit user-ID list
  if (segment.userIds !== undefined && segment.userIds.size() > 0) {
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
export function isWithinSchedule(name: string): boolean {
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
