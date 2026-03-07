import { createMovementValidationService } from "@broblox/movement";
import { isFlagEnabled } from "@broblox/config-featureflags";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createMovementValidationService({
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  isEnabled: () => isFlagEnabled("movement.validation.enabled"),
});

export const MovementValidationService = handle.Service;

/** Exposed so CombatService can wire the position provider. */
export const movementStateManager = handle.stateManager;
