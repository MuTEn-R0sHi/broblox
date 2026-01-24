/**
 * Validation-related constants.
 * Used for payload and input validation.
 */

import { ACTION_ID_MAX_LENGTH, ACTION_ID_MIN_LENGTH, TIMESTAMP_TOLERANCE_MS } from "./limits";

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a string is within valid length bounds.
 */
export function isValidStringLength(value: string, minLength: number, maxLength: number): boolean {
  const len = value.size();
  return len >= minLength && len <= maxLength;
}

/**
 * Check if a number is within valid bounds.
 */
export function isValidNumberRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Check if an action ID is valid.
 */
export function isValidActionId(actionId: string): boolean {
  return isValidStringLength(actionId, ACTION_ID_MIN_LENGTH, ACTION_ID_MAX_LENGTH);
}

/**
 * Check if a timestamp is within acceptable range of current time.
 * @param timestamp - Unix timestamp in milliseconds
 * @param nowMs - Current time in milliseconds (os.clock() * 1000)
 */
export function isValidTimestamp(timestamp: number, nowMs: number): boolean {
  if (timestamp < 0) return false;
  const drift = math.abs(timestamp - nowMs);
  return drift <= TIMESTAMP_TOLERANCE_MS;
}

/**
 * Clamp a number to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  return math.max(min, math.min(max, value));
}

// ============================================================================
// Device Classes
// ============================================================================

/** Valid device class values */
export const VALID_DEVICE_CLASSES = ["kbm", "gamepad", "touch"] as const;
export type DeviceClass = (typeof VALID_DEVICE_CLASSES)[number];

/**
 * Check if a value is a valid device class.
 */
export function isValidDeviceClass(value: unknown): value is DeviceClass {
  return (
    typeOf(value) === "string" && (value === "kbm" || value === "gamepad" || value === "touch")
  );
}
