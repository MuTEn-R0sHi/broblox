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

## Event taxonomy (planned)

- `security.*` (violations, detectors)
- `match.*` (start/end, team composition)
- `economy.*` (grants, receipts)
- `ops.*` (publishes, promotions, config changes)
- `client.*` (device tier, fps bucket)

## Actionability rules

- If an event can’t trigger a decision (alert, rollback, ban review), it’s noise.
- Sampling is allowed for high-volume client events.

## Dashboard integration

- Security events are aggregated into player “cases”.
- Admin actions produce immutable audit records.
- Rollouts and kill-switch toggles are logged.
