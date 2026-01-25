/**
 * Movement Constants
 */

import { MovementConfig, PhysicsParams } from "./types";

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  walkSpeed: 16,
  runSpeed: 24,
  jumpPower: 50,
  gravity: -196.2, // Negative for downward force
  maxPositionError: 5,
  allowFlying: false,
  abilities: new Map(),
  onViolation: undefined,
};

// ============================================================================
// Physics Constants
// ============================================================================

export const DEFAULT_PHYSICS: PhysicsParams = {
  gravity: -196.2, // Roblox default workspace gravity
  airResistance: 0.02,
  groundFriction: 0.3,
  terminalVelocity: 200,
};

// ============================================================================
// Validation Thresholds
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  /** Multiplier for max speed before flagging (accounts for lag) */
  speedTolerance: 1.5,
  /** Minimum distance for teleport detection (studs) */
  teleportDistanceMin: 20,
  /** Maximum distance that's still correctable (studs) */
  teleportDistanceMax: 100,
  /** Position error tolerance multiplier */
  positionTolerance: 1.2,
  /** Maximum air time before fly flag (seconds) */
  maxAirTime: 3,
  /** Minimum ground contact time to reset air timer (seconds) */
  groundResetTime: 0.1,
  /** Maximum consecutive violations before escalation */
  violationEscalationThreshold: 3,
  /** Time window for violation counting (seconds) */
  violationWindow: 10,
};

// ============================================================================
// Network Constants
// ============================================================================

export const NETWORK_CONSTANTS = {
  /** Minimum time between movement updates (seconds) */
  minUpdateInterval: 0.05, // 20 updates/second
  /** Maximum queued inputs before dropping old ones */
  maxInputQueue: 60,
  /** Client prediction buffer size */
  predictionBufferSize: 128,
  /** Maximum position error from network jitter (studs) */
  maxPositionError: 3,
  /** Maximum sequence number skip before flagging */
  maxSequenceSkip: 5,
};
