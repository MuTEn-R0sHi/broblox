/**
 * Movement Validation Service Factory
 *
 * Creates a Service that runs server-authoritative movement validation
 * on every Heartbeat tick.  Validates player positions via `@rbx/movement`
 * and applies soft corrections for violations.
 *
 * Gated by the `movement.validation.enabled` feature flag (kill-switch).
 */

import { Service, createLogger } from "@rbx/core";
import { MovementStateManager } from "./state";
import { getMovementValidator } from "./validator";
import { VALIDATION_THRESHOLDS } from "./constants";
import type { MovementInput } from "./types";

export interface MovementValidationConfig {
  /**
   * Register a callback for when a player is removed.
   * Typically wired to `PlayerLifecycleService.onPlayerRemoving`.
   */
  onPlayerRemoving: (callback: (player: Player) => void) => void;

  /**
   * Kill-switch callback.  Return `false` to skip validation for the
   * current tick.  Typically wired to a feature flag:
   * `() => isFlagEnabled("movement.validation.enabled")`.
   * Defaults to always-enabled if omitted.
   */
  isEnabled?: () => boolean;
}

export interface MovementValidationHandle {
  /** The Service to register with Application.register(). */
  Service: Service;
  /** The underlying state manager — useful for wiring position providers (e.g., combat). */
  stateManager: MovementStateManager;
}

function getHumanoidRootPart(character: Model): BasePart | undefined {
  const hrp = character.FindFirstChild("HumanoidRootPart");
  if (hrp && hrp.IsA("BasePart")) return hrp;
  return undefined;
}

function getHumanoid(character: Model): Humanoid | undefined {
  const humanoid = character.FindFirstChildOfClass("Humanoid");
  return humanoid;
}

/**
 * Create a server-side movement validation service.
 *
 * @example
 * ```ts
 * const handle = createMovementValidationService({
 *   onPlayerRemoving: PlayerLifecycleService.onPlayerRemoving,
 * });
 * export const MovementValidationService = handle.Service;
 * ```
 */
export function createMovementValidationService(
  config: MovementValidationConfig
): MovementValidationHandle {
  const Players = game.GetService("Players") as Players;
  const RunService = game.GetService("RunService") as RunService;
  const logger = createLogger("MovementValidationService");
  const stateManager = new MovementStateManager();
  const validator = getMovementValidator();
  const connections: RBXScriptConnection[] = [];
  /** Track character references to detect Roblox UI character resets. */
  const lastCharacter = new Map<number, Model>();

  const MovementValidationService: Service = {
    onInit() {
      config.onPlayerRemoving((player) => {
        stateManager.removeState(player.UserId);
        lastCharacter.delete(player.UserId);
      });

      const isEnabled = config.isEnabled ?? (() => true);

      const heartbeatConn = RunService.Heartbeat.Connect((dt: number) => {
        if (!isEnabled()) return;

        const deltaTime = math.min(dt, 0.25);

        for (const player of Players.GetPlayers()) {
          const character = player.Character;
          if (!character) continue;

          const hrp = getHumanoidRootPart(character);
          const humanoid = getHumanoid(character);
          if (!hrp || !humanoid) continue;

          // Skip validation for dead characters — the ragdolling body can
          // slide/fall rapidly and trigger false teleport violations before
          // Roblox destroys the character and spawns a new one.
          if (humanoid.Health <= 0) continue;

          // Detect character change (Roblox UI reset creates a new character).
          // Reset movement state so the new character doesn't inherit stale
          // air-time / position data from the old one.
          const prevCharacter = lastCharacter.get(player.UserId);
          if (prevCharacter !== undefined && prevCharacter !== character) {
            stateManager.removeState(player.UserId);
            lastCharacter.set(player.UserId, character);
            logger.debug(`Character changed for ${player.Name}, resetting movement state`);
            // Re-create state at current position on this tick
          }
          lastCharacter.set(player.UserId, character);

          const state = stateManager.getState(player.UserId, hrp.Position);

          // Detect server-side teleport: if the HRP moved far from last
          // validated position, assume the server teleported them (e.g.
          // respawn) and reset state instead of validating this tick.
          const lastPos = state.getState().position;
          const positionDelta = hrp.Position.sub(lastPos).Magnitude;
          // Use velocity-aware threshold: expected travel distance plus a
          // safety margin so legitimate high-speed movement (launch pads,
          // speed boosts) is not flagged.
          const velocityMagnitude = hrp.AssemblyLinearVelocity.Magnitude;
          const expectedMaxDistance = velocityMagnitude * deltaTime;
          const serverTeleportLimit =
            expectedMaxDistance + VALIDATION_THRESHOLDS.serverTeleportThreshold;
          if (positionDelta > serverTeleportLimit) {
            state.notifyTeleport(hrp.Position);
            logger.debug(
              `Detected server teleport for ${player.Name} (${math.floor(positionDelta)} studs), resetting state`
            );
            continue;
          }

          const seq = state.incrementSequence();

          const isGrounded = humanoid.FloorMaterial !== Enum.Material.Air;
          const humanoidState = humanoid.GetState();
          const isJumping =
            humanoidState === Enum.HumanoidStateType.Jumping ||
            humanoidState === Enum.HumanoidStateType.Freefall;
          const isRunning = humanoid.WalkSpeed > 16;

          const input: MovementInput = {
            position: hrp.Position,
            velocity: hrp.AssemblyLinearVelocity,
            isGrounded,
            isJumping,
            isRunning,
            timestamp: os.clock(),
            sequenceNumber: seq,
          };

          const result = validator.validate(input, state, deltaTime);

          if (!result.isValid) {
            for (const v of result.violations) {
              state.recordViolation(v.type);
              logger.warn(
                `Movement violation by ${player.Name} (${player.UserId}): ${v.type} (${v.severity}) ${v.details}`
              );
            }
          }

          const nextPosition = result.correctedPosition ?? input.position;
          const nextVelocity = result.correctedVelocity ?? input.velocity;

          if (result.correctedPosition) {
            hrp.CFrame = new CFrame(result.correctedPosition);
          }
          if (result.correctedVelocity) {
            hrp.AssemblyLinearVelocity = result.correctedVelocity;
          }

          state.updateState({
            position: nextPosition,
            velocity: nextVelocity,
            isGrounded: input.isGrounded,
            isJumping: input.isJumping,
            isRunning: input.isRunning,
            sequenceNumber: input.sequenceNumber,
          });
        }
      });

      connections.push(heartbeatConn);
      logger.info("Movement validation enabled (server-side sampling)");
    },

    onDestroy() {
      for (const conn of connections) conn.Disconnect();
      connections.clear();
    },
  };

  return { Service: MovementValidationService, stateManager };
}
