import { createPlayerLifecycleService } from "@broblox/core";

const handle = createPlayerLifecycleService({
  loggerName: "PlayerLifecycle",
  catchUpPhase: "onStart",
});

export const PlayerLifecycleService = handle.Service;
