/**
 * Enforcement System
 *
 * Takes action against players who violate rules.
 */

import { createLogger } from "@broblox/core";
import {
  Violation,
  ViolationSeverity,
  EnforcementAction,
  EnforcementConfig,
  DEFAULT_ENFORCEMENT_CONFIG,
} from "./types";
import { onViolation } from "./detectors";

const logger = createLogger("Security.Enforcer");

// ============================================================================
// Enforcement State
// ============================================================================

interface PlayerEnforcementState {
  violations: Array<{ timestamp: number; severity: ViolationSeverity }>;
  shadowBanned: boolean;
  warnings: number;
}

const playerStates = new Map<number, PlayerEnforcementState>();

// ============================================================================
// Enforcer Class
// ============================================================================

export class Enforcer {
  private config: EnforcementConfig;
  private disconnect?: () => void;

  constructor(config?: Partial<EnforcementConfig>) {
    this.config = {
      ...DEFAULT_ENFORCEMENT_CONFIG,
      ...config,
      severityActions: {
        ...DEFAULT_ENFORCEMENT_CONFIG.severityActions,
        ...config?.severityActions,
      },
    };
  }

  /**
   * Start automatic enforcement based on violation signals.
   */
  start(): void {
    if (this.disconnect) {
      return;
    }

    this.disconnect = onViolation((violation) => {
      this.handleViolation(violation);
    });

    logger.info("Enforcer started");
  }

  /**
   * Stop automatic enforcement.
   */
  stop(): void {
    if (this.disconnect) {
      this.disconnect();
      this.disconnect = undefined;
      logger.info("Enforcer stopped");
    }
  }

  /**
   * Handle a violation and take appropriate action.
   */
  handleViolation(violation: Violation): void {
    const state = this.getOrCreateState(violation.player);

    // Record violation
    state.violations.push({
      timestamp: violation.timestamp,
      severity: violation.severity,
    });

    // Clean old violations outside window
    const cutoff = os.time() - this.config.windowSeconds;
    state.violations = state.violations.filter((v) => v.timestamp >= cutoff);

    // Determine action
    let action = this.config.severityActions[violation.severity];

    // Escalate if threshold exceeded
    if (state.violations.size() >= this.config.escalationThreshold) {
      action = this.escalateAction(action);
    }

    // Execute action
    this.executeAction(violation.player, action, violation);
  }

  /**
   * Manually kick a player.
   */
  kick(player: Player, reason?: string): void {
    const message = reason ?? this.config.kickMessage ?? "You have been removed from the game";
    player.Kick(message);
    logger.info(`Kicked ${player.Name}: ${reason ?? "manual"}`);
  }

  /**
   * Shadow ban a player (they stay but can't affect others).
   */
  shadowBan(player: Player): void {
    const state = this.getOrCreateState(player);
    state.shadowBanned = true;
    logger.info(`Shadow banned ${player.Name}`);
  }

  /**
   * Check if player is shadow banned.
   */
  isShadowBanned(player: Player): boolean {
    const state = playerStates.get(player.UserId);
    return state?.shadowBanned ?? false;
  }

  /**
   * Get violation count for player.
   */
  getViolationCount(player: Player): number {
    const state = playerStates.get(player.UserId);
    return state?.violations.size() ?? 0;
  }

  /**
   * Reset enforcement state for player.
   */
  resetPlayer(player: Player): void {
    playerStates.delete(player.UserId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getOrCreateState(player: Player): PlayerEnforcementState {
    let state = playerStates.get(player.UserId);
    if (!state) {
      state = {
        violations: [],
        shadowBanned: false,
        warnings: 0,
      };
      playerStates.set(player.UserId, state);
    }
    return state;
  }

  private escalateAction(action: EnforcementAction): EnforcementAction {
    switch (action) {
      case "none":
        return "warn";
      case "warn":
        return "kick";
      case "kick":
        return "shadow";
      case "shadow":
        return "temp-ban";
      case "temp-ban":
        return "perm-ban";
      case "perm-ban":
        return "perm-ban"; // Already at maximum severity
      default:
        return action;
    }
  }

  private executeAction(player: Player, action: EnforcementAction, violation: Violation): void {
    switch (action) {
      case "none":
        // Do nothing
        break;

      case "warn": {
        const state = this.getOrCreateState(player);
        state.warnings += 1;
        logger.debug(`Warning ${player.Name} (${state.warnings}): ${violation.description}`);
        // Could send in-game warning UI here
        break;
      }

      case "kick":
        this.kick(player, this.config.kickMessage);
        break;

      case "shadow":
        this.shadowBan(player);
        break;

      case "temp-ban":
      case "perm-ban": {
        const banType = action === "temp-ban" ? "TEMPORARY" : "PERMANENT";
        const durationHours =
          action === "temp-ban" ? (this.config.tempBanDurationHours ?? 24) : undefined;
        if (this.config.onBan) {
          this.config.onBan(player, banType, violation.description, durationHours);
          logger.info(`${banType} ban issued for ${player.Name}: ${violation.description}`);
        } else {
          logger.warn(`Ban action not implemented: ${action} for ${player.Name}`);
        }
        this.kick(player, "You have been banned from this game");
        break;
      }
    }
  }
}

/**
 * Create an enforcer with optional custom config.
 */
export function createEnforcer(config?: Partial<EnforcementConfig>): Enforcer {
  return new Enforcer(config);
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up enforcement state for a player (call on leave).
 */
export function cleanupEnforcementState(player: Player): void {
  playerStates.delete(player.UserId);
}
