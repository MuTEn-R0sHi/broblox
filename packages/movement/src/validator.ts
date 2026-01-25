/**
 * Server-Authoritative Movement Validator
 *
 * Validates player movement inputs against physics and configuration
 * to detect exploits like speed hacks, teleportation, and fly hacks.
 */

import { MovementConfig, MovementInput, MovementViolation, ValidationResult } from "./types";
import { DEFAULT_MOVEMENT_CONFIG, VALIDATION_THRESHOLDS, NETWORK_CONSTANTS } from "./constants";
import { PlayerMovementState } from "./state";

// ============================================================================
// Movement Validator
// ============================================================================

export class MovementValidator {
  private config: MovementConfig;
  private readonly violationThresholds: typeof VALIDATION_THRESHOLDS;

  constructor(config?: Partial<MovementConfig>) {
    this.config = {
      ...DEFAULT_MOVEMENT_CONFIG,
      abilities: config?.abilities ?? new Map(),
      ...config,
    };
    this.violationThresholds = VALIDATION_THRESHOLDS;
  }

  /**
   * Update validator configuration.
   */
  updateConfig(config: Partial<MovementConfig>): void {
    if (config.walkSpeed !== undefined) this.config.walkSpeed = config.walkSpeed;
    if (config.runSpeed !== undefined) this.config.runSpeed = config.runSpeed;
    if (config.jumpPower !== undefined) this.config.jumpPower = config.jumpPower;
    if (config.gravity !== undefined) this.config.gravity = config.gravity;
    if (config.maxPositionError !== undefined)
      this.config.maxPositionError = config.maxPositionError;
    if (config.allowFlying !== undefined) this.config.allowFlying = config.allowFlying;
    if (config.abilities !== undefined) this.config.abilities = config.abilities;
    if (config.onViolation !== undefined) this.config.onViolation = config.onViolation;
  }

  /**
   * Main validation method.
   * Returns validation result with any violations detected.
   */
  validate(input: MovementInput, state: PlayerMovementState, deltaTime: number): ValidationResult {
    const violations: MovementViolation[] = [];
    const currentState = state.getState();

    // Check for speed hacks
    const speedResult = this.checkSpeed(input, currentState);
    if (speedResult) violations.push(speedResult);

    // Check for teleportation
    const teleportResult = this.checkTeleport(input, currentState, deltaTime);
    if (teleportResult) violations.push(teleportResult);

    // Check for fly hacks
    const flyResult = this.checkFly(input, state);
    if (flyResult) violations.push(flyResult);

    // Check for invalid jump
    const jumpResult = this.checkJump(input, currentState);
    if (jumpResult) violations.push(jumpResult);

    // Check for sequence errors
    const sequenceResult = this.checkSequence(input, currentState);
    if (sequenceResult) violations.push(sequenceResult);

    // Determine if correction is needed
    const isValid = violations.size() === 0;
    const maxSeverity = this.getMaxSeverity(violations);
    const shouldCorrect = maxSeverity === "high" || violations.size() >= 2;

    return {
      isValid,
      violations,
      correctedPosition: shouldCorrect ? currentState.position : undefined,
      correctedVelocity: shouldCorrect ? currentState.velocity : undefined,
    };
  }

  /**
   * Check for speed hacks.
   */
  private checkSpeed(
    input: MovementInput,
    currentState: { position: Vector3; velocity: Vector3; isRunning: boolean }
  ): MovementViolation | undefined {
    const maxSpeed = currentState.isRunning ? this.config.runSpeed : this.config.walkSpeed;
    const allowedSpeed = maxSpeed * this.violationThresholds.speedTolerance;

    // Calculate horizontal speed (ignore Y for ground movement)
    const horizontalVelocity = new Vector3(input.velocity.X, 0, input.velocity.Z);
    const speed = horizontalVelocity.Magnitude;

    if (speed > allowedSpeed) {
      return {
        type: "speed_hack",
        severity: speed > allowedSpeed * 2 ? "high" : "medium",
        details: `Speed ${math.floor(speed)} exceeds max ${math.floor(allowedSpeed)}`,
        timestamp: os.clock(),
        position: input.position,
      };
    }

    return undefined;
  }

  /**
   * Check for teleportation.
   */
  private checkTeleport(
    input: MovementInput,
    currentState: { position: Vector3; velocity: Vector3 },
    deltaTime: number
  ): MovementViolation | undefined {
    // Calculate expected maximum distance based on velocity and time
    const expectedMaxDistance =
      currentState.velocity.Magnitude * deltaTime * this.violationThresholds.positionTolerance +
      NETWORK_CONSTANTS.maxPositionError;

    // Add minimum threshold to account for network conditions
    const minThreshold = this.violationThresholds.teleportDistanceMin;
    const threshold = math.max(expectedMaxDistance, minThreshold);

    // Calculate actual distance moved
    const distance = input.position.sub(currentState.position).Magnitude;

    if (distance > threshold) {
      let severity: "low" | "medium" | "high" = "low";
      if (distance > this.violationThresholds.teleportDistanceMax) {
        severity = "high";
      } else if (distance > threshold * 2) {
        severity = "medium";
      }

      return {
        type: "teleport",
        severity,
        details: `Moved ${math.floor(distance)} studs, max allowed ${math.floor(threshold)}`,
        timestamp: os.clock(),
        position: input.position,
      };
    }

    return undefined;
  }

