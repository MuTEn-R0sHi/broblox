/**
 * Violation Detectors
 *
 * Server-side checks for suspicious player behavior.
 */

import { createLogger } from "@broblox/core";
import {
  ANTICHEAT_MAX_SPEED_STUDS_PER_SEC,
  ANTICHEAT_SPEED_CHECK_INTERVAL_SEC,
  ANTICHEAT_MAX_TELEPORT_DISTANCE_STUDS,
} from "@broblox/constants";
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
    const [ok, err] = pcall(() => handler(violation));
    if (!ok) {
      logger.warn(`Violation handler threw: ${tostring(err)}`);
    }
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
  isAerial: boolean;
}

const speedStates = new Map<number, SpeedCheckState>();

/** Aerial speed multiplier — players in the air are allowed more speed. */
const AERIAL_SPEED_MULTIPLIER = 1.5;

/**
 * Check if player is moving too fast.
 * Call this periodically (e.g., Heartbeat).
 * @param isAerial - Set to true if the player's Humanoid.FloorMaterial is Air/nil.
 */
export function checkSpeed(player: Player, currentPosition: Vector3, isAerial = false): void {
  let state = speedStates.get(player.UserId);
  const now = os.clock();

  if (!state) {
    state = { lastCheck: now, violations: 0, isAerial };
    speedStates.set(player.UserId, state);
  }
  state.isAerial = isAerial;

  const elapsed = now - state.lastCheck;
  if (elapsed < ANTICHEAT_SPEED_CHECK_INTERVAL_SEC) {
    return;
  }

  if (state.lastPosition) {
    const distance = currentPosition.sub(state.lastPosition).Magnitude;
    const speed = distance / elapsed;

    const maxSpeed = state.isAerial
      ? ANTICHEAT_MAX_SPEED_STUDS_PER_SEC * AERIAL_SPEED_MULTIPLIER
      : ANTICHEAT_MAX_SPEED_STUDS_PER_SEC;

    if (speed > maxSpeed) {
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

/** Per-player teleport suppression — playerId → expiry timestamp (os.clock()). */
const teleportSuppressions = new Map<number, number>();

/**
 * Suppress teleport detection for a player for a given duration.
 * Call before any server-initiated teleport (respawn, zipline, etc.).
 */
export function suppressTeleportCheck(player: Player, durationSeconds = 1): void {
  teleportSuppressions.set(player.UserId, os.clock() + durationSeconds);
}

/**
 * Check for unexpected teleportation.
 * Returns true if teleport was suspicious.
 */
export function checkTeleport(player: Player, oldPosition: Vector3, newPosition: Vector3): boolean {
  // Honor suppression window
  const suppressUntil = teleportSuppressions.get(player.UserId);
  if (suppressUntil !== undefined && os.clock() < suppressUntil) {
    return false;
  }

  const distance = newPosition.sub(oldPosition).Magnitude;

  if (distance > ANTICHEAT_MAX_TELEPORT_DISTANCE_STUDS) {
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
  teleportSuppressions.delete(player.UserId);

  // Clean up rate states
  rateStates.forEach((actionStates) => {
    actionStates.delete(player.UserId);
  });
}
