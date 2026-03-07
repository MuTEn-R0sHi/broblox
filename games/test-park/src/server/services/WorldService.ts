/**
 * World Service — Test Park
 *
 * Day/night cycle, weather, and world environment management.
 */

import { createWorldService } from "@broblox/world-systems";

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
