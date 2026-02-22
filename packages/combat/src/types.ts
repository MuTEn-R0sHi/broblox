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

/**
 * Position provider function type.
 *
 * Override the default internal cache by supplying a provider that reads
 * from another source such as `@rbx/movement`'s `MovementStateManager`.
 *
 * @example
 * ```ts
 * import { MovementStateManager } from "@rbx/movement";
 * import { setPositionProvider } from "@rbx/combat";
 *
 * const manager = new MovementStateManager();
 * setPositionProvider((playerId) => {
 *   if (!manager.hasState(playerId as number)) return undefined;
 *   const pos = manager.getState(playerId as number).getState().position;
 *   return { X: pos.X, Y: pos.Y, Z: pos.Z };
 * });
 * ```
 */
export type PositionProvider = (playerId: PlayerId) => Vector3Like | undefined;

/**
 * Raycast provider for obstruction checking.
 *
 * Abstracts `Workspace:Raycast` so hit-validation logic stays testable outside
 * the Roblox runtime.  Injected via `setRaycastProvider`.
 *
 * @param origin    - Ray start point.
 * @param direction - Normalised ray direction.
 * @param magnitude - Distance to cast (metres).
 * @returns `true` when the ray hits a solid obstruction before reaching the
 *   target (i.e. the path is blocked); `false` when line-of-sight is clear.
 *
 * @example
 * ```ts
 * // Roblox runtime implementation
 * import { setRaycastProvider } from "@rbx/combat";
 * import { Workspace } from "@rbxts/services";
 *
 * const params = new RaycastParams();
 * params.FilterType = Enum.RaycastFilterType.Exclude;
 *
 * setRaycastProvider((origin, direction, magnitude) => {
 *   const result = Workspace.Raycast(
 *     new Vector3(origin.X, origin.Y, origin.Z),
 *     new Vector3(direction.X, direction.Y, direction.Z).mul(magnitude),
 *     params,
 *   );
 *   return result !== undefined;
 * });
 * ```
 */
export type RaycastProvider = (
  origin: Vector3Like,
  direction: Vector3Like,
  magnitude: number
) => boolean;

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
