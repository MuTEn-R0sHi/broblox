/**
 * Violation Detectors
 *
 * Server-side checks for suspicious player behavior.
 */

import { createLogger } from "@rbx/core";
import { Violation, ViolationCategory, ViolationSeverity, ViolationHandler } from "./types";

const logger = createLogger("Security.Detectors");

// ============================================================================
// Detector Registry
// ============================================================================

/** Registered violation handlers */
const handlers: ViolationHandler[] = [];

/**
 * Register a violation handler.
 * Called whenever a violation is detected.
 */
export function onViolation(handler: ViolationHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.remove(index);
    }
  };
}

/**
 * Report a violation (used by detectors).
 */
export function reportViolation(
  player: Player,
  category: ViolationCategory,
  severity: ViolationSeverity,
  description: string,
  context?: Record<string, unknown>
): Violation {
  const violation: Violation = {
    player,
    category,
    severity,
    description,
    context,
    timestamp: os.time(),
  };

  logger.warn(`[${severity.upper()}] ${player.Name}: ${description} (${category})`);

  // Notify all handlers
  for (const handler of handlers) {
    pcall(() => handler(violation));
  }

  return violation;
}

// ============================================================================
// Speed Detector
// ============================================================================

interface SpeedCheckState {
  lastPosition?: Vector3;
  lastCheck: number;
  violations: number;
}

const speedStates = new Map<number, SpeedCheckState>();

/** Maximum speed in studs/second before triggering */
const MAX_SPEED_STUDS_PER_SEC = 100;

/** Minimum time between checks (seconds) */
const SPEED_CHECK_INTERVAL = 0.5;

/**
 * Check if player is moving too fast.
 * Call this periodically (e.g., Heartbeat).
 */
export function checkSpeed(player: Player, currentPosition: Vector3): void {
  let state = speedStates.get(player.UserId);
  const now = os.clock();

  if (!state) {
    state = { lastCheck: now, violations: 0 };
    speedStates.set(player.UserId, state);
  }

  const elapsed = now - state.lastCheck;
  if (elapsed < SPEED_CHECK_INTERVAL) {
    return;
  }

  if (state.lastPosition) {
    const distance = currentPosition.sub(state.lastPosition).Magnitude;
    const speed = distance / elapsed;

    if (speed > MAX_SPEED_STUDS_PER_SEC) {
      state.violations += 1;
      const severity: ViolationSeverity = state.violations >= 3 ? "high" : "medium";

      reportViolation(player, "speed", severity, `Speed: ${math.floor(speed)} studs/s`, {
        speed,
        distance,
        elapsed,
        violations: state.violations,
      });
    }
  }

  state.lastPosition = currentPosition;
  state.lastCheck = now;
}

/**
 * Reset speed check state for player (e.g., on teleport).
 */
export function resetSpeedCheck(player: Player): void {
  speedStates.delete(player.UserId);
}

// ============================================================================
// Teleport Detector
// ============================================================================

/** Maximum allowed position delta in a single frame */
const MAX_TELEPORT_DISTANCE = 200;

/**
 * Check for unexpected teleportation.
 * Returns true if teleport was suspicious.
 */
export function checkTeleport(
  player: Player,
  oldPosition: Vector3,
  newPosition: Vector3,
  allowedTeleport = false
): boolean {
  if (allowedTeleport) {
    return false;
  }

  const distance = newPosition.sub(oldPosition).Magnitude;

  if (distance > MAX_TELEPORT_DISTANCE) {
    reportViolation(
      player,
      "teleport",
      "high",
      `Unexpected teleport: ${math.floor(distance)} studs`,
      {
        from: { x: oldPosition.X, y: oldPosition.Y, z: oldPosition.Z },
        to: { x: newPosition.X, y: newPosition.Y, z: newPosition.Z },
        distance,
      }
    );
    return true;
  }

  return false;
}

// ============================================================================
// Invalid Data Detector
// ============================================================================

/**
 * Report invalid data from client.
 */
export function reportInvalidData(
  player: Player,
  field: string,
  expectedType: string,
  actualValue: unknown
): void {
  reportViolation(player, "invalid-data", "medium", `Invalid ${field}: expected ${expectedType}`, {
    field,
    expectedType,
    actualType: typeOf(actualValue),
    actualValue: tostring(actualValue),
  });
}

// ============================================================================
// Rate Abuse Detector
// ============================================================================

interface RateState {
  count: number;
  windowStart: number;
}

const rateStates = new Map<string, Map<number, RateState>>();

/**
 * Check for rate abuse on a specific action.
 * Returns true if rate limit is exceeded.
 */
export function checkRateAbuse(player: Player, actionKey: string, maxPerMinute: number): boolean {
  const key = actionKey;
  let actionStates = rateStates.get(key);

  if (!actionStates) {
    actionStates = new Map();
    rateStates.set(key, actionStates);
  }

  const now = os.time();
  let state = actionStates.get(player.UserId);

  if (!state || now - state.windowStart > 60) {
    state = { count: 0, windowStart: now };
    actionStates.set(player.UserId, state);
  }

  state.count += 1;

  if (state.count > maxPerMinute) {
    reportViolation(player, "rate-abuse", "medium", `Rate abuse on ${actionKey}`, {
      action: actionKey,
      count: state.count,
      limit: maxPerMinute,
    });
    return true;
  }

  return false;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up detector state for a player (call on leave).
 */
export function cleanupPlayer(player: Player): void {
  speedStates.delete(player.UserId);

  // Clean up rate states
  rateStates.forEach((actionStates) => {
    actionStates.delete(player.UserId);
  });
}
