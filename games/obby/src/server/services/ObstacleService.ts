/**
 * Obstacle Service — Obby Game
 *
 * Dynamic obstacle management for the obby game worlds.
 * Uses @broblox/obstacles factory for the core obstacle logic.
 *
 * Defines obstacle types used in the game (moving platforms, rotating beams,
 * timed sequences, conveyors) and wires CFrame updates + toggle events to clients.
 */

import { createObstacleService } from "@broblox/obstacles";
import type { ObstacleDefinition } from "@broblox/obstacles";
import { CollectionService, RunService } from "@rbxts/services";
import { RemoteService } from "./RemoteService";

// ============================================================================
// Obstacle Catalog
// ============================================================================

/**
 * Obstacle definitions for the obby game.
 *
 * - Moving platforms: oscillate between two positions (slow / fast variants)
 * - Rotating beams: spin continuously at varying speeds
 * - Timed sequences: appear/disappear on a timer (blink platforms)
 * - Conveyors: push players in a direction at constant speed
 */
const OBBY_OBSTACLES: ObstacleDefinition[] = [
  {
    id: "slow_platform",
    displayName: "Slow Platform",
    behaviour: "moving_platform",
    speed: 8,
    distance: 20,
    tag: "ObstacleSlowPlatform",
  },
  {
    id: "fast_platform",
    displayName: "Fast Platform",
    behaviour: "moving_platform",
    speed: 16,
    distance: 24,
    tag: "ObstacleFastPlatform",
  },
  {
    id: "slow_spinner",
    displayName: "Slow Spinner",
    behaviour: "rotating_beam",
    speed: 90,
    tag: "ObstacleSlowSpinner",
  },
  {
    id: "fast_spinner",
    displayName: "Fast Spinner",
    behaviour: "rotating_beam",
    speed: 180,
    tag: "ObstacleFastSpinner",
  },
  {
    id: "blink_platform",
    displayName: "Blink Platform",
    behaviour: "timed_sequence",
    activeDuration: 2,
    cooldownDuration: 2,
    tag: "ObstacleBlink",
  },
  {
    id: "blink_platform_phased",
    displayName: "Blink Platform (Phased)",
    behaviour: "timed_sequence",
    activeDuration: 2,
    cooldownDuration: 2,
    phaseOffset: 0.5,
    tag: "ObstacleBlinkPhased",
  },
  {
    id: "conveyor_slow",
    displayName: "Conveyor (Slow)",
    behaviour: "conveyor",
    speed: 10,
    tag: "ObstacleConveyorSlow",
  },
  {
    id: "conveyor_fast",
    displayName: "Conveyor (Fast)",
    behaviour: "conveyor",
    speed: 25,
    tag: "ObstacleConveyorFast",
  },
];

// ============================================================================
// Service Factory
// ============================================================================

const handle = createObstacleService({
  definitions: OBBY_OBSTACLES,

  onUpdate: (instanceKey: string, progress: number, active: boolean): void => {
    RemoteService.getRegistry().fireAllClients("ObstacleUpdate", {
      instanceKey,
      progress,
      active,
    });
  },

  onToggle: (instanceKey: string, active: boolean): void => {
    RemoteService.getRegistry().fireAllClients("ObstacleToggle", {
      instanceKey,
      active,
    });
  },
});

// ============================================================================
// Game-Level Wiring (Heartbeat, CollectionService)
// ============================================================================

let heartbeatConn: RBXScriptConnection | undefined;

/** Wrapper service that delegates lifecycle to the factory and adds game wiring. */
const wrappedService = {
  name: "ObstacleService" as const,

  onInit() {
    handle.Service.onInit?.();
  },

  onStart() {
    handle.Service.onStart?.();

    const manager = handle.getObstacleManager();

    // --- CollectionService: register all tagged obstacle instances ---
    for (const def of OBBY_OBSTACLES) {
      if (!def.tag) continue;

      for (const part of CollectionService.GetTagged(def.tag)) {
        if (!part.IsA("BasePart")) continue;

        const instanceKey = `${def.id}::${part.GetFullName()}`;
        manager.addInstance(def.id, instanceKey);
      }
    }

    // --- Heartbeat: advance obstacle state every frame ---
    heartbeatConn = RunService.Heartbeat.Connect((dt) => {
      manager.update(dt);
    });
  },

  onDestroy() {
    handle.Service.onDestroy?.();
    heartbeatConn?.Disconnect();
    heartbeatConn = undefined;
  },
};

// ============================================================================
// Exports
// ============================================================================

export const ObstacleService = wrappedService;
export const getObstacleRegistry = () => handle.getObstacleRegistry();
export const getObstacleManager = () => handle.getObstacleManager();
