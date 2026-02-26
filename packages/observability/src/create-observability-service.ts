/**
 * Factory for game-level ObservabilityService.
 *
 * Wires telemetry sinks and metric sinks at startup, and flushes
 * everything on shutdown.
 */

import { Service, createLogger } from "@broblox/core";
import { TelemetrySink, MetricSink, TelemetryLevel } from "./types";
import { registerSink, flushAll, useConsoleSink } from "./telemetry";
import { registerMetricSink, flushMetrics, useConsoleMetricSink } from "./metrics";

export interface ObservabilityServiceConfig {
  /** Custom telemetry sinks to register. */
  telemetrySinks?: TelemetrySink[];
  /** Custom metric sinks to register. */
  metricSinks?: MetricSink[];
  /** Enable built-in console sink (default true in dev). */
  enableConsoleSink?: boolean;
  /** Enable built-in console metric sink (default false). */
  enableConsoleMetricSink?: boolean;
  /** Minimum telemetry level for console sink (default "info"). */
  consoleMinLevel?: TelemetryLevel;
}

export interface ObservabilityServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
}

export function createObservabilityService(
  config: ObservabilityServiceConfig = {}
): ObservabilityServiceHandle {
  const logger = createLogger("ObservabilityService");
  const disconnects: Array<() => void> = [];

  return {
    Service: {
      name: "ObservabilityService",

      onInit() {
        if (config.enableConsoleSink !== false) {
          disconnects.push(useConsoleSink(config.consoleMinLevel));
        }

        if (config.enableConsoleMetricSink) {
          disconnects.push(useConsoleMetricSink());
        }

        if (config.telemetrySinks) {
          for (const sink of config.telemetrySinks) {
            disconnects.push(registerSink(sink));
          }
        }

        if (config.metricSinks) {
          for (const sink of config.metricSinks) {
            disconnects.push(registerMetricSink(sink));
          }
        }

        logger.info(`ObservabilityService initialized — ${disconnects.size()} sinks registered.`);
      },

      onStart() {
        logger.info("ObservabilityService started.");
      },

      onDestroy() {
        flushAll();
        flushMetrics();

        for (const disconnect of disconnects) {
          disconnect();
        }

        logger.info("ObservabilityService stopped.");
      },
    },
  };
}
