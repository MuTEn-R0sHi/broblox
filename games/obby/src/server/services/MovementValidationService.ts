/**
 * Movement Validation Service (Obby)
 *
 * Server-authoritative movement validation loop. Runs every Heartbeat,
 * reads each player's HumanoidRootPart state, validates via
 * `@rbx/movement`, and applies soft corrections for violations.
 *
 * Gated by the `movement.validation.enabled` feature flag (kill-switch).
 */

import { Service, createLogger } from "@rbx/core";
import { Players, RunService } from "@rbxts/services";
import { getMovementValidator, MovementStateManager, type MovementInput } from "@rbx/movement";
import { isFlagEnabled } from "@rbx/config-featureflags";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("MovementValidationService");

const stateManager = new MovementStateManager();
const validator = getMovementValidator();
const connections: RBXScriptConnection[] = [];

function getHumanoidRootPart(character: Model): BasePart | undefined {
  const hrp = character.FindFirstChild("HumanoidRootPart");
  if (hrp && hrp.IsA("BasePart")) return hrp;
  return undefined;
}

function getHumanoid(character: Model): Humanoid | undefined {
  return character.FindFirstChildOfClass("Humanoid");
}

export const MovementValidationService: Service = {
  onInit() {
    PlayerLifecycleService.onPlayerRemoving((player) => {
      stateManager.removeState(player.UserId);
    });

    const heartbeatConn = RunService.Heartbeat.Connect((dt) => {
      // Kill-switch: skip validation entirely when flag is off
      if (!isFlagEnabled("movement.validation.enabled")) return;

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
              `Movement violation by ${player.Name} (${player.UserId}): ` +
                `${v.type} (${v.severity}) ${v.details}`
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
