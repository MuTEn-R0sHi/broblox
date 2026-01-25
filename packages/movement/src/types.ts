/**
 * Movement Types
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface MovementConfig {
  /** Maximum walking speed (studs/second) */
  walkSpeed: number;
  /** Maximum running speed (studs/second) */
  runSpeed: number;
  /** Jump power */
  jumpPower: number;
  /** Gravity (negative, studs/second²) */
  gravity: number;
  /** Maximum allowed position error before correction (studs) */
  maxPositionError: number;
  /** Allow flying (for specific game modes) */
  allowFlying: boolean;
  /** Custom abilities that modify movement */
  abilities: Map<string, MovementAbility>;
  /** Callback when movement violation detected */
  onViolation?: (player: Player, violation: MovementViolation) => void;
}

// ============================================================================
// State Types
// ============================================================================

export interface MovementState {
  /** Current position */
  position: Vector3;
  /** Current velocity */
  velocity: Vector3;
  /** Is player on the ground */
  isGrounded: boolean;
  /** Is player jumping */
  isJumping: boolean;
  /** Is player falling */
  isFalling: boolean;
  /** Is player running (sprint) */
  isRunning: boolean;
  /** Last validated timestamp */
  lastValidatedAt: number;
  /** Sequence number for reconciliation */
  sequenceNumber: number;
}

export interface MovementInput {
  /** Client position */
  position: Vector3;
  /** Client velocity */
  velocity: Vector3;
  /** Is player on the ground */
  isGrounded: boolean;
  /** Is player jumping */
  isJumping: boolean;
  /** Is player running (sprint) */
  isRunning: boolean;
  /** Client timestamp */
  timestamp: number;
  /** Input sequence number */
  sequenceNumber: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export type MovementViolationType =
  | "speed_hack"
  | "teleport"
  | "fly_hack"
  | "invalid_jump"
  | "sequence_error"
  | "noclip";

export type MovementViolationSeverity = "low" | "medium" | "high";

export interface MovementViolation {
  type: MovementViolationType;
  severity: MovementViolationSeverity;
  details: string;
  position: Vector3;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  violations: MovementViolation[];
  correctedPosition?: Vector3;
  correctedVelocity?: Vector3;
}

// ============================================================================
// Ability Types
// ============================================================================

export interface MovementAbility {
  /** Name of the ability */
  name: string;
  /** Speed modifier (multiplier) during ability */
  speedModifier?: number;
  /** Duration of ability in seconds */
  duration?: number;
  /** Cooldown in seconds */
  cooldown: number;
  /** Allow flying during ability */
  allowFlying?: boolean;
}

export interface AbilityState {
  isActive: boolean;
  startedAt?: number;
  lastUsedAt?: number;
  abilityName?: string;
}

// ============================================================================
// Physics Types
// ============================================================================

export interface PhysicsParams {
  gravity: number;
  airResistance: number;
  groundFriction: number;
  terminalVelocity: number;
}
