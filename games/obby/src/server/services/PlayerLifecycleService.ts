import { createPlayerLifecycleService } from "@rbx/core";

const handle = createPlayerLifecycleService({
  loggerName: "PlayerLifecycle",
  catchUpPhase: "onStart",
});

export const PlayerLifecycleService = handle.Service;
