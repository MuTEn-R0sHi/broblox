import { createPlayerLifecycleService } from "@rbx/core";

const handle = createPlayerLifecycleService({
  catchUpPhase: "onInit",
});

export const PlayerLifecycleService = handle.Service;
