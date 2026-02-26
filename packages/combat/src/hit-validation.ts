/**
 * Server-side hit validation.
 *
 * Validates client-reported hits to prevent cheating.
 * All validation is done server-side with bounded lag compensation.
 *
 * Security features:
 * - Independent server raycast
 * - Bounded lag compensation window
 * - Suspicious pattern detection
 * - Event emission for violations
 *
 * @note Uses roblox-ts compatible patterns for Luau compilation.
 */

import { Result, ok, PlayerId } from "@broblox/shared-types";
import { arrayRemoveAt } from "@broblox/core";
import type {
  HitIntent,
  HitValidationResult,
  HitValidationConfig,
  HitValidationFailure,
  Vector3Like,
  SuspiciousHitEvent,
  PositionProvider,
  RaycastProvider,
} from "./types";

// ============================================================================
// State
// ============================================================================

/** Default validation configuration */
const defaultConfig: HitValidationConfig = {
  maxLagMs: 200,
  maxRange: 1000,
  checkObstruction: true,
  logSuspicious: true,
};

/** Current configuration */
let currentConfig: HitValidationConfig = { ...defaultConfig };

/** Internal position cache (used when no external provider is set) */
const internalPositions = new Map<number, Vector3Like>();

/** Active position provider — defaults to internal cache */
let positionProvider: PositionProvider = (playerId) => internalPositions.get(playerId as number);

/**
 * Optional raycast provider for obstruction checks.
 * When undefined the obstruction check is skipped (fail-open).
 */
let raycastProvider: RaycastProvider | undefined = undefined;

/** Player invulnerability state */
const invulnerablePlayers = new Set<number>();

/** Suspicious hit counters for pattern detection */
const suspiciousHitCounts = new Map<number, number>();

/** Last hit timestamps for rate limiting */
const lastHitTimes = new Map<number, number>();

// ============================================================================
// Event Listeners
// ============================================================================

type EventListener<T> = (event: T) => void;

const suspiciousHitListeners: EventListener<SuspiciousHitEvent>[] = [];
const validHitListeners: EventListener<HitValidationResult>[] = [];

// ============================================================================
// Helper Functions (roblox-ts compatible)
// ============================================================================

/**
 * Calculate distance between two Vector3-like objects.
 */
function distance(a: Vector3Like, b: Vector3Like): number {
  const dx = b.X - a.X;
  const dy = b.Y - a.Y;
  const dz = b.Z - a.Z;
  return math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate dot product of two vectors.
 */
function dot(a: Vector3Like, b: Vector3Like): number {
  return a.X * b.X + a.Y * b.Y + a.Z * b.Z;
}

/**
 * Normalize a vector.
 */
function normalize(v: Vector3Like): Vector3Like {
  const len = math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);
  if (len === 0) return { X: 0, Y: 0, Z: 0 };
  return { X: v.X / len, Y: v.Y / len, Z: v.Z / len };
}

/**
 * Calculate vector from a to b.
 */
function subtract(a: Vector3Like, b: Vector3Like): Vector3Like {
  return { X: a.X - b.X, Y: a.Y - b.Y, Z: a.Z - b.Z };
}

/**
 * Check if a value is within a range.
 */
function _inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configure hit validation settings.
 */
