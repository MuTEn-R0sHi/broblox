# @broblox/events

Scheduled in-game events with time-window management, feature-flag gates, gameplay modifiers, and start/end callbacks.

## Purpose

Declarative time-bounded in-game events (e.g. Double XP Weekend, Holiday Event) that automatically fire callbacks when server time crosses event boundaries. Events are gated behind feature flags for dashboard-driven control without deploys.

## Dependencies

- `@broblox/core` — Logger, lifecycle
- `@broblox/config-featureflags` — Per-event kill-switch gates

## API Reference

### EventScheduler

Pure-logic scheduler that evaluates event time windows against `os.time()`.

```typescript
import { EventScheduler } from "@broblox/events";

const scheduler = new EventScheduler();
scheduler.addEvent({
  id: "double-xp-weekend",
  label: "Double XP Weekend",
  startTime: 1740000000,
  endTime: 1740200000,
  modifiers: { xpMultiplier: 2 },
});
```

### createEventService(config)

Factory wrapping `EventScheduler` with lifecycle hooks and player-join notification.

```typescript
import { createEventService } from "@broblox/events";

const handle = createEventService({
  events: [...],
  pollIntervalSeconds: 30,
  onEventStart: (event) => { /* broadcast to players */ },
  onEventEnd: (event) => { /* remove modifiers */ },
});
```

## Testing

- `create-event-service.test.ts` — factory lifecycle, callbacks, player hooks, feature-flag gating
- `event-scheduler.test.ts` — time windows, boundaries, tick transitions, add/remove/reset
