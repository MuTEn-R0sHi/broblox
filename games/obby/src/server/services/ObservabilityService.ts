/**
 * Observability Service — Obby Game
 *
 * Wires structured telemetry, metrics, and correlation context.
 * Uses the @broblox/observability package.
 */

import { createObservabilityService } from "@broblox/observability";

const handle = createObservabilityService({
  enableConsoleSink: true,
  enableConsoleMetricSink: false,
  consoleMinLevel: "info",
});

export const ObservabilityService = handle.Service;