export function configureHitValidation(config: Partial<HitValidationConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current validation configuration.
 */
export function getHitValidationConfig(): HitValidationConfig {
  return { ...currentConfig };
}

/**
 * Reset to default configuration.
 */
export function resetHitValidationConfig(): void {
  currentConfig = { ...defaultConfig };
}

// ============================================================================
// Position Provider
// ============================================================================

/**
 * Set a custom position provider for hit validation.
 *
 * When using `@broblox/movement`, wire positions through here to avoid
 * duplicate position tracking. See {@link PositionProvider} for an example.
 */
export function setPositionProvider(provider: PositionProvider): void {
  positionProvider = provider;
}

/**
 * Reset the position provider to the internal cache.
 */
export function resetPositionProvider(): void {
  positionProvider = (playerId) => internalPositions.get(playerId as number);
}

// ============================================================================
// Raycast Provider
// ============================================================================

/**
 * Set a raycast provider for server-side obstruction checks.
 *
 * When set, `validateHit` will invoke this provider after all geometry checks
 * pass (range, angle) and reject the hit as `"obstructed"` if the provider
 * returns `true`.  When not set the obstruction check is skipped (fail-open),
 * so the game still works without Roblox Workspace access (e.g. in tests).
 *
 * See {@link RaycastProvider} for an example using `Workspace:Raycast`.
 */
export function setRaycastProvider(provider: RaycastProvider): void {
  raycastProvider = provider;
}

/**
 * Remove the active raycast provider.  Obstruction checks will be skipped
 * until a new provider is registered.
 */
export function resetRaycastProvider(): void {
  raycastProvider = undefined;
}

// ============================================================================
// Player Position Management
// ============================================================================

/**
 * Update a player's position in the internal cache.
 * Has no effect when a custom position provider is set.
 * Call this frequently (e.g., every heartbeat) to maintain accuracy.
 */
export function updatePlayerPosition(playerId: PlayerId, position: Vector3Like): void {
  internalPositions.set(playerId as number, position);
}

/**
 * Get a player's position from the active provider.
 */
export function getPlayerPosition(playerId: PlayerId): Vector3Like | undefined {
  return positionProvider(playerId);
}

/**
 * Clear a player's position from the internal cache (e.g., on disconnect).
 */
export function clearPlayerPosition(playerId: PlayerId): void {
  internalPositions.delete(playerId as number);
}

// ============================================================================
// Invulnerability Management
// ============================================================================

/**
 * Set a player as invulnerable (e.g., during respawn).
 */
export function setInvulnerable(playerId: PlayerId, invulnerable: boolean): void {
  if (invulnerable) {
    invulnerablePlayers.add(playerId as number);
  } else {
    invulnerablePlayers.delete(playerId as number);
  }
}

/**
 * Check if a player is invulnerable.
 */
export function isInvulnerable(playerId: PlayerId): boolean {
  return invulnerablePlayers.has(playerId as number);
}

// ============================================================================
// Core Validation
// ============================================================================

/**
 * Validate a hit intent from a client.
 *
 * @param shooterId - Player who fired the shot
 * @param intent - Hit intent from client
 * @returns Validation result
 */
export function validateHit(shooterId: PlayerId, intent: HitIntent): Result<HitValidationResult> {
  const now = os.clock();
  const serverTimestamp = now;

  // Rate limit check
  const lastHit = lastHitTimes.get(shooterId as number) ?? 0;
  const minHitInterval = 0.05; // 50ms minimum between hits
  if (now - lastHit < minHitInterval) {
    return ok(createFailure("rate_limited", serverTimestamp, shooterId, intent));
  }
  lastHitTimes.set(shooterId as number, now);

  // Lag compensation check
  const clientLag = (now - intent.clientTimestamp) * 1000; // Convert to ms
  if (clientLag < 0 || clientLag > currentConfig.maxLagMs) {
    return ok(createFailure("lag_too_high", serverTimestamp, shooterId, intent));
  }

  // Range check
  const maxDistance = intent.maxDistance ?? currentConfig.maxRange;
  if (maxDistance > currentConfig.maxRange) {
    // Client claiming longer range than allowed
    return ok(createFailure("out_of_range", serverTimestamp, shooterId, intent));
  }

  // If no target specified, we can't validate a hit
  if (intent.targetId === undefined) {
    return ok(createFailure("no_target", serverTimestamp, shooterId, intent));
  }

  // Get target position
  const targetPosition = positionProvider(intent.targetId);
  if (!targetPosition) {
    return ok(createFailure("target_not_found", serverTimestamp, shooterId, intent));
  }

  // Check invulnerability
  if (invulnerablePlayers.has(intent.targetId as number)) {
    return ok(createFailure("target_invulnerable", serverTimestamp, shooterId, intent));
  }

  // Calculate distance to target
  const dist = distance(intent.origin, targetPosition);
  if (dist > maxDistance) {
    return ok(createFailure("out_of_range", serverTimestamp, shooterId, intent));
  }

  // Validate aim direction (basic angle check)
  // Skip angle check if target is at point-blank range (distance ~0)
  if (dist > 0.001) {
    const toTarget = normalize(subtract(targetPosition, intent.origin));
    const aimDirection = normalize(intent.direction);
    const dotProduct = dot(toTarget, aimDirection);

    // Require at least roughly pointing at target (within ~60 degrees)
    const minDot = 0.5; // cos(60°) ≈ 0.5
    if (dotProduct < minDot) {
      return ok(createFailure("impossible_angle", serverTimestamp, shooterId, intent));
    }
  }

  // Obstruction check — requires an injected raycast provider.
  // If no provider is set the check is skipped (fail-open) so the validator
  // works outside the Roblox runtime (tests, CI, etc.).
  if (currentConfig.checkObstruction && raycastProvider !== undefined) {
    const toTarget = subtract(targetPosition, intent.origin);
    const dirNorm = normalize(toTarget);
    const isBlocked = raycastProvider(intent.origin, dirNorm, dist);
    if (isBlocked) {
      // Obstruction is a server-side geometry rejection, not a cheat signal —
      // bypass createFailure so the suspicious-hit counter/event is not triggered.
      return ok({ valid: false, reason: "obstructed" as const, serverTimestamp });
    }
  }

  // Hit is valid
  const result: HitValidationResult = {
    valid: true,
    targetId: intent.targetId,
    hitPosition: targetPosition, // Simplified - actual hit point would require raycast
    hitDistance: dist,
    serverTimestamp,
  };

  // Emit valid hit event
  for (const listener of validHitListeners) {
    listener(result);
  }

  // Reset suspicious counter on valid hits
  suspiciousHitCounts.delete(shooterId as number);

  return ok(result);
}

/**
 * Check if a hit is within the lag compensation window.
 */
export function isInLagWindow(
  clientTimestamp: number,
  serverTimestamp: number,
  maxLagMs?: number
): boolean {
  const lag = (serverTimestamp - clientTimestamp) * 1000; // Convert to ms
  const maxLag = maxLagMs ?? currentConfig.maxLagMs;
  return lag >= 0 && lag <= maxLag;
}

// ============================================================================
// Suspicious Pattern Detection
// ============================================================================

/**
 * Get the suspicious hit count for a player.
 */
export function getSuspiciousHitCount(playerId: PlayerId): number {
  return suspiciousHitCounts.get(playerId as number) ?? 0;
}

/**
 * Reset suspicious hit counter for a player.
 */
export function resetSuspiciousHitCount(playerId: PlayerId): void {
  suspiciousHitCounts.delete(playerId as number);
}

// ============================================================================
// Internal Helpers
// ============================================================================

function createFailure(
  reason: HitValidationFailure,
  serverTimestamp: number,
  shooterId: PlayerId,
  intent: HitIntent
): HitValidationResult {
  // Track suspicious patterns
  if (currentConfig.logSuspicious) {
    const count = (suspiciousHitCounts.get(shooterId as number) ?? 0) + 1;
    suspiciousHitCounts.set(shooterId as number, count);

    // Emit suspicious hit event
    const event: SuspiciousHitEvent = {
      playerId: shooterId,
      reason,
      intent,
      timestamp: serverTimestamp,
    };
    for (const listener of suspiciousHitListeners) {
      listener(event);
    }
  }

  return {
    valid: false,
    reason,
    serverTimestamp,
  };
}

// ============================================================================
// Event Subscriptions
// ============================================================================

/**
 * Register a listener for suspicious hit events.
 */
export function onSuspiciousHit(listener: EventListener<SuspiciousHitEvent>): () => void {
  suspiciousHitListeners.push(listener);
  return () => {
    const index = suspiciousHitListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(suspiciousHitListeners, index);
  };
}

/**
 * Register a listener for valid hit events.
 */
export function onValidHit(listener: EventListener<HitValidationResult>): () => void {
  validHitListeners.push(listener);
  return () => {
    const index = validHitListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(validHitListeners, index);
  };
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Clear all hit validation state. For testing only.
 */
export function resetHitValidation(): void {
  internalPositions.clear();
  positionProvider = (playerId) => internalPositions.get(playerId as number);
  raycastProvider = undefined;
  invulnerablePlayers.clear();
  suspiciousHitCounts.clear();
  lastHitTimes.clear();
  currentConfig = { ...defaultConfig };
}
