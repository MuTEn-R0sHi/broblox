/**
 * World Service — Starter Game
 *
 * Day/night cycle, weather, and world environment management.
 */

import { createWorldService } from "@rbx/world-systems";

const handle = createWorldService({
  cycleDurationSeconds: 720,
  startClockTime: 8,
  transitionDuration: 10,
  minChangeCooldown: 60,
  fullConfig: {
    season: { enabled: false },
  },
});

export const WorldService = handle.Service;
export const getWorldManager = () => handle.getWorldManager();