  /**
   * Check for fly hacks.
   */
  private checkFly(
    input: MovementInput,
    state: PlayerMovementState
  ): MovementViolation | undefined {
    // Skip if flying is allowed
    if (this.config.allowFlying) return undefined;

    const currentState = state.getState();

    // Player claims to be grounded
    if (input.isGrounded) return undefined;

    // Check if in air too long without falling
    const airTime = state.getAirTime();
    const maxAirTime = this.violationThresholds.maxAirTime;

    if (airTime > maxAirTime && input.velocity.Y >= -1) {
      return {
        type: "fly_hack",
        severity: "high",
        details: `In air for ${string.format("%.1f", airTime)}s without falling`,
        timestamp: os.clock(),
        position: input.position,
      };
    }

    // Check for upward velocity without jumping
    if (input.velocity.Y > this.config.jumpPower * 0.5 && !currentState.isJumping) {
      return {
        type: "fly_hack",
        severity: "medium",
        details: `Upward velocity ${math.floor(input.velocity.Y)} without jump`,
        timestamp: os.clock(),
        position: input.position,
      };
    }

    return undefined;
  }

  /**
   * Check for invalid jump.
   */
  private checkJump(
    input: MovementInput,
    currentState: { isGrounded: boolean; isJumping: boolean }
  ): MovementViolation | undefined {
    // Can only start jumping from ground
    if (input.isJumping && !input.isGrounded && !currentState.isJumping) {
      // Allow if they just left ground (within tolerance)
      if (!currentState.isGrounded) {
        return {
          type: "invalid_jump",
          severity: "low",
          details: "Jump initiated while airborne",
          timestamp: os.clock(),
          position: input.position,
        };
      }
    }

    return undefined;
  }

  /**
   * Check sequence number consistency.
   */
  private checkSequence(
    input: MovementInput,
    currentState: { sequenceNumber: number }
  ): MovementViolation | undefined {
    const expectedSequence = currentState.sequenceNumber + 1;
    const sequenceDiff = math.abs(input.sequenceNumber - expectedSequence);

    // Allow some tolerance for packet reordering
    if (sequenceDiff > NETWORK_CONSTANTS.maxSequenceSkip) {
      return {
        type: "sequence_error",
        severity: "low",
        details: `Sequence ${input.sequenceNumber}, expected ~${expectedSequence}`,
        timestamp: os.clock(),
        position: input.position,
      };
    }

    return undefined;
  }

  /**
   * Get highest severity from violations.
   */
  private getMaxSeverity(violations: MovementViolation[]): "low" | "medium" | "high" | undefined {
    if (violations.size() === 0) return undefined;

    let maxSeverity: "low" | "medium" | "high" = "low";

    for (const v of violations) {
      if (v.severity === "high") {
        return "high";
      } else if (v.severity === "medium" && maxSeverity === "low") {
        maxSeverity = "medium";
      }
    }

    return maxSeverity;
  }

  /**
   * Predict expected position based on physics.
   */
  predictPosition(
    currentPosition: Vector3,
    velocity: Vector3,
    deltaTime: number,
    isGrounded: boolean
  ): Vector3 {
    const gravity = isGrounded ? 0 : this.config.gravity;
    const newVelocity = new Vector3(velocity.X, velocity.Y + gravity * deltaTime, velocity.Z);

    return currentPosition.add(newVelocity.mul(deltaTime));
  }

  /**
   * Calculate maximum allowed speed for current state.
   */
  getMaxAllowedSpeed(isRunning: boolean, abilities?: string[]): number {
    let baseSpeed = isRunning ? this.config.runSpeed : this.config.walkSpeed;

    // Apply ability modifiers
    if (abilities) {
      for (const ability of abilities) {
        const abilityConfig = this.config.abilities.get(ability);
        if (abilityConfig?.speedModifier) {
          baseSpeed *= abilityConfig.speedModifier;
        }
      }
    }

    return baseSpeed * this.violationThresholds.speedTolerance;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let validatorInstance: MovementValidator | undefined;

export function getMovementValidator(config?: Partial<MovementConfig>): MovementValidator {
  if (!validatorInstance) {
    validatorInstance = new MovementValidator(config);
  } else if (config) {
    validatorInstance.updateConfig(config);
  }
  return validatorInstance;
}
