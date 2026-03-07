import { createPlayerLifecycleService } from "@broblox/core";

const handle = createPlayerLifecycleService({
  catchUpPhase: "onInit",
});

export const PlayerLifecycleService = handle.Service;
