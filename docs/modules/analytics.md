# Modules: Analytics

Structured event tracking, funnel analysis, session lifecycle, and player retention (`@broblox/analytics`). **Status: Implemented**.

## Purpose

- Emit and validate named analytics events from any game service.
- Track multi-step player funnels (e.g. tutorial completion, monetisation flows) with conversion stats.
- Record per-session playtime and surface it via a heartbeat-based `SessionTracker`.
- Measure D1/D7/D14/D30 retention without requiring an external pipeline at the game-server level.
- Reusable across games — each game registers its own event catalog and analytics config.

## Scope

**In scope**

- Server-authoritative event emission with schema validation (required fields, expected data keys).
- Funnel and session state tracked in-memory per server; flushed on player leave.
- Retention records persisted via `@broblox/data` DataStore.
- `createAnalyticsService` factory that produces a plug-in Roblox `Service`.

**Out of scope**

- Real-time dashboards or external warehouses (those consume the events via an Open Cloud pipeline).
- Client-side event emission (all events are server-authoritative).
- PII fields — payloads must be privacy-safe by convention.

## Public API

### Types

| Type               | Description                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `EventCategory`    | Union of valid category strings: `"player" \| "match" \| "economy" \| "social" \| "ui" \| "progression" \| "combat" \| "custom"` |
| `AnalyticsEvent`   | Emitted event: `name`, `category`, `playerId`, `data`, `timestamp`, `serverId`                                                   |
| `EventDefinition`  | Registered event schema: `name`, `category`, `description`, `expectedFields?`, `version?`                                        |
| `FunnelDefinition` | Ordered funnel steps with optional `timeoutSec`                                                                                  |
| `FunnelProgress`   | Per-player funnel state                                                                                                          |
| `FunnelStats`      | Aggregated conversion stats (entered, stepCounts, completed, conversionRate)                                                     |
| `SessionData`      | Per-player session: start time, heartbeat, playtimeSec, active                                                                   |
| `RetentionRecord`  | DataStore-persisted record: firstSeen, returnDays, totalSessions                                                                 |
| `RetentionDay`     | `1 \| 7 \| 14 \| 30`                                                                                                             |

### Trackers

- **`EventTracker`** — registers event schemas and emits validated `AnalyticsEvent` objects.
- **`FunnelTracker`** — advances per-player funnel state; computes `FunnelStats`.
- **`SessionTracker`** — records session start/heartbeat/end; accumulates playtime.
- **`RetentionTracker`** — loads and writes `RetentionRecord` from DataStore.

### Service factory

```ts
const handle = createAnalyticsService(config);
export const AnalyticsService = handle.Service;
```

`AnalyticsServiceConfig` includes the event/funnel/session/retention configurations and a flush callback.

## Standard event names

Games are expected to emit events with the following naming convention: `<category>.<action>` (dot-separated, lower-snake-case).

| Event              | Category      | Data fields                          |
| ------------------ | ------------- | ------------------------------------ |
| `player.level_up`  | `progression` | `level`, `xp`, `previousLevel`       |
| `player.join`      | `player`      | `platform`, `accountAgeDays`         |
| `player.leave`     | `player`      | `sessionDurationSec`, `playtimeSec`  |
| `action.kill`      | `combat`      | `weaponId`, `victimId`, `damageType` |
| `economy.purchase` | `economy`     | `itemId`, `price`, `currency`        |

> Use `"combat"` for player-vs-player or player-vs-enemy kill events — `"action"` is not a valid category.

## Data ownership

- Session and funnel state: in-memory per game server (lost on server crash).
- Retention records: `@broblox/data` DataStore key `analytics:retention:{playerId}`.
- The analytics service does **not** write to the player profile; it is side-effect-only.

## Trust & security

- All events emitted server-side only. No client remote triggers analytics directly.
- `expectedFields` validation logs a warning on unknown fields but does not block emission — prevents breakage on schema drift.
- `playerId: 0` is reserved for server-level events (not tied to a specific player).

## Configuration

- `analytics.enabled` — global kill-switch.
- `analytics.sessionHeartbeatSec` — heartbeat interval (default 60 s).
- `analytics.funnelTimeoutSec` — per-funnel timeout override.
- `analytics.retentionEnabled` — whether to persist retention records to DataStore.

## Observability

The analytics module itself emits no recursive analytics events. Errors and validation warnings are written to the structured logger under the `AnalyticsService` namespace.

## Dependencies

- `@broblox/core` (service lifecycle, logger).
- `@broblox/data` (DataStore for retention persistence).
- `@broblox/config-featureflags` (kill-switch).

## Testing

Unit-tested trackers: `EventTracker`, `FunnelTracker`, `SessionTracker`, `RetentionTracker`. Integration tests via game-level `AnalyticsService.test.ts` in each game to verify event wiring and category correctness.
