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
import type { MovementInput } from "./types";

declare const Players: {
  GetPlayers(): Player[];
};
declare const RunService: {
  Heartbeat: RBXScriptSignal;
};

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
  const logger = createLogger("MovementValidationService");
  const stateManager = new MovementStateManager();
  const validator = getMovementValidator();
  const connections: RBXScriptConnection[] = [];

  const MovementValidationService: Service = {
    onInit() {
      config.onPlayerRemoving((player) => {
        stateManager.removeState(player.UserId);
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

          const state = stateManager.getState(player.UserId, hrp.Position);
          const seq = state.incrementSequence();

          const isGrounded = humanoid.FloorMaterial !== Enum.Material.Air;
          const humanoidState = humanoid.GetState();
          const isJumping = humanoidState === Enum.HumanoidStateType.Jumping;
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
