import { createMovementValidationService } from "@rbx/movement";
import { isFlagEnabled } from "@rbx/config-featureflags";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createMovementValidationService({
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  isEnabled: () => isFlagEnabled("movement.validation.enabled"),
});

export const MovementValidationService = handle.Service;

/** Exposed so CombatService can wire the position provider. */
export const movementStateManager = handle.stateManager;
