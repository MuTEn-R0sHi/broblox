/**
 * World Service — Obby Game
 *
 * Day/night cycle and weather for the obstacle course environment.
 */

import { Service, createLogger } from "@rbx/core";
import { WorldManager } from "@rbx/world-systems";

const logger = createLogger("WorldService");

const worldManager = new WorldManager({
  dayNight: {
    enabled: true,
    cycleDurationSeconds: 900, // 15 minute day cycle (longer for obby)
    startClockTime: 10, // Start at 10am (bright)
  },
  weather: {
    enabled: true,
    transitionDuration: 15,
    minChangeCooldown: 120,
  },
  season: {
    enabled: false,
  },
});

export function getWorldManager(): WorldManager {
  return worldManager;
}

export const WorldService: Service = {
  onInit() {
    worldManager.onTimePeriodChanged((evt) => {
      logger.info(`Time period changed: ${evt.previousPeriod} → ${evt.newPeriod}`);
    });

    worldManager.onWeatherChanged((evt) => {
      logger.info(`Weather changed: ${evt.previousWeather} → ${evt.newWeather}`);
    });

    logger.info("World systems initialized");
  },

  onStart() {
    worldManager.start();
    logger.info("WorldService started — day/night cycle running");
  },
};
