/**
 * Observability Service — Obby Game
 *
 * Wires structured telemetry, metrics, and correlation context.
 * Uses the @broblox/observability package.
 *
 * When DASHBOARD_URL and DASHBOARD_API_KEY StringValue instances exist under
 * ServerStorage, an HTTP sink is registered that batches events/metrics to the
 * dashboard API. ServerStorage is used because Roblox does not support
 * environment variables; child StringValue objects act as server-side config.
 */

import {
  createObservabilityService,
  HttpTelemetrySink,
  HttpMetricSink,
} from "@broblox/observability";

declare const game: {
  GetService(name: "ServerStorage"): {
    FindFirstChild(name: string): { Value: string } | undefined;
  };
};

function getServerStorageConfig(name: string): string | undefined {
  const store = game.GetService("ServerStorage");
  const tag = store.FindFirstChild(name);
  return tag?.Value;
}

const dashboardUrl = getServerStorageConfig("DASHBOARD_URL");
const dashboardApiKey = getServerStorageConfig("DASHBOARD_API_KEY");

const httpTelemetrySink =
  dashboardUrl && dashboardApiKey
    ? new HttpTelemetrySink({ baseUrl: dashboardUrl, apiKey: dashboardApiKey })
    : undefined;

const httpMetricSink =
  dashboardUrl && dashboardApiKey
    ? new HttpMetricSink({ baseUrl: dashboardUrl, apiKey: dashboardApiKey })
    : undefined;

const handle = createObservabilityService({
  enableConsoleSink: true,
  enableConsoleMetricSink: false,
  consoleMinLevel: "info",
  telemetrySinks: httpTelemetrySink ? [httpTelemetrySink] : undefined,
  metricSinks: httpMetricSink ? [httpMetricSink] : undefined,
});

export const ObservabilityService = handle.Service;
