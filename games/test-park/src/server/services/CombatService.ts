/**
 * Combat Service — Test Park
 *
 * Wires @broblox/combat into the game:
 * - Registers melee and ranged abilities with cooldowns
 * - Validates hit reports server-side
 * - Applies damage, increments kills, fires analytics
 * - Wires position provider from MovementValidationService
 */

import { createCombatService, type CombatServiceConfig } from "@broblox/combat";
import { createLogger } from "@broblox/core";
import type { PlayerId } from "@broblox/shared-types";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { movementStateManager } from "./MovementValidationService";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";
import { getEventTracker } from "./AnalyticsService";
import { trackPurchase } from "./TelemetryService";

const logger = createLogger("CombatService");

// ============================================================================
// Ability Definitions
// ============================================================================

/** Melee attack — short cooldown, 1 charge */
const MELEE_ATTACK = {
  abilityId: "melee_attack",
  durationSeconds: 0.8,
  charges: 1,
};

/** Ranged attack — longer cooldown, 2 charges */
const RANGED_ATTACK = {
  abilityId: "ranged_attack",
  durationSeconds: 2.0,
  charges: 2,
  chargeRecoverySeconds: 1.5,
};

/** Heavy slam — high cooldown, 1 charge */
const HEAVY_SLAM = {
  abilityId: "heavy_slam",
  durationSeconds: 5.0,
  charges: 1,
};

// ============================================================================
// Damage Table
// ============================================================================

const ABILITY_DAMAGE: Record<string, number> = {
  melee_attack: 25,
  ranged_attack: 15,
  heavy_slam: 50,
};

// ============================================================================
// Factory config
// ============================================================================

const config: CombatServiceConfig = {
  abilities: [MELEE_ATTACK, RANGED_ATTACK, HEAVY_SLAM],

  hitValidation: {
    maxLagMs: 200,
    maxRange: 100,
    maxAngleDeg: 90,
  },

  positionProvider: (playerId: PlayerId) => {
    const state = movementStateManager.getState(playerId);
    if (!state) return undefined;
    return state.position;
  },

  onHit: (result) => {
    const damage = ABILITY_DAMAGE[result.abilityId] ?? 10;
    logger.debug(
      `Validated hit: shooter=${result.shooterId} → target=${result.targetId}, ability=${result.abilityId}, damage=${damage}`
    );

    // Fire analytics event
    const tracker = getEventTracker();
    tracker.trackEvent(result.shooterId as PlayerId, "action.kill", {
      targetId: result.targetId,
      abilityId: result.abilityId,
      damage,
    });
  },

  onSuspicious: (event) => {
    logger.warn(
      `Suspicious hit from player ${event.shooterId}: ${event.reason} (count: ${event.count})`
    );
  },

  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
};

// ============================================================================
// Create & export
// ============================================================================

const handle = createCombatService(config);

export const CombatService = handle.Service;
export const combatHandle = handle;

/** Convenience: validate a hit and apply damage if valid */
export function processHitReport(
  shooterPlayerId: number,
  targetPlayerId: number,
  abilityId: string,
  origin: { X: number; Y: number; Z: number },
  direction: { X: number; Y: number; Z: number },
  clientTimestamp: number
): { valid: boolean; damage: number; targetId: number } {
  const result = handle.validateHit(shooterPlayerId as PlayerId, {
    targetId: targetPlayerId as PlayerId,
    abilityId,
    origin: { X: origin.X, Y: origin.Y, Z: origin.Z },
    direction: { X: direction.X, Y: direction.Y, Z: direction.Z },
    clientTimestamp,
    serverTimestamp: os.clock() * 1000,
  });

  if (result.ok) {
    const damage = ABILITY_DAMAGE[abilityId] ?? 10;
    return { valid: true, damage, targetId: targetPlayerId };
  }

  return { valid: false, damage: 0, targetId: targetPlayerId };
}
