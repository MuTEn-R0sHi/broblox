/**
 * World Service — Obby Game
 *
 * Day/night cycle and weather for the obstacle course environment.
 */

import { createWorldService } from "@rbx/world-systems";

const handle = createWorldService({
  cycleDurationSeconds: 900,
  startClockTime: 10,
  transitionDuration: 15,
  minChangeCooldown: 120,
  fullConfig: {
    season: { enabled: false },
  },
});

export const WorldService = handle.Service;
export const getWorldManager = () => handle.getWorldManager();
