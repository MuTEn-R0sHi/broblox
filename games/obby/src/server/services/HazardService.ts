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
import { CollectionService, Players, RunService } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";
import { DataService } from "./DataService";

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

  onDamage(playerId: number, damage: number, hazardId: string): boolean {
    const player = Players.GetPlayerByUserId(playerId);
    if (!player) return false;

    const character = player.Character;
    if (!character) return false;

    const humanoid = character.FindFirstChildOfClass("Humanoid");
    if (!humanoid) return false;

    humanoid.TakeDamage(damage);

    RemoteService.getRegistry().fireClient("HazardDamage", player, {
      hazardId,
      damage,
    });

    return humanoid.Health <= 0;
  },

  onKill(playerId: number, _hazardId: string): void {
    const player = Players.GetPlayerByUserId(playerId);
    if (!player) return;
    DataService.incrementDeaths(player);
  },

  onToggle(instanceKey: string, active: boolean): void {
    for (const player of Players.GetPlayers()) {
      RemoteService.getRegistry().fireClient("HazardToggle", player, {
        instanceKey,
        active,
      });
    }
  },

  onPlayerRemoving(callback) {
    PlayerLifecycleService.onPlayerRemoving(callback);
  },
});

// ============================================================================
// Game-Level Wiring (Heartbeat, CollectionService, Player Lifecycle)
// ============================================================================

let heartbeatConn: RBXScriptConnection | undefined;
const touchConns: RBXScriptConnection[] = [];

const originalOnStart = handle.Service.onStart;
handle.Service.onStart = function () {
  if (originalOnStart) {
    originalOnStart.call(handle.Service);
  }

  // --- Player lifecycle: init hazard state on join ---
  PlayerLifecycleService.onPlayerAdded((player) => {
    handle.initPlayer(player.UserId);
  });

  // --- CollectionService: connect Touched for all hazard tags ---
  const manager = handle.getHazardManager();

  for (const def of OBBY_HAZARDS) {
    if (!def.tag) continue;

    for (const part of CollectionService.GetTagged(def.tag)) {
      if (!part.IsA("BasePart")) continue;

      const instanceKey = `${def.id}::${part.GetFullName()}`;
      manager.addInstance(def.id, instanceKey);

      const conn = part.Touched.Connect((hit) => {
        const character = hit.Parent as Model | undefined;
        if (!character) return;
        const humanoid = character.FindFirstChildOfClass("Humanoid");
        if (!humanoid) return;
        const touchPlayer = Players.GetPlayerFromCharacter(character);
        if (!touchPlayer) return;

        manager.processTouch(touchPlayer.UserId, instanceKey, os.clock());
      });
      touchConns.push(conn);
    }
  }

  // --- Heartbeat: advance hazard timers every frame ---
  heartbeatConn = RunService.Heartbeat.Connect((dt) => {
    manager.update(dt);
  });
};

const originalOnDestroy = handle.Service.onDestroy;
handle.Service.onDestroy = function () {
  if (originalOnDestroy) {
    originalOnDestroy.call(handle.Service);
  }
  heartbeatConn?.Disconnect();
  heartbeatConn = undefined;
  for (const conn of touchConns) {
    conn.Disconnect();
  }
};

// ============================================================================
// Exports
// ============================================================================

export const HazardService = handle.Service;
export const getHazardRegistry = () => handle.getHazardRegistry();
export const getHazardManager = () => handle.getHazardManager();
export const initPlayerHazards = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerHazards = (playerId: number) => handle.cleanupPlayer(playerId);
