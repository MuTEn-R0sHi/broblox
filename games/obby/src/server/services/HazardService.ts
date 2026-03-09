/**
 * Hazard Service — Obby Game
 *
 * Environmental hazard management for the obby game worlds.
 * Uses @broblox/hazards factory for the core hazard logic.
 *
 * Defines hazard types used in the game (lava floors, fire jets,
 * crumbling platforms, poison zones, spike traps) and wires damage
 * application to Roblox's Humanoid system.
 */

import { createHazardService } from "@broblox/hazards";
import type { HazardDefinition } from "@broblox/hazards";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

// ============================================================================
// Hazard Catalog
// ============================================================================

/**
 * Hazard definitions for the obby game.
 *
 * - Lava floors: instant kill (Grasslands kill zones + Lava Caves floors)
 * - Fire jets: timed burst, 25 damage per hit, 2s on / 3s off
 * - Poison zones: 10 damage per second while standing inside
 * - Crumbling platforms: break 1.5s after touch, respawn after 5s
 * - Spike traps: 15 contact damage, 1.5s immunity after hit
 * - Hot surfaces: 5 damage per tick (slow burn while standing)
 */
const OBBY_HAZARDS: HazardDefinition[] = [
  {
    id: "lava_floor",
    displayName: "Lava Floor",
    behaviour: "instant_kill",
    damage: 0,
    tag: "HazardLava",
  },
  {
    id: "fire_jet",
    displayName: "Fire Jet",
    behaviour: "timed_burst",
    damage: 25,
    activeDuration: 2,
    cooldownDuration: 3,
    tag: "HazardFireJet",
  },
  {
    id: "poison_zone",
    displayName: "Poison Zone",
    behaviour: "damage_zone",
    damage: 10,
    tickInterval: 1,
    tag: "HazardPoison",
  },
  {
    id: "crumble_platform",
    displayName: "Crumbling Platform",
    behaviour: "crumbling",
    damage: 0,
    activeDuration: 1.5,
    cooldownDuration: 5,
    tag: "HazardCrumble",
  },
  {
    id: "spike_trap",
    displayName: "Spike Trap",
    behaviour: "contact_damage",
    damage: 15,
    cooldownDuration: 1.5,
    tag: "HazardSpike",
  },
  {
    id: "hot_surface",
    displayName: "Hot Surface",
    behaviour: "damage_zone",
    damage: 5,
    tickInterval: 0.5,
    tag: "HazardHotSurface",
  },
];

// ============================================================================
// Service Factory
// ============================================================================

const handle = createHazardService({
  definitions: OBBY_HAZARDS,

  onDamage(playerId: number, damage: number, _hazardId: string): boolean {
    // In a real game this would find the player's Humanoid and call TakeDamage.
    // For now this is the integration point — game-level code wires this up.

    void playerId;
    void damage;
    return false;
  },

  onKill(playerId: number, hazardId: string): void {
    void playerId;
    void hazardId;
  },

  onPlayerRemoving(callback) {
    PlayerLifecycleService.onPlayerRemoving(callback);
  },
});

// ============================================================================
// Exports
// ============================================================================

export const HazardService = handle.Service;
export const getHazardRegistry = () => handle.getHazardRegistry();
export const getHazardManager = () => handle.getHazardManager();
export const initPlayerHazards = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerHazards = (playerId: number) => handle.cleanupPlayer(playerId);
