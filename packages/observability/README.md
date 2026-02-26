# @broblox/observability

Observability utilities for Roblox games — telemetry, metrics, and tracing.

## Purpose

This package provides production observability:

- **Telemetry** — Structured event logging
- **Metrics** — Performance counters and gauges
- **Spans** — Distributed tracing for operations
- **Correlation** — Request/session context propagation

## Dependencies

- `@broblox/core` — Logging utilities
- `@broblox/shared-types` — Type definitions

## Features

### Telemetry Events

```typescript
import { Telemetry } from "@broblox/observability";

// Emit structured events
Telemetry.emit({
  category: "combat",
  event: "player_killed",
  level: "info",
  data: {
    killer: killerId,
    victim: victimId,
    weapon: weaponId,
    distance: hitDistance,
  },
});
```

### Performance Spans

```typescript
import { Span } from "@broblox/observability";

// Time operations with context
const span = Span.start("matchmaking.find_match");
try {
  const match = await findMatch(player);
  span.setTag("match_id", match.id);
  span.setTag("queue_time_ms", queueTime);
} catch (error) {
  span.setError(error);
} finally {
  span.end(); // Automatically records duration
}
```

### Correlation Context

```typescript
import { CorrelationContext } from "@broblox/observability";

// Set context that propagates through calls
CorrelationContext.set("session_id", sessionId);
CorrelationContext.set("player_id", playerId);

// All telemetry/spans automatically include context
```

### Metrics

```typescript
import { Metrics } from "@broblox/observability";

// Counters
Metrics.increment("matches_started");

// Gauges
Metrics.gauge("players_in_queue", queueSize);

// Histograms
Metrics.histogram("match_duration_seconds", duration);
```

## Related Docs

- [Observability Architecture](../../docs/architecture/observability.md)
- [Telemetry Taxonomy](../../docs/architecture/telemetry-taxonomy.md)
- [Observability Reference](../../docs/reference/observability.md)
