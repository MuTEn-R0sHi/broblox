import { createMovementValidationService } from "@broblox/movement";
import { isFlagEnabled } from "@broblox/config-featureflags";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createMovementValidationService({
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  isEnabled: () => isFlagEnabled("movement.validation.enabled"),
  // Obby courses have large vertical drops (40-60+ studs) that can
  // occur during Studio lag spikes when the physics engine runs ahead
  // of the Lua VM timing.  Raise the minimum teleport distance so
  // legitimate freefall is not flagged.
  thresholds: { teleportDistanceMin: 75 },
  // RPG attributes and gear bonuses let players exceed default movement
  // speeds.  Configure the validator with the maximum possible values
  // so legitimate high-speed players aren't flagged as speed hackers.
  // Max walkSpeed ≈ 6 + 30×0.8 + gear ≈ 35, max runSpeed ≈ 35×1.5 ≈ 53
  movementConfig: {
    walkSpeed: 40,
    runSpeed: 60,
    jumpPower: 75,
  },
});

export const MovementValidationService = handle.Service;
export const movementStateManager = handle.stateManager;
