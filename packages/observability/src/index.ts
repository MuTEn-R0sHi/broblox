/**
 * @broblox/observability
 *
 * Observability utilities for Roblox games.
 * Provides:
 * - Correlation context for distributed tracing
 * - Structured telemetry events
 * - Performance tracking (spans)
 * - Metrics collection
 */

export * from "./types";
export * from "./context";
export * from "./telemetry";
export * from "./metrics";
export * from "./span";
export { createObservabilityService } from "./create-observability-service";
export type {
  ObservabilityServiceConfig,
  ObservabilityServiceHandle,
} from "./create-observability-service";
