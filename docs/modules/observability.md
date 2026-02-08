# Modules: Observability

Observability utilities — telemetry, metrics, and tracing (`@rbx/observability`). **Status: Implemented** (~44 tests).

## Purpose

- Provide production observability: structured telemetry events, counters/gauges/histograms, and distributed tracing spans.
- Ship data to the dashboard pipeline via configurable sinks.
- Reusable across games — each game configures its own event schemas.

## Public API

### Telemetry

- `Telemetry` — `emit({ category, event, level, data })` for structured event logging.

### Metrics

- `Counter`, `Gauge`, `Histogram` — metric primitives.
- `CommonMetrics` — shared metrics container for standard game metrics.

### Distributed tracing

- `Span` — `start()` → `setTag(k,v)` → `setError(err)` → `end()`.
- `CorrelationContext` — propagate request/session IDs across async boundaries.

### Service factory

- `createObservabilityService(config)` — wires up all telemetry, metrics, and tracing.
- `ObservabilityServiceConfig` — sink URLs, sample rates, batch sizes.

## Dependencies

- `@rbx/core` (service lifecycle, logging).
- `@rbx/shared-types` (branded IDs, Result type).

## Related packages

- `@rbx/analytics` — player behavior analytics (events, funnels, sessions, retention).

## Data ownership

Observability owns no player profile data. All event data is ephemeral or shipped externally.

## Trust & security

- Telemetry runs server-side. No client-sent telemetry without validation.
- PII fields are stripped before shipping. Player IDs are hashed in analytics events.
- Rate limiting on HTTP sinks prevents floods.

## Configuration

- `observability.enabled` — global kill-switch.
- `observability.sampleRate` — event sampling (0.0–1.0).
- `observability.batchSize` — events per HTTP batch.
- `observability.sinkUrl` — dashboard API endpoint.

## Observability (meta)

The package dogfoods itself: initialization and sink errors are emitted as telemetry events.

## Testing

~244 unit tests covering Telemetry emit/subscribe, Metrics counters/gauges/histograms, Span lifecycle, CorrelationContext propagation, all analytics trackers, and HTTP sink batching. Highest test count of any package.
