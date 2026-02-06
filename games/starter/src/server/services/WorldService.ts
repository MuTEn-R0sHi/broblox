/**
 * World Service — Starter Game
 *
 * Day/night cycle, weather, and world environment management.
 */

import { Service, createLogger } from "@rbx/core";
import { WorldManager } from "@rbx/world-systems";

const logger = createLogger("WorldService");

const worldManager = new WorldManager({
  dayNight: {
    enabled: true,
    cycleDurationSeconds: 720, // 12 minute day cycle
    startClockTime: 8, // Start at 8am
  },
  weather: {
    enabled: true,
    transitionDuration: 10,
    minChangeCooldown: 60,
  },
  season: {
    enabled: false, // Enable when seasonal content is ready
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
