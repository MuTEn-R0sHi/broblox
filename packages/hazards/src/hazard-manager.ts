/**
 * @broblox/hazards — Hazard Manager
 *
 * Pure-logic runtime manager. Tracks hazard instances, per-player immunity,
 * timed toggles, and damage application. No Roblox API dependency — all
 * effects are dispatched via callbacks.
 */

import type {
  HazardDefinition,
  HazardInstanceState,
  HazardManager,
  HazardRegistry,
  PlayerHazardState,
} from "./types";

export interface HazardManagerCallbacks {
  /** Apply damage; return true if player died. */
  onDamage: (playerId: number, damage: number, hazardId: string) => boolean;
  /** Notify that a hazard killed a player. */
  onKill: (playerId: number, hazardId: string) => void;
  /** Notify that a timed_burst / crumbling instance toggled state. */
  onToggle?: (instanceKey: string, active: boolean) => void;
}

export function createHazardManager(
  registry: HazardRegistry,
  callbacks: HazardManagerCallbacks
): HazardManager {
  // instanceKey → state
  const instances = new Map<string, HazardInstanceState>();
  // `${playerId}:${instanceKey}` → immunity state
  const playerStates = new Map<string, PlayerHazardState>();
  // Players currently tracked
  const activePlayers = new Set<number>();

  function immunityKey(playerId: number, instanceKey: string): string {
    return `${playerId}:${instanceKey}`;
  }

  function getDef(defId: string): HazardDefinition | undefined {
    return registry.get(defId);
  }

  /**
   * Apply damage and handle kill. Returns true if player died.
   * For `instant_kill`, the player is always considered dead regardless
   * of onDamage's return value.
   */
  function applyDamage(playerId: number, def: HazardDefinition): boolean {
    if (def.behaviour === "instant_kill") {
      callbacks.onDamage(playerId, 9999, def.id);
      callbacks.onKill(playerId, def.id);
      return true;
    }
    if (def.behaviour === "crumbling") {
      return false; // crumbling doesn't deal damage — the fall does
    }
    const died = callbacks.onDamage(playerId, def.damage, def.id);
    if (died) {
      callbacks.onKill(playerId, def.id);
    }
    return died;
  }

  /** Set player immunity for a hazard instance. */
  function setImmunity(playerId: number, instanceKey: string, duration: number, now: number) {
    playerStates.set(immunityKey(playerId, instanceKey), {
      immuneUntil: now + duration,
    });
  }

  const manager: HazardManager = {
    addInstance(definitionId: string, instanceKey: string): boolean {
      if (instances.has(instanceKey)) return false;
      const def = getDef(definitionId);
      if (!def) return false;

      const startActive = true;
      const nextToggle = def.behaviour === "timed_burst" ? (def.activeDuration ?? 3) : math.huge;

      instances.set(instanceKey, {
        definitionId,
        active: startActive,
        nextToggleAt: nextToggle,
      });
      return true;
    },

    removeInstance(instanceKey: string): boolean {
      return instances.delete(instanceKey);
    },

    instanceCount(): number {
      let n = 0;
      instances.forEach(() => n++);
      return n;
    },

    update(deltaSec: number): void {
      instances.forEach((state, key) => {
        const def = getDef(state.definitionId);
        if (!def) return;

        // Only timed_burst and crumbling toggle
        if (def.behaviour !== "timed_burst" && def.behaviour !== "crumbling") return;

        state.nextToggleAt -= deltaSec;
        if (state.nextToggleAt <= 0) {
          state.active = !state.active;
          if (def.behaviour === "crumbling") {
            state.broken = !state.broken;
          }
          // Set next toggle duration
          if (state.active) {
            state.nextToggleAt = def.activeDuration ?? 3;
          } else {
            state.nextToggleAt = def.cooldownDuration ?? 5;
          }
          callbacks.onToggle?.(key, state.active);
        }
      });
    },

    processTouch(playerId: number, instanceKey: string, now: number): boolean {
      if (!activePlayers.has(playerId)) return false;

      const state = instances.get(instanceKey);
      if (!state) return false;

      const def = getDef(state.definitionId);
      if (!def) return false;

      // Inactive hazards don't deal damage
      if (!state.active && def.behaviour === "timed_burst") return false;

      // Crumbling: start break timer on first touch
      if (def.behaviour === "crumbling" && !state.broken && state.active) {
        state.nextToggleAt = def.activeDuration ?? 2;
        return false; // no damage from crumbling itself
      }
      // Crumbling and broken — nothing to do
      if (def.behaviour === "crumbling") return false;

      // Check immunity
      if (manager.isImmune(playerId, instanceKey, now)) return false;

      // Apply damage
      const died = applyDamage(playerId, def);

      // Set immunity window for non-lethal hazards
      if (!died && def.behaviour === "contact_damage" && def.cooldownDuration) {
        setImmunity(playerId, instanceKey, def.cooldownDuration, now);
      }
      if (!died && def.behaviour === "damage_zone" && def.tickInterval) {
        setImmunity(playerId, instanceKey, def.tickInterval, now);
      }
      if (!died && def.behaviour === "timed_burst" && def.tickInterval) {
        setImmunity(playerId, instanceKey, def.tickInterval, now);
      }

      return true;
    },

    isImmune(playerId: number, instanceKey: string, now: number): boolean {
      const key = immunityKey(playerId, instanceKey);
      const state = playerStates.get(key);
      if (!state) return false;
      if (now >= state.immuneUntil) {
        playerStates.delete(key);
        return false;
      }
      return true;
    },
  };

  return {
    addInstance(definitionId: string, instanceKey: string): boolean {
      return manager.addInstance(definitionId, instanceKey);
    },
    removeInstance(instanceKey: string): boolean {
      return manager.removeInstance(instanceKey);
    },
    instanceCount(): number {
      return manager.instanceCount();
    },
    update(deltaSec: number): void {
      manager.update(deltaSec);
    },
    processTouch(playerId: number, instanceKey: string, now: number): boolean {
      return manager.processTouch(playerId, instanceKey, now);
    },
    isImmune(playerId: number, instanceKey: string, now: number): boolean {
      return manager.isImmune(playerId, instanceKey, now);
    },
    // Extra methods accessible via the factory
    _initPlayer(playerId: number) {
      activePlayers.add(playerId);
    },
    _cleanupPlayer(playerId: number) {
      activePlayers.delete(playerId);
      // Remove all immunity entries for this player
      const prefix = `${playerId}:`;
      const prefixLen = prefix.size();
      const toDelete: string[] = [];
      playerStates.forEach((_v, k) => {
        if (k.sub(1, prefixLen) === prefix) toDelete.push(k);
      });
      for (const k of toDelete) playerStates.delete(k);
    },
  } as HazardManager & {
    _initPlayer(playerId: number): void;
    _cleanupPlayer(playerId: number): void;
  };
}
