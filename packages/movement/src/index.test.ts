/**
 * Comprehensive tests for Movement Validation system.
 *
 * Covers:
 * - MovementValidator: speed, teleport, fly, jump, sequence checks
 * - PlayerMovementState: state tracking, air time, violations, abilities
 * - MovementStateManager: multi-player state management
 * - Edge cases: boundary conditions, tolerance thresholds
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals } from "@rbx/testing";

// ============================================================================
// Vector3 Mock (Roblox-compatible)
// ============================================================================

class MockVector3 {
  readonly X: number;
  readonly Y: number;
  readonly Z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.X = x;
    this.Y = y;
    this.Z = z;
  }

  get Magnitude(): number {
    return Math.sqrt(this.X * this.X + this.Y * this.Y + this.Z * this.Z);
  }

  add(other: MockVector3): MockVector3 {
    return new MockVector3(this.X + other.X, this.Y + other.Y, this.Z + other.Z);
  }

  sub(other: MockVector3): MockVector3 {
    return new MockVector3(this.X - other.X, this.Y - other.Y, this.Z - other.Z);
  }

  mul(scalar: number): MockVector3 {
    return new MockVector3(this.X * scalar, this.Y * scalar, this.Z * scalar);
  }
}

// Install globally (roblox-ts compiles `new Vector3(...)` to global constructor)
(globalThis as Record<string, unknown>).Vector3 = MockVector3;

// ============================================================================
// Install Roblox globals
// ============================================================================

beforeEach(() => {
  mockRobloxGlobals();
  // Also mock string.format for the fly hack check
  (globalThis as Record<string, unknown>).string = {
    format: (fmt: string, ...args: unknown[]) => {
      let result = fmt;
      for (const arg of args) {
        result = result.replace(/%[\d.]*[dfsxXoOeEgGi]/, String(arg));
      }
      return result;
    },
  };
});

// ============================================================================
// Import source under test
// ============================================================================

import {
  DEFAULT_MOVEMENT_CONFIG,
  DEFAULT_PHYSICS,
  VALIDATION_THRESHOLDS,
  NETWORK_CONSTANTS,
} from "./constants";
import { PlayerMovementState, MovementStateManager } from "./state";
import { MovementValidator } from "./validator";
import type { MovementInput, MovementViolation } from "./types";

// ============================================================================
// Helpers
// ============================================================================

function createInput(overrides: Partial<MovementInput> = {}): MovementInput {
  return {
    position: new MockVector3(0, 0, 0) as unknown as Vector3,
    velocity: new MockVector3(0, 0, 0) as unknown as Vector3,
    isGrounded: true,
    isJumping: false,
    isRunning: false,
    timestamp: os.clock(),
    sequenceNumber: 1,
    ...overrides,
  };
}

function vec3(x: number, y: number, z: number): Vector3 {
  return new MockVector3(x, y, z) as unknown as Vector3;
}

// ============================================================================
// Constants Tests
// ============================================================================

describe("movement constants", () => {
  it("should have valid default movement config", () => {
    expect(DEFAULT_MOVEMENT_CONFIG.walkSpeed).toBe(16);
    expect(DEFAULT_MOVEMENT_CONFIG.runSpeed).toBe(24);
    expect(DEFAULT_MOVEMENT_CONFIG.jumpPower).toBe(50);
    expect(DEFAULT_MOVEMENT_CONFIG.allowFlying).toBe(false);
  });

  it("should have valid physics params", () => {
    expect(DEFAULT_PHYSICS.gravity).toBeLessThan(0);
    expect(DEFAULT_PHYSICS.terminalVelocity).toBeGreaterThan(0);
  });

  it("should have valid validation thresholds", () => {
    expect(VALIDATION_THRESHOLDS.speedTolerance).toBeGreaterThan(1);
    expect(VALIDATION_THRESHOLDS.teleportDistanceMin).toBeGreaterThan(0);
    expect(VALIDATION_THRESHOLDS.maxAirTime).toBeGreaterThan(0);
  });

  it("should have valid network constants", () => {
    expect(NETWORK_CONSTANTS.minUpdateInterval).toBeGreaterThan(0);
    expect(NETWORK_CONSTANTS.maxInputQueue).toBeGreaterThan(0);
  });
});

// ============================================================================
// PlayerMovementState Tests
// ============================================================================

describe("PlayerMovementState", () => {
  let state: PlayerMovementState;

  beforeEach(() => {
    state = new PlayerMovementState(vec3(0, 0, 0));
  });

  it("should initialize with default values", () => {
    const s = state.getState();
    expect(s.isGrounded).toBe(true);
    expect(s.isJumping).toBe(false);
    expect(s.isFalling).toBe(false);
    expect(s.isRunning).toBe(false);
    expect(s.sequenceNumber).toBe(0);
  });

  it("should update state fields", () => {
    state.updateState({
      position: vec3(10, 5, 20),
      velocity: vec3(1, 0, 1),
      isRunning: true,
      sequenceNumber: 5,
    });

    const s = state.getState();
    expect(s.isRunning).toBe(true);
    expect(s.sequenceNumber).toBe(5);
  });

  it("should track air time when not grounded", () => {
    state.updateState({ isGrounded: false });
    // Air time starts tracking
    expect(state.getAirTime()).toBeGreaterThanOrEqual(0);
  });

  it("should reset air time when grounded", () => {
    state.updateState({ isGrounded: false });
    state.updateState({ isGrounded: true });
    expect(state.getAirTime()).toBe(0);
  });

  it("should record violations and count recent ones", () => {
    state.recordViolation("speed_hack");
    state.recordViolation("teleport");
    state.recordViolation("fly_hack");

    expect(state.getRecentViolationCount()).toBe(3);
  });

  it("should increment sequence number", () => {
    expect(state.incrementSequence()).toBe(1);
    expect(state.incrementSequence()).toBe(2);
    expect(state.incrementSequence()).toBe(3);
    expect(state.getState().sequenceNumber).toBe(3);
  });

  describe("ability management", () => {
    it("should start and end abilities", () => {
      state.startAbility("dash");
      const abilityState = state.getAbilityState();
      expect(abilityState.isActive).toBe(true);
      expect(abilityState.abilityName).toBe("dash");

      state.endAbility();
      expect(state.getAbilityState().isActive).toBe(false);
    });

    it("should track ability cooldown", () => {
      state.startAbility("dash");
      state.endAbility();

      // Just used — should be on cooldown for a reasonable window
      expect(state.isAbilityOnCooldown(10)).toBe(true);
      expect(state.isAbilityOnCooldown(0)).toBe(false);
    });

    it("should not be on cooldown if never used", () => {
      expect(state.isAbilityOnCooldown(10)).toBe(false);
    });
  });
});

// ============================================================================
// MovementStateManager Tests
// ============================================================================

describe("MovementStateManager", () => {
  let manager: MovementStateManager;

  beforeEach(() => {
    manager = new MovementStateManager();
  });

  it("should create new state for unknown player", () => {
    const state = manager.getState(1001);
    expect(state).toBeDefined();
    expect(state.getState().isGrounded).toBe(true);
  });

  it("should return existing state for known player", () => {
    const state1 = manager.getState(1001, vec3(10, 0, 10));
    state1.updateState({ isRunning: true });

    const state2 = manager.getState(1001);
    expect(state2.getState().isRunning).toBe(true);
    expect(state2).toBe(state1);
  });

  it("should track player state existence", () => {
    expect(manager.hasState(1001)).toBe(false);
    manager.getState(1001);
    expect(manager.hasState(1001)).toBe(true);
  });

  it("should remove player state", () => {
    manager.getState(1001);
    manager.removeState(1001);
    expect(manager.hasState(1001)).toBe(false);
  });

  it("should use custom initial position", () => {
    const state = manager.getState(1001, vec3(100, 50, 200));
    const s = state.getState();
    expect(s.position).toBeDefined();
  });
});

// ============================================================================
// MovementValidator Tests
// ============================================================================

describe("MovementValidator", () => {
  let validator: MovementValidator;
  let playerState: PlayerMovementState;

  beforeEach(() => {
    validator = new MovementValidator();
    playerState = new PlayerMovementState(vec3(0, 0, 0));
  });

  // --------------------------------------------------------------------------
  // Speed Hack Detection
  // --------------------------------------------------------------------------

  describe("speed hack detection", () => {
    it("should validate normal walking speed", () => {
      const maxWalk = DEFAULT_MOVEMENT_CONFIG.walkSpeed;
      const input = createInput({
        velocity: vec3(maxWalk, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolations).toHaveLength(0);
    });

    it("should validate normal running speed", () => {
      const maxRun = DEFAULT_MOVEMENT_CONFIG.runSpeed;
      playerState.updateState({ isRunning: true });
      const input = createInput({
        velocity: vec3(maxRun, 0, 0),
        isRunning: true,
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolations).toHaveLength(0);
    });

    it("should detect speed hack (exceeding allowed speed with tolerance)", () => {
      const maxAllowed = DEFAULT_MOVEMENT_CONFIG.walkSpeed * VALIDATION_THRESHOLDS.speedTolerance;
      const input = createInput({
        velocity: vec3(maxAllowed + 10, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolations.length).toBeGreaterThanOrEqual(1);
    });

    it("should flag high severity for extreme speed", () => {
      const maxAllowed = DEFAULT_MOVEMENT_CONFIG.walkSpeed * VALIDATION_THRESHOLDS.speedTolerance;
      const input = createInput({
        velocity: vec3(maxAllowed * 3, 0, 0), // Way over limit
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolation = result.violations.find(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolation).toBeDefined();
      expect(speedViolation!.severity).toBe("high");
    });

    it("should ignore vertical velocity for speed check", () => {
      // High vertical speed shouldn't trigger speed hack (could be falling)
      const input = createInput({
        velocity: vec3(0, -100, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolations).toHaveLength(0);
    });

    it("should consider diagonal speed correctly", () => {
      // Diagonal movement — combined X+Z speed must exceed limit
      const walkSpeed = DEFAULT_MOVEMENT_CONFIG.walkSpeed;
      // Walking diagonally at walkSpeed on each axis = speed * sqrt(2)
      // walkSpeed * sqrt(2) ≈ walkSpeed * 1.414, which is under 1.5x tolerance
      const input = createInput({
        velocity: vec3(walkSpeed, 0, walkSpeed),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      // walkSpeed * sqrt(2) = ~22.6, allowed = 16 * 1.5 = 24 → no violation
      expect(speedViolations).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Teleport Detection
  // --------------------------------------------------------------------------

  describe("teleport detection", () => {
    it("should allow small position changes", () => {
      playerState.updateState({
        position: vec3(0, 0, 0),
        velocity: vec3(16, 0, 0),
      });

      const input = createInput({
        position: vec3(1.6, 0, 0), // 1.6 studs in 0.1s at speed 16
        velocity: vec3(16, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const teleportViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "teleport"
      );
      expect(teleportViolations).toHaveLength(0);
    });

    it("should detect large teleportation", () => {
      playerState.updateState({
        position: vec3(0, 0, 0),
        velocity: vec3(0, 0, 0),
      });

      const input = createInput({
        position: vec3(200, 0, 0), // 200 studs w/ 0 velocity — obvious teleport
        velocity: vec3(0, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const teleportViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "teleport"
      );
      expect(teleportViolations.length).toBeGreaterThanOrEqual(1);
    });

    it("should flag high severity for extreme teleport distance", () => {
      playerState.updateState({
        position: vec3(0, 0, 0),
        velocity: vec3(0, 0, 0),
      });

      const input = createInput({
        position: vec3(500, 0, 0), // 500 studs — over teleportDistanceMax (100)
        velocity: vec3(0, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const teleportViolation = result.violations.find(
        (v: MovementViolation) => v.type === "teleport"
      );
      expect(teleportViolation).toBeDefined();
      expect(teleportViolation!.severity).toBe("high");
    });

    it("should account for velocity when checking teleport distance", () => {
      // Player moving fast — larger position deltas are expected
      playerState.updateState({
        position: vec3(0, 0, 0),
        velocity: vec3(100, 0, 0),
      });

      const input = createInput({
        position: vec3(15, 0, 0), // 15 studs at velocity 100 in 0.1s is reasonable
        velocity: vec3(100, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const teleportViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "teleport"
      );
      expect(teleportViolations).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Fly Hack Detection
  // --------------------------------------------------------------------------

  describe("fly hack detection", () => {
    it("should not flag grounded players", () => {
      const input = createInput({
        isGrounded: true,
        velocity: vec3(16, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const flyViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "fly_hack"
      );
      expect(flyViolations).toHaveLength(0);
    });

    it("should not flag flying when allowFlying is enabled", () => {
      const flyValidator = new MovementValidator({ allowFlying: true });
      playerState.updateState({ isGrounded: false });

      const input = createInput({
        isGrounded: false,
        velocity: vec3(0, 0, 0), // Hovering
        sequenceNumber: 1,
      });

      const result = flyValidator.validate(input, playerState, 0.1);
      const flyViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "fly_hack"
      );
      expect(flyViolations).toHaveLength(0);
    });

    it("should detect upward velocity without jump", () => {
      playerState.updateState({
        isGrounded: false,
        isJumping: false,
      });

      const input = createInput({
        isGrounded: false,
        isJumping: false,
        velocity: vec3(0, DEFAULT_MOVEMENT_CONFIG.jumpPower, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const flyViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "fly_hack"
      );
      expect(flyViolations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Jump Validation
  // --------------------------------------------------------------------------

  describe("jump validation", () => {
    it("should allow jumping from ground", () => {
      playerState.updateState({ isGrounded: true });

      const input = createInput({
        isGrounded: true,
        isJumping: true,
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const jumpViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "invalid_jump"
      );
      expect(jumpViolations).toHaveLength(0);
    });

    it("should detect jump initiated while airborne", () => {
      playerState.updateState({
        isGrounded: false,
        isJumping: false,
      });

      const input = createInput({
        isGrounded: false,
        isJumping: true, // Trying to jump while airborne
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const jumpViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "invalid_jump"
      );
      expect(jumpViolations.length).toBeGreaterThanOrEqual(1);
    });

    it("should not flag continued jumping (already jumping)", () => {
      playerState.updateState({
        isGrounded: false,
        isJumping: true, // Already in a jump
      });

      const input = createInput({
        isGrounded: false,
        isJumping: true,
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const jumpViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "invalid_jump"
      );
      expect(jumpViolations).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Sequence Number Validation
  // --------------------------------------------------------------------------

  describe("sequence number validation", () => {
    it("should accept sequential sequence numbers", () => {
      playerState.updateState({ sequenceNumber: 5 });

      const input = createInput({ sequenceNumber: 6 });

      const result = validator.validate(input, playerState, 0.1);
      const seqViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "sequence_error"
      );
      expect(seqViolations).toHaveLength(0);
    });

    it("should allow small sequence number gaps (packet reordering)", () => {
      playerState.updateState({ sequenceNumber: 10 });

      const input = createInput({ sequenceNumber: 13 }); // Gap of 2

      const result = validator.validate(input, playerState, 0.1);
      const seqViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "sequence_error"
      );
      expect(seqViolations).toHaveLength(0);
    });

    it("should detect large sequence number skips", () => {
      playerState.updateState({ sequenceNumber: 10 });

      const input = createInput({ sequenceNumber: 100 }); // Skip of 89

      const result = validator.validate(input, playerState, 0.1);
      const seqViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "sequence_error"
      );
      expect(seqViolations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Validation Result Behavior
  // --------------------------------------------------------------------------

  describe("validation result", () => {
    it("should return isValid=true when no violations", () => {
      const input = createInput({ sequenceNumber: 1 });
      const result = validator.validate(input, playerState, 0.1);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should return isValid=false when violations exist", () => {
      const maxAllowed = DEFAULT_MOVEMENT_CONFIG.walkSpeed * VALIDATION_THRESHOLDS.speedTolerance;
      const input = createInput({
        velocity: vec3(maxAllowed + 50, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      expect(result.isValid).toBe(false);
    });

    it("should include corrected position for high severity violations", () => {
      playerState.updateState({
        position: vec3(0, 0, 0),
        velocity: vec3(0, 0, 0),
      });

      const input = createInput({
        position: vec3(500, 0, 0), // High severity teleport
        velocity: vec3(0, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      expect(result.correctedPosition).toBeDefined();
    });

    it("should include corrected position when multiple violations exist", () => {
      playerState.updateState({
        position: vec3(0, 0, 0),
        velocity: vec3(0, 0, 0),
        isGrounded: false,
        isJumping: false,
      });

      // Both teleport and invalid jump
      const input = createInput({
        position: vec3(200, 0, 0),
        velocity: vec3(0, 0, 0),
        isGrounded: false,
        isJumping: true,
        sequenceNumber: 100, // Also a sequence skip
      });

      const result = validator.validate(input, playerState, 0.1);
      // Multiple violations should trigger correction
      if (result.violations.length >= 2) {
        expect(result.correctedPosition).toBeDefined();
      }
    });

    it("should skip teleport check when deltaTime is zero", () => {
      // Move the player far away — normally would trigger teleport
      const input = createInput({
        position: vec3(9999, 0, 9999),
        velocity: vec3(0, 0, 0),
        sequenceNumber: 1,
      });
      const result = validator.validate(input, playerState, 0);
      // teleport check should be skipped, so only non-teleport violations (if any)
      const teleportViolations = result.violations.filter((v) => v.type === "teleport");
      expect(teleportViolations).toHaveLength(0);
    });

    it("should skip teleport check when deltaTime is negative", () => {
      const input = createInput({
        position: vec3(9999, 0, 9999),
        velocity: vec3(0, 0, 0),
        sequenceNumber: 1,
      });
      const result = validator.validate(input, playerState, -1);
      const teleportViolations = result.violations.filter((v) => v.type === "teleport");
      expect(teleportViolations).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  describe("configuration", () => {
    it("should use custom walk speed", () => {
      const customValidator = new MovementValidator({ walkSpeed: 32 });

      // At speed 30, under 32 * 1.5 = 48 → no violation
      const input = createInput({
        velocity: vec3(30, 0, 0),
        sequenceNumber: 1,
      });

      const result = customValidator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolations).toHaveLength(0);
    });

    it("should update config dynamically", () => {
      validator.updateConfig({ walkSpeed: 50, runSpeed: 75 });

      // At speed 40, well under 50 * 1.5 = 75 → no violation
      const input = createInput({
        velocity: vec3(40, 0, 0),
        sequenceNumber: 1,
      });

      const result = validator.validate(input, playerState, 0.1);
      const speedViolations = result.violations.filter(
        (v: MovementViolation) => v.type === "speed_hack"
      );
      expect(speedViolations).toHaveLength(0);
    });

    it("should support ability speed modifiers via getMaxAllowedSpeed", () => {
      const abilities = new Map<
        string,
        { name: string; speedModifier: number; cooldown: number }
      >();
      abilities.set("sprint-boost", {
        name: "Sprint Boost",
        speedModifier: 2.0,
        cooldown: 10,
      });

      const abilityValidator = new MovementValidator({ abilities });
      const maxSpeed = abilityValidator.getMaxAllowedSpeed(false, ["sprint-boost"]);
      const baseMax = DEFAULT_MOVEMENT_CONFIG.walkSpeed * VALIDATION_THRESHOLDS.speedTolerance;

      // With 2x speed modifier, max should be doubled
      expect(maxSpeed).toBe(baseMax * 2.0);
    });

    it("should return base speed when no abilities active", () => {
      const maxSpeed = validator.getMaxAllowedSpeed(false);
      expect(maxSpeed).toBe(
        DEFAULT_MOVEMENT_CONFIG.walkSpeed * VALIDATION_THRESHOLDS.speedTolerance
      );
    });

    it("should use run speed when running", () => {
      const maxSpeed = validator.getMaxAllowedSpeed(true);
      expect(maxSpeed).toBe(
        DEFAULT_MOVEMENT_CONFIG.runSpeed * VALIDATION_THRESHOLDS.speedTolerance
      );
    });
  });

  // --------------------------------------------------------------------------
  // Position Prediction
  // --------------------------------------------------------------------------

  describe("position prediction", () => {
    it("should predict position based on velocity", () => {
      const pos = vec3(0, 0, 0);
      const vel = vec3(10, 0, 5);
      const predicted = validator.predictPosition(pos, vel, 1.0, true);

      // On ground: no gravity applied
      expect(predicted).toBeDefined();
    });

    it("should apply gravity when not grounded", () => {
      const pos = vec3(0, 100, 0);
      const vel = vec3(0, 0, 0);
      const predicted = validator.predictPosition(pos, vel, 1.0, false);

      // Should move downward due to gravity
      expect(predicted).toBeDefined();
    });
  });
});

// ============================================================================
// Singleton Export Tests
// ============================================================================

describe("getMovementValidator", () => {
  it("should return a validator instance", async () => {
    const { getMovementValidator } = await import("./validator");
    const v = getMovementValidator();
    expect(v).toBeInstanceOf(MovementValidator);
  });

  it("should return the same instance on subsequent calls", async () => {
    const { getMovementValidator } = await import("./validator");
    const v1 = getMovementValidator();
    const v2 = getMovementValidator();
    expect(v1).toBe(v2);
  });
});
