/**
 * @broblox/movement
 *
 * Server-authoritative movement system for Roblox games.
 * Provides:
 * - Server-side movement validation
 * - Client-side prediction and reconciliation
 * - Anomaly detection (speed hacks, teleports, flying)
 * - Integration with @broblox/security
 */

// Types
export type {
  MovementConfig,
  MovementState,
  MovementInput,
  MovementViolation,
  ValidationResult,
  ValidationThresholds,
  MovementAbility,
  PhysicsParams,
  AbilityState,
} from "./types";

// Constants
export {
  DEFAULT_MOVEMENT_CONFIG,
  DEFAULT_PHYSICS,
  VALIDATION_THRESHOLDS,
  NETWORK_CONSTANTS,
} from "./constants";

// State management
export { PlayerMovementState, MovementStateManager } from "./state";

// Validator
export { MovementValidator, getMovementValidator } from "./validator";

// Service factory
export { createMovementValidationService } from "./create-movement-validation-service";
export type {
  MovementValidationConfig,
  MovementValidationHandle,
} from "./create-movement-validation-service";
