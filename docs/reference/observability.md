# Reference: Observability

The `@rbx/observability` package provides telemetry, metrics, span tracing, and correlation context for game instrumentation.

## Installation

```bash
pnpm add @rbx/observability
```

## Telemetry

Emit structured events for analytics and debugging.

```typescript
import { emit, TelemetryEvent } from "@rbx/observability";

// Basic event
emit({
  name: "player_joined",
  category: "lifecycle",
  data: { region: "us-east" },
});

// With player context (auto-enriched)
emit({
  name: "item_purchased",
  category: "economy",
  data: { itemId: "sword_001", price: 100 },
});
```

### Event Structure

```typescript
interface TelemetryEvent {
  name: string; // Event name (e.g., "player_joined")
  category: string; // Category for grouping
  data?: unknown; // Event-specific payload
  timestamp?: number; // Auto-filled if not provided
  sessionId?: string; // Auto-filled from context
  playerId?: string; // Auto-filled from context
  serverJobId?: string; // Auto-filled from context
}
```

### Configuring Telemetry

```typescript
import { configureTelemetry } from "@rbx/observability";

configureTelemetry({
  enabled: true,
  sampleRate: 0.1, // Sample 10% of events
  batchSize: 50, // Batch events before flush
  flushIntervalMs: 5000, // Flush every 5 seconds
});
```

## Metrics

Track numeric measurements over time.

```typescript
import { incrementCounter, setGauge, recordHistogram, recordTiming } from "@rbx/observability";

// Counters - monotonically increasing values
incrementCounter("requests_total", { endpoint: "handshake" });
incrementCounter("errors_total", { type: "validation" }, 1);

// Gauges - point-in-time values
setGauge("players_online", 42);
setGauge("memory_mb", 256.5);

// Histograms - distribution of values
recordHistogram("request_size_bytes", 1024);
recordHistogram("damage_dealt", 25, { weapon: "sword" });

// Timing - convenience for duration measurements
recordTiming("request_duration_ms", 45.2, { endpoint: "action" });
```

### Metric Types

| Type      | Use Case          | Example                         |
| --------- | ----------------- | ------------------------------- |
| Counter   | Cumulative totals | Requests, errors, purchases     |
| Gauge     | Current state     | Players online, memory usage    |
| Histogram | Distributions     | Request sizes, damage values    |
| Timing    | Durations         | Response times, processing time |

## Span Tracing

Track operation timing and nested calls.

```typescript
import { startSpan, endSpan, withSpan } from "@rbx/observability";

// Manual span management
const spanId = startSpan("process_action", { actionId: "jump" });
// ... do work ...
endSpan(spanId);

// Automatic span management (recommended)
withSpan("load_player_data", { playerId: "123" }, () => {
  // ... do work ...
  // Span automatically ends when function returns
});

// Nested spans create a trace tree
withSpan("handle_request", {}, () => {
  withSpan("validate_input", {}, () => {
    /* ... */
  });
  withSpan("process_logic", {}, () => {
    /* ... */
  });
  withSpan("send_response", {}, () => {
    /* ... */
  });
});
```

### Span Attributes

```typescript
startSpan("operation_name", {
  // Custom attributes
  playerId: "123",
  actionType: "attack",
  targetId: "enemy_456",
});
```

## Correlation Context

Propagate request-scoped data across async operations.

```typescript
import {
  setCorrelationContext,
  getCorrelationContext,
  withCorrelationContext,
  clearCorrelationContext,
} from "@rbx/observability";

// Set context for current scope
setCorrelationContext({
  requestId: "req_abc123",
  playerId: "player_456",
  sessionId: "session_789",
});

// Get context anywhere in the call chain
const ctx = getCorrelationContext();
print(ctx.requestId); // "req_abc123"

// Scoped context (automatically restored after)
withCorrelationContext({ traceId: "trace_xyz" }, () => {
  // Context includes traceId here
  doSomething();
  // Context automatically restored after this block
});

// Clear context when done
clearCorrelationContext();
```

### Automatic Context Enrichment

Telemetry events and spans automatically include correlation context:

```typescript
setCorrelationContext({ playerId: "123", sessionId: "abc" });

emit({
  name: "action_completed",
  category: "gameplay",
  data: { actionId: "jump" },
});
// Event automatically includes playerId and sessionId
```

## Best Practices

### 1. Use Consistent Event Names

```typescript
// Good - consistent naming
emit({ name: "player_joined", category: "lifecycle" });
emit({ name: "player_left", category: "lifecycle" });

// Avoid - inconsistent naming
emit({ name: "PlayerJoined", category: "lifecycle" });
emit({ name: "player-left", category: "lifecycle" });
```

### 2. Categorize Events

```typescript
// Categories help with filtering and dashboards
const categories = {
  lifecycle: ["player_joined", "player_left", "round_started"],
  economy: ["item_purchased", "currency_earned", "trade_completed"],
  combat: ["damage_dealt", "player_killed", "ability_used"],
  errors: ["validation_failed", "timeout", "rate_limited"],
};
```

### 3. Use Spans for Operations

```typescript
// Wrap significant operations in spans
withSpan("handle_remote", { remote: "DoAction" }, () => {
  withSpan("validate", {}, () => validateInput(data));
  withSpan("process", {}, () => processAction(data));
  withSpan("respond", {}, () => sendResponse(result));
});
```

### 4. Sample High-Volume Events

```typescript
// Sample frequent events to reduce overhead
configureTelemetry({
  sampleRate: 0.01, // 1% for high-volume events
});

// Or sample manually
if (math.random() < 0.01) {
  emit({ name: "frame_update", category: "performance" });
}
```

## Integration Example

```typescript
import {
  emit,
  incrementCounter,
  recordTiming,
  withSpan,
  setCorrelationContext,
} from "@rbx/observability";

function handlePlayerAction(player: Player, action: ActionRequest) {
  // Set context for this request
  setCorrelationContext({
    playerId: tostring(player.UserId),
    actionId: action.actionId,
  });

  return withSpan("handle_action", { action: action.actionId }, () => {
    const startTime = os.clock();

    // Validate
    const validation = withSpan("validate", {}, () => {
      return validateAction(action);
    });

    if (!validation.success) {
      incrementCounter("action_rejected", { reason: "validation" });
      return { accepted: false };
    }

    // Process
    const result = withSpan("process", {}, () => {
      return processAction(player, action);
    });

    // Record metrics
    const duration = (os.clock() - startTime) * 1000;
    recordTiming("action_duration_ms", duration, { action: action.actionId });
    incrementCounter("action_processed", { action: action.actionId });

    // Emit event
    emit({
      name: "action_completed",
      category: "gameplay",
      data: { action: action.actionId, success: result.success },
    });

    return result;
  });
}
```
