# Architecture: Observability

Operational control is part of the product.

## What we observe

- Security signals (invalid payloads, rate limit violations, impossible actions)
- Match health (server perf, player ping distribution, disconnect reasons)
- Economy integrity (duplicate grants, receipt mismatches)
- UX health (client FPS tiers, input device mix)

## Correlation model

Every log/event should attach:

- `serverId`
- `placeId`
- `jobId`
- `matchId` (if applicable)
- `playerUserId` (when relevant)
- `requestId` (for remote calls)

## Event taxonomy

Implemented in `@broblox/observability` and `@broblox/analytics`:

- `security.*` (violations, detectors)
- `match.*` (start/end, team composition)
- `economy.*` (grants, receipts)
- `ops.*` (publishes, promotions, config changes)
- `client.*` (device tier, fps bucket)

## Actionability rules

- If an event can’t trigger a decision (alert, rollback, ban review), it’s noise.
- Sampling is allowed for high-volume client events.

## Event output (phased)

### Phase 1: Structured console logs

Events are logged to console as structured JSON using `@broblox/observability`:

```typescript
import { emit } from "@broblox/observability";

// Usage
emit({ category: "security", action: "invalid_payload", remote: "Intent_DoAction", playerId: 123 });
```

Review process: Manual review via Studio output or Roblox Developer Console.

### Phase 2: Aggregation service ✅

- Events are batched and sent to the dashboard via HTTP sinks (`@broblox/observability`)
- Dashboard `/api/telemetry` endpoint ingests and indexes events in MariaDB
- `/telemetry` dashboard page: KPI cards ("Active Players (1h)", "Active Servers (1h)", "Events (24h)", "Errors (24h)"), category breakdown, recent event stream with filters
- Root dashboard page: game overview, recent activity feed, aggregated counts via `$queryRaw COUNT(DISTINCT ...)`

### Phase 3+: Full observability stack

- Structured log sink (e.g., Axiom, Datadog, self-hosted)
- Real-time dashboards
- Alerting integration (PagerDuty, Slack, Discord)

## Alerting strategy

### P0 alerts (immediate response required)

| Alert             | Trigger                                      | Response                        |
| ----------------- | -------------------------------------------- | ------------------------------- |
| Economy anomaly   | Duplicate grant detected                     | Disable grants, investigate     |
| Security spike    | >100 invalid payloads/min from single player | Auto-kick, flag for review      |
| Server crash rate | >5% of servers crash in 10 min               | Rollback release                |
| Config failure    | Config fetch fails for >50% of servers       | Revert to defaults, investigate |

### P1 alerts (investigate within 1 hour)

| Alert               | Trigger                           | Response                                |
| ------------------- | --------------------------------- | --------------------------------------- |
| Elevated error rate | >1% of remotes returning errors   | Investigate, consider rollback          |
| Matchmaking delays  | Queue times >5min for 10+ players | Check matchmaker health                 |
| Rate limit spikes   | >10% of requests rate-limited     | Check for abuse or misconfigured client |

### P2 alerts (review daily)

| Alert                   | Trigger                           | Response             |
| ----------------------- | --------------------------------- | -------------------- |
| Unusual device mix      | Device distribution shifts >20%   | Verify client builds |
| Performance degradation | Server tick rate drops below 50Hz | Profile and optimize |

### Phase 1 alerting (manual)

- No automated alerting yet
- Daily review of security event logs
- Check for patterns: repeated offenders, unusual error spikes

### Phase 2+ alerting

- Discord webhook notifications implemented for CI/CD events (publish success, promotion approval)
- Dashboard shows alert history and acknowledgment
- Integrate with Discord webhook for P0 game alerts (planned)

## Metrics to track (when available)

### Server-side

- Requests per second (by remote)
- Error rate (by remote, by error code)
- P50/P95/P99 latency (by remote)
- Rate limit hit rate
- Server memory and tick rate
- Moderation sync propagation health (e.g. received count, decode errors, message age)

### Client-side (sampled)

- FPS distribution
- Ping distribution
- Device class distribution
- Client error rate

### Business metrics

- Concurrent players
- Match completions
- Economy transactions

## Dashboard integration

- Security events are aggregated into player “cases”.
- Admin actions produce immutable audit records.
- Rollouts and kill-switch toggles are logged.
