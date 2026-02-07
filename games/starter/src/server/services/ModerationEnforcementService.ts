import { createModerationEnforcementService } from "@rbx/moderation";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createModerationEnforcementService({
  datastoreName: "StarterModeration",
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const ModerationEnforcementService = handle.Service;
