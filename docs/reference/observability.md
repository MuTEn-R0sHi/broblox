# Reference: Observability

The `@rbx/observability` package provides telemetry, metrics, span tracing, and correlation context for game instrumentation.

## Installation

```bash
pnpm add @rbx/observability
```

## Telemetry

Emit structured events for analytics and debugging.

```typescript
import { emit, emitPlayer } from "@rbx/observability";

// Basic event
emit("game", "player_joined", { region: "us-east" });

// With player context (auto-enriched)
emitPlayer(player, "item_purchased", { itemId: "sword_001", price: 100 });
```

### Event Structure

```typescript
interface TelemetryEvent {
  category: string;
  name: string;
  level: "debug" | "info" | "warn" | "error";
  timestamp: number;
  clock: number;
  context: unknown;
  data: Record<string, unknown>;
}
```

## Metrics

Track numeric measurements over time.

```typescript
import { createCounter, createGauge, createHistogram, time } from "@rbx/observability";

const requests = createCounter("requests_total", { endpoint: "handshake" });
const errors = createCounter("errors_total", { type: "validation" });

const playersOnline = createGauge("players_online");

const requestSize = createHistogram("request_size_bytes");
const handlerLatency = createHistogram("request_duration_ms", { endpoint: "action" });

requests.inc();
playersOnline.set(42);
requestSize.observe(1024);

time(handlerLatency, () => {
  // ... do work ...
});
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
import { startSpan, withSpan } from "@rbx/observability";

// Manual span management
const span = startSpan("process_action");
span.setAttributes({ actionId: "jump" });
// ... do work ...
span.end();

// Automatic span management (recommended)
withSpan("load_player_data", (span) => {
  span.setAttribute("playerId", 123);
  // ... do work ...
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

## Correlation Context

Propagate request-scoped data across async operations.

```typescript
import { initContext, getContext, setContext, getPlayerContext } from "@rbx/observability";

// Initialize once at startup
initContext();

// Update global context (server/client)
setContext({ tags: { region: "us-east" } });

// Get context anywhere in the call chain
const ctx = getContext();
print(ctx.serverId);

// Player contexts are per-user
const playerCtx = getPlayerContext(player);
print(playerCtx.playerId);
```

### Automatic Context Enrichment

Telemetry events and spans automatically include correlation context:

```typescript
setContext({ playerId: "123", sessionId: "abc" });

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

## Node/Vitest compatibility

`@rbx/observability` is written in a roblox-ts style, where strings/arrays often use Luau idioms like `.size()`. The implementation includes internal fallbacks so it can execute under Node-based unit tests (Vitest) without requiring global prototype polyfills.

## Built-in metrics

Some packages emit standardized metrics via `createCounter` / `createHistogram`. For moderation sync propagation, runtime publishes:

- `moderation_sync_received_total` (labels: `topic`)
- `moderation_sync_decode_errors_total` (labels: `topic`)
- `moderation_sync_message_age_ms` histogram (labels: `topic`)

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
import { emit, incrementCounter, recordTiming, withSpan, setContext } from "@rbx/observability";

function handlePlayerAction(player: Player, action: ActionRequest) {
  // Set context for this request
  setContext({
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
