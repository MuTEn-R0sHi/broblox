/**
 * @broblox/obstacles — Obstacle Manager
 *
 * Pure-logic runtime manager. Tracks obstacle instances, drives movement
 * each frame, and toggles timed sequences. No Roblox API dependency — all
 * position changes are dispatched via callbacks.
 */

import type {
  ObstacleDefinition,
  ObstacleInstanceState,
  ObstacleManager,
  ObstacleRegistry,
} from "./types";

export interface ObstacleManagerCallbacks {
  /** Called each frame with the updated state for an obstacle instance. */
  onUpdate?: (instanceKey: string, progress: number, active: boolean) => void;
  /** Called when a timed_sequence obstacle toggles visibility. */
  onToggle?: (instanceKey: string, active: boolean) => void;
}

export function createObstacleManager(
  registry: ObstacleRegistry,
  callbacks: ObstacleManagerCallbacks
): ObstacleManager {
  const instances = new Map<string, ObstacleInstanceState>();

  function getDef(defId: string): ObstacleDefinition | undefined {
    return registry.get(defId);
  }

  function updateMovingPlatform(state: ObstacleInstanceState, def: ObstacleDefinition, dt: number) {
    const speed = def.speed ?? 5;
    const distance = def.distance ?? 20;
    if (distance <= 0) return;

    // Progress rate: how much of the total distance per second
    const rate = speed / distance;
    state.progress += rate * dt * state.direction;

    // Ping-pong at boundaries
    if (state.progress >= 1) {
      state.progress = 1;
      state.direction = -1;
    } else if (state.progress <= 0) {
      state.progress = 0;
      state.direction = 1;
    }
  }

  function updateRotatingBeam(state: ObstacleInstanceState, def: ObstacleDefinition, dt: number) {
    const speed = def.speed ?? 90; // degrees/sec
    // Progress represents normalised rotation [0, 1) where 1 = 360°
    state.progress += (speed / 360) * dt;
    // Wrap around — use modulo so large deltas (server hitches) stay in [0, 1)
    state.progress %= 1;
    if (state.progress < 0) {
      state.progress += 1;
    }
  }

  function updateTimedSequence(
    state: ObstacleInstanceState,
    def: ObstacleDefinition,
    dt: number,
    key: string
  ) {
    const activeDur = def.activeDuration ?? 3;
    const cooldownDur = def.cooldownDuration ?? 3;
    const totalCycle = activeDur + cooldownDur;
    if (totalCycle <= 0) return;

    // progress tracks time within the current cycle phase
    state.progress += dt;

    if (state.active && state.progress >= activeDur) {
      state.active = false;
      state.progress -= activeDur;
      callbacks.onToggle?.(key, false);
    } else if (!state.active && state.progress >= cooldownDur) {
      state.active = true;
      state.progress -= cooldownDur;
      callbacks.onToggle?.(key, true);
    }
  }

  // Conveyor doesn't need state updates — it applies a constant push.
  // The game layer reads the speed from the definition.

  const manager: ObstacleManager = {
    addInstance(definitionId: string, instanceKey: string): boolean {
      if (instances.has(instanceKey)) return false;
      const def = getDef(definitionId);
      if (!def) return false;

      const phaseOffset = def.phaseOffset ?? 0;
      let startProgress = 0;
      let startActive = true;

      if (def.behaviour === "timed_sequence") {
        // Apply phase offset to stagger platforms
        const activeDur = def.activeDuration ?? 3;
        const cooldownDur = def.cooldownDuration ?? 3;
        const totalCycle = activeDur + cooldownDur;
        const offsetTime = phaseOffset * totalCycle;

        if (offsetTime < activeDur) {
          startActive = true;
          startProgress = offsetTime;
        } else {
          startActive = false;
          startProgress = offsetTime - activeDur;
        }
      }

      instances.set(instanceKey, {
        definitionId,
        progress: startProgress,
        direction: 1,
        active: startActive,
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

    getInstanceState(instanceKey: string): ObstacleInstanceState | undefined {
      return instances.get(instanceKey);
    },

    update(deltaSec: number): void {
      instances.forEach((state, key) => {
        const def = getDef(state.definitionId);
        if (!def) return;

        if (def.behaviour === "moving_platform") {
          updateMovingPlatform(state, def, deltaSec);
        } else if (def.behaviour === "rotating_beam") {
          updateRotatingBeam(state, def, deltaSec);
        } else if (def.behaviour === "timed_sequence") {
          updateTimedSequence(state, def, deltaSec, key);
        }
        // conveyor: no state change needed

        callbacks.onUpdate?.(key, state.progress, state.active);
      });
    },
  };

  return manager;
}
