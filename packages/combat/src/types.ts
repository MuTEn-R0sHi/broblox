/**
 * Combat system type definitions.
 */

import { PlayerId } from "@rbx/shared-types";

// ============================================================================
// Cooldown Types
// ============================================================================

/** Unique identifier for an ability */
export type AbilityId = string;

/** Configuration for a cooldown-based ability */
export interface CooldownConfig {
  /** Unique ability identifier */
  abilityId: AbilityId;
  /** Cooldown duration in seconds */
  durationSeconds: number;
  /** Number of charges (default: 1) */
  charges?: number;
  /** Time to recover one charge in seconds (default: durationSeconds) */
  chargeRecoverySeconds?: number;
  /** Whether the cooldown starts when all charges are consumed (default: false) */
  sharedCooldown?: boolean;
}

/** Current state of a cooldown for a player */
export interface CooldownState {
  /** Ability this state is for */
  abilityId: AbilityId;
  /** Current number of available charges */
  charges: number;
  /** Maximum charges for this ability */
  maxCharges: number;
  /** Timestamp when the next charge will be ready (os.clock()) */
  nextChargeAt: number;
  /** Timestamp when the cooldown started */
  startedAt: number;
}

/** Result of attempting to use an ability */
export interface UseAbilityResult {
  /** Whether the ability was successfully used */
  allowed: boolean;
  /** Remaining charges after use (if allowed) */
  remainingCharges?: number;
  /** Time until ability is ready (if not allowed) */
  cooldownRemaining?: number;
  /** Reason for rejection (if not allowed) */
  reason?: "on_cooldown" | "no_charges" | "unknown_ability";
}

// ============================================================================
// Hit Validation Types
// ============================================================================

/** 3D vector for positions and directions */
export interface Vector3Like {
  X: number;
  Y: number;
  Z: number;
}

/** Intent sent by client for hit validation */
export interface HitIntent {
  /** Origin point of the shot/attack */
  origin: Vector3Like;
  /** Direction of the shot/attack (normalized) */
  direction: Vector3Like;
  /** Client-side timestamp when shot was fired */
  clientTimestamp: number;
  /** Target player ID (if aiming at specific player) */
  targetId?: PlayerId;
  /** Weapon/ability used */
  weaponId?: string;
  /** Maximum range of the shot */
  maxDistance?: number;
}

/** Result of server-side hit validation */
export interface HitValidationResult {
  /** Whether the hit was valid */
  valid: boolean;
  /** Target that was hit (if valid) */
  targetId?: PlayerId;
  /** Position where the hit occurred */
  hitPosition?: Vector3Like;
  /** Distance from origin to hit */
  hitDistance?: number;
  /** Reason for validation failure (if invalid) */
  reason?: HitValidationFailure;
  /** Server timestamp of validation */
  serverTimestamp: number;
}

/** Reasons why a hit might be rejected */
export type HitValidationFailure =
  | "no_target"
  | "target_not_found"
  | "out_of_range"
  | "obstructed"
  | "lag_too_high"
  | "impossible_angle"
  | "rate_limited"
  | "target_invulnerable";

/** Configuration for hit validation */
export interface HitValidationConfig {
  /** Maximum allowed lag compensation in milliseconds */
  maxLagMs: number;
  /** Maximum distance for hits */
  maxRange: number;
  /** Whether to perform obstruction checks */
  checkObstruction: boolean;
  /** Whether to log suspicious patterns */
  logSuspicious: boolean;
}

// ============================================================================
// Events
// ============================================================================

/** Event emitted when a cooldown starts */
export interface CooldownStartedEvent {
  playerId: PlayerId;
  abilityId: AbilityId;
  durationSeconds: number;
  remainingCharges: number;
  timestamp: number;
}

/** Event emitted when a cooldown ends */
export interface CooldownEndedEvent {
  playerId: PlayerId;
  abilityId: AbilityId;
  charges: number;
  timestamp: number;
}

/** Event emitted when an ability use is rejected */
export interface AbilityRejectedEvent {
  playerId: PlayerId;
  abilityId: AbilityId;
  reason: "on_cooldown" | "no_charges" | "unknown_ability";
  cooldownRemaining?: number;
  timestamp: number;
}

/** Event emitted when hit validation fails suspiciously */
export interface SuspiciousHitEvent {
  playerId: PlayerId;
  reason: HitValidationFailure;
  intent: HitIntent;
  timestamp: number;
}
