/**
 * Observability Service — Obby Game
 *
 * Wires structured telemetry, metrics, and correlation context.
 * Uses the @broblox/observability package.
 *
 * When DASHBOARD_URL and DASHBOARD_API_KEY attributes are set on the place,
 * an HTTP sink is registered that batches events/metrics to the dashboard API.
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

function getPlaceAttribute(name: string): string | undefined {
  const store = game.GetService("ServerStorage");
  const tag = store.FindFirstChild(name);
  return tag?.Value;
}

const dashboardUrl = getPlaceAttribute("DASHBOARD_URL");
const dashboardApiKey = getPlaceAttribute("DASHBOARD_API_KEY");

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
