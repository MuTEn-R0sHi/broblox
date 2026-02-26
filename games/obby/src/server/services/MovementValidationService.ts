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
});

export const MovementValidationService = handle.Service;
export const movementStateManager = handle.stateManager;
