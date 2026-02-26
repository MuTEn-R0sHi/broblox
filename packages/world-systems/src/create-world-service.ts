/**
 * Factory for game-level WorldService.
 *
 * Encapsulates WorldManager lifecycle with game-specific config.
 */

import { Service, createLogger } from "@broblox/core";
import { WorldSystemsConfig } from "./types";
import { WorldManager } from "./world-manager";

export interface WorldServiceConfig {
  /** Day/night cycle duration in seconds. */
  cycleDurationSeconds?: number;
  /** Starting clock time (0–24, default 8 = 8 AM). */
  startClockTime?: number;
  /** Weather transition duration in seconds. */
  transitionDuration?: number;
  /** Minimum seconds between weather changes. */
  minChangeCooldown?: number;
  /** Full WorldSystemsConfig override (takes precedence). */
  fullConfig?: Partial<WorldSystemsConfig>;
}

export interface WorldServiceHandle {
  Service: Service;
  getWorldManager(): WorldManager;
}

export function createWorldService(config: WorldServiceConfig): WorldServiceHandle {
  const logger = createLogger("WorldService");

  const worldConfig: Partial<WorldSystemsConfig> = {
    dayNight: {
      enabled: true,
      cycleDurationSeconds: config.cycleDurationSeconds ?? 720,
      startClockTime: config.startClockTime ?? 8,
    },
    weather: {
      enabled: true,
      transitionDuration: config.transitionDuration ?? 10,
      minChangeCooldown: config.minChangeCooldown ?? 60,
    },
    ...config.fullConfig,
  };

  const worldManager = new WorldManager(worldConfig as WorldSystemsConfig);

  return {
    Service: {
      name: "WorldService",

      onInit() {
        worldManager.onTimePeriodChanged((event) => {
          logger.info(`Time period: ${event.previousPeriod} → ${event.newPeriod}`);
        });
        worldManager.onWeatherChanged((event) => {
          logger.info(`Weather: ${event.previousWeather} → ${event.newWeather}`);
        });
        logger.info("WorldService initialized.");
      },

      onStart() {
        worldManager.start();
        logger.info("WorldService started — day/night and weather active.");
      },

      onDestroy() {
        worldManager.stop();
        logger.info("WorldService stopped.");
      },
    },

    getWorldManager() {
      return worldManager;
    },
  };
}
