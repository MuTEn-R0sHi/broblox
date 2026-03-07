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
import { getEventTracker } from "./AnalyticsService";

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
  },

  positionProvider: (playerId: PlayerId) => {
    const state = movementStateManager.getState(playerId);
    if (!state) return undefined;
    const pos = state.getState().position;
    return { X: pos.X, Y: pos.Y, Z: pos.Z };
  },

  onHit: (result) => {
    const damage = ABILITY_DAMAGE[result.reason ?? "melee_attack"] ?? 10;
    logger.debug(
      `Validated hit: target=${result.targetId}, distance=${result.hitDistance}, damage=${damage}`
    );

    // Fire analytics event
    const tracker = getEventTracker();
    if (result.targetId !== undefined) {
      tracker.track("action.kill", result.targetId as unknown as number, {
        damage,
        hitDistance: result.hitDistance,
      });
    }
  },

  onSuspicious: (event) => {
    logger.warn(`Suspicious hit from player ${event.playerId}: ${event.reason}`);
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
    weaponId: abilityId,
    origin: { X: origin.X, Y: origin.Y, Z: origin.Z },
    direction: { X: direction.X, Y: direction.Y, Z: direction.Z },
    clientTimestamp,
  });

  if (result.ok) {
    const damage = ABILITY_DAMAGE[abilityId] ?? 10;
    return { valid: true, damage, targetId: targetPlayerId };
  }

  return { valid: false, damage: 0, targetId: targetPlayerId };
}
