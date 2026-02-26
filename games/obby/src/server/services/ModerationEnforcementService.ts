import { createModerationEnforcementService } from "@broblox/moderation";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createModerationEnforcementService({
  datastoreName: "ObbyModeration",
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const ModerationEnforcementService = handle.Service;
