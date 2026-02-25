/**
 * Player Movement State Management
 */

import { MovementState, AbilityState } from "./types";
import { VALIDATION_THRESHOLDS } from "./constants";

// ============================================================================
// Player Movement State
// ============================================================================

export class PlayerMovementState {
  private state: MovementState;
  private abilityState: AbilityState;
  private violationHistory: Array<{ timestamp: number; violationType: string }> = [];
  private airTimeStart?: number;

  constructor(initialPosition: Vector3) {
    this.state = {
      position: initialPosition,
      velocity: new Vector3(0, 0, 0),
      isGrounded: true,
      isJumping: false,
      isFalling: false,
      isRunning: false,
      lastValidatedAt: os.clock(),
      sequenceNumber: 0,
    };

    this.abilityState = {
      isActive: false,
    };
  }

  /**
   * Get current movement state.
   */
  getState(): Readonly<MovementState> {
    return this.state;
  }

  /**
   * Get ability state.
   */
  getAbilityState(): Readonly<AbilityState> {
    return this.abilityState;
  }

  /**
   * Update state after validation.
   */
  updateState(newState: Partial<MovementState>): void {
    if (newState.position !== undefined) this.state.position = newState.position;
    if (newState.velocity !== undefined) this.state.velocity = newState.velocity;
    if (newState.isGrounded !== undefined) this.state.isGrounded = newState.isGrounded;
    if (newState.isJumping !== undefined) this.state.isJumping = newState.isJumping;
    if (newState.isFalling !== undefined) this.state.isFalling = newState.isFalling;
    if (newState.isRunning !== undefined) this.state.isRunning = newState.isRunning;
    if (newState.sequenceNumber !== undefined) this.state.sequenceNumber = newState.sequenceNumber;

    this.state.lastValidatedAt = os.clock();

    // Track air time
    if (!this.state.isGrounded && this.airTimeStart === undefined) {
      this.airTimeStart = os.clock();
    } else if (this.state.isGrounded) {
      this.airTimeStart = undefined;
    }
  }

  /**
   * Get time spent in air (seconds).
   */
  getAirTime(): number {
    if (this.airTimeStart === undefined) return 0;
    return os.clock() - this.airTimeStart;
  }

  /**
   * Notify the state that the player was teleported by the server.
   * Resets position, velocity, and air-time tracking so the next
   * heartbeat tick does not flag the position jump as a violation.
   */
  notifyTeleport(newPosition: Vector3): void {
    this.state.position = newPosition;
    this.state.velocity = new Vector3(0, 0, 0);
    this.state.isGrounded = true;
    this.state.isJumping = false;
    this.state.isFalling = false;
    this.state.isRunning = false;
    this.state.lastValidatedAt = os.clock();
    this.airTimeStart = undefined;
  }

  /**
   * Record a violation.
   */
  recordViolation(violationType: string): void {
    this.violationHistory.push({
      timestamp: os.clock(),
      violationType,
    });

    // Clean old violations (older than violationWindow seconds)
    const cutoff = os.clock() - VALIDATION_THRESHOLDS.violationWindow;
    const newHistory: Array<{ timestamp: number; violationType: string }> = [];
    for (const v of this.violationHistory) {
      if (v.timestamp > cutoff) {
        newHistory.push(v);
      }
    }
    this.violationHistory = newHistory;
  }

  /**
   * Get recent violation count.
   */
  getRecentViolationCount(): number {
    const cutoff = os.clock() - VALIDATION_THRESHOLDS.violationWindow;
    let count = 0;
    for (const v of this.violationHistory) {
      if (v.timestamp > cutoff) {
        count++;
      }
    }
    return count;
  }

  /**
   * Start an ability.
   */
  startAbility(abilityName: string): void {
    this.abilityState = {
      isActive: true,
      startedAt: os.clock(),
      lastUsedAt: os.clock(),
      abilityName,
    };
  }

  /**
   * End current ability.
   */
  endAbility(): void {
    this.abilityState = {
      isActive: false,
      lastUsedAt: this.abilityState.lastUsedAt,
    };
  }

  /**
   * Check if ability is on cooldown.
   */
  isAbilityOnCooldown(cooldownSeconds: number): boolean {
    if (this.abilityState.lastUsedAt === undefined) return false;
    return os.clock() - this.abilityState.lastUsedAt < cooldownSeconds;
  }

  /**
   * Increment sequence number.
   */
  incrementSequence(): number {
    this.state.sequenceNumber++;
    return this.state.sequenceNumber;
  }
}

// ============================================================================
// State Manager (tracks all players)
// ============================================================================

export class MovementStateManager {
  private states = new Map<number, PlayerMovementState>();

  /**
   * Get or create state for a player.
   */
  getState(playerId: number, initialPosition?: Vector3): PlayerMovementState {
    let state = this.states.get(playerId);

    if (!state) {
      state = new PlayerMovementState(initialPosition ?? new Vector3(0, 0, 0));
      this.states.set(playerId, state);
    }

    return state;
  }

  /**
   * Remove state for a player.
   */
  removeState(playerId: number): void {
    this.states.delete(playerId);
  }

  /**
   * Notify that a player was teleported by the server.
   * Resets their movement state to the new position so the validator
   * does not flag the position jump as a violation.
   */
  notifyTeleport(playerId: number, newPosition: Vector3): void {
    const state = this.states.get(playerId);
    if (state) {
      state.notifyTeleport(newPosition);
    }
  }

  /**
   * Check if player has state.
   */
  hasState(playerId: number): boolean {
    return this.states.has(playerId);
  }
}
