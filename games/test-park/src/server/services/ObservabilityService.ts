/**
 * Observability Service — Test Park
 *
 * Wires structured telemetry, metrics, and correlation context.
 * Uses the @broblox/observability package.
 *
 * The console sink is enabled by default in development.
 * Add custom sinks (e.g., HTTP sink to dashboard API) in production.
 */

import { createObservabilityService } from "@broblox/observability";

const handle = createObservabilityService({
  enableConsoleSink: true,
  enableConsoleMetricSink: false,
  consoleMinLevel: "info",
});

export const ObservabilityService = handle.Service;
