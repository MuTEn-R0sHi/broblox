# Modules: Events

Scheduled in-game events with time-window management, feature-flag gates, gameplay modifiers, and start/end callbacks (`@broblox/events`). **Status: Implemented**.

## Purpose

- Define time-bounded in-game events (e.g. Double XP Weekend, Holiday Event) as data, not code.
- Automatically fire `onEventStart` / `onEventEnd` callbacks when server time crosses an event boundary.
- Gate events behind feature flags so they can be enabled/disabled from the dashboard without a deploy.
- Notify players who join mid-event without duplicating join-handling logic in each game.
- Reusable across games — each game registers its own event catalog and wires the start/end callbacks.

## Scope

**In scope**

- Time-window scheduling using `os.time()` (server Unix time).
- Per-event feature-flag kill-switch via `@broblox/config-featureflags`.
- Optional gameplay modifiers (`xpMultiplier`, `dropRateMultiplier`, `coinMultiplier`, arbitrary keys).
- Player-join notification when events are in progress.
- Pure-logic `EventScheduler` class (no Roblox API dependencies — fully unit-testable in Vitest).

**Out of scope**

- Persisting event state to DataStore (events are derived from config + time, not stored).
- Client-side event UI / banners (games connect `onEventStart` to their own remote/UI layer).
- Dynamic event creation at runtime from an external API (events are declared at startup).

## Public API

### `EventDefinition`

```ts
interface EventDefinition {
  id: string; // Stable unique identifier
  label: string; // Human-readable display name
  startTime: number; // Unix seconds (os.time())
  endTime: number; // Unix seconds, exclusive
  modifiers?: EventModifiers;
  featureFlagId?: string; // Optional dashboard kill-switch
}
```

### `EventModifiers`

```ts
interface EventModifiers {
  xpMultiplier?: number;
  dropRateMultiplier?: number;
  coinMultiplier?: number;
  [key: string]: unknown; // Game-specific modifiers
}
```

### `createEventService(config)`

Factory that returns an `EventServiceHandle`:

```ts
const handle = createEventService({
  events: [doubleXpWeekend],
  pollIntervalSeconds: 60, // default
  onEventStart: (ev) => {
    /* fire remotes, activate modifiers */
  },
  onEventEnd: (ev) => {
    /* restore defaults, clean up */
  },
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});
export const EventService = handle.Service;
```

### `EventServiceHandle`

| Method              | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `Service`           | The `Service` object — register with your game `Application`. |
| `getScheduler()`    | Access the underlying `EventScheduler`.                       |
| `getActiveEvents()` | All currently active `EventDefinition[]` at call time.        |
| `isEventActive(id)` | `true` if the event with the given id is currently active.    |

### `EventScheduler` (low-level)

Pure class with no Roblox API dependencies. Useful for tests and independent queries.

| Method                     | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `tick(now, isFlagEnabled)` | Returns `{ started, ended }` for the given timestamp.      |
| `getActiveEvents(now)`     | Events in-window at `now` (flag not applied).              |
| `isEventActive(id, now)`   | Window check only (flag not applied).                      |
| `addEvent(def)`            | Register a new event at runtime.                           |
| `removeEvent(id)`          | Deregister an event.                                       |
| `getScheduledEvents()`     | All registered definitions.                                |
| `reset()`                  | Clear active-event tracking (does not remove definitions). |

## Wiring pattern (per game)

1. Declare events in a shared config file.
2. Call `createEventService` in the game's `EventService.ts`.
3. In `onEventStart`, broadcast via the game's `EventStarted` remote and apply modifiers.
4. In `onEventEnd`, broadcast via `EventEnded` and restore defaults.

```ts
// games/starter/src/server/services/EventService.ts
const handle = createEventService({
  events: EVENTS,
  onEventStart: (ev) => {
    Remotes.EventStarted.fireAllClients(ev.id, ev.label, ev.modifiers ?? {});
  },
  onEventEnd: (ev) => {
    Remotes.EventEnded.fireAllClients(ev.id);
  },
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});
```

## Data ownership

Events are stateless at rest — they carry no DataStore footprint. The `activeIds` set lives in-memory on the server. If the server restarts mid-event, the next poll tick re-activates the event and re-fires `onEventStart`.

## Trust & security

- Event activation is entirely server-side. Clients receive a remote notification but cannot trigger or suppress events.
- Feature flags are evaluated server-side via `@broblox/config-featureflags`. A client cannot forge a flag state.
- Guard downstream modifier effects (extra XP, drop rates) server-side — the client `onEventStart` notification is for UI only.

## Configuration

- `featureFlagId` on any `EventDefinition` — if set, the event only activates when `isFlagEnabled(featureFlagId)` is `true`.
- `pollIntervalSeconds` (default `60`) — trade-off between activation latency and tick overhead.

## Observability

- Structured log on event start: `Event started: "<label>" (<id>)`.
- Structured log on event end: `Event ended: "<label>" (<id>)`.
- Log on init: `EventService initialized — N event(s) scheduled.`
- Games should emit an analytics event (e.g. `"match.event_started"`) in `onEventStart` for funnel tracking.

## Performance

- Polling runs in a `task.delay` recursive loop — one iteration per `pollIntervalSeconds`. O(n) over the event catalog; typically < 10 events per game.
- No DataStore reads during polling.

## Dependencies

- `@broblox/core` (service lifecycle, logger, `arraySize`).
- `@broblox/config-featureflags` (feature-flag gate).

## Testing

`EventScheduler` is exercised with pure Vitest unit tests (no Roblox API mocking needed). `createEventService` is tested via `create-event-service.test.ts` with a mocked `@broblox/core` and `@broblox/config-featureflags`. Each game has a corresponding `EventService.test.ts` that verifies `onEventStart`/`onEventEnd` callbacks fire with the correct remote names.
