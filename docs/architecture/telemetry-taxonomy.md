# Architecture: Telemetry taxonomy (privacy-safe)

This page defines a consistent event taxonomy so telemetry stays useful, low-noise, and privacy-safe.

## Goals

- Make events actionable (alerts, rollbacks, investigations).
- Keep payloads small and bounded.
- Avoid collecting sensitive or unnecessary data.

## Global rules

- No secrets, tokens, or internal credentials.
- No off-platform identifiers.
- Avoid raw freeform text (especially chat).
- Prefer buckets over raw values (FPS tier, ping bucket).
- Every event has:
  - `eventName`
  - `eventVersion`
  - `timestamp`
  - `serverId/jobId/placeId` (when server-side)
  - optional `matchId`
  - optional `playerUserId` (only when required)

## Naming scheme

Use dot-separated namespaces:

- `security.*`
- `match.*`
- `queue.*`
- `economy.*`
- `ops.*`
- `client.*`

## Recommended common fields

- `env`: `dev|stage|prod`
- `buildId`
- `protocolVersion`
- `deviceClass`: `kbm|gamepad|touch`
- `region`

## Event catalog (test-park)

### Security

- `security.remote_invalid_payload`
  - fields: `remoteName`, `reasonCode`, `payloadSizeBytes`

- `security.remote_rate_limited`
  - fields: `remoteName`, `retryAfterMs`

- `security.movement_violation`
  - fields: `violationType`, `severityBucket`

### Match

- `match.started`
  - fields: `mode`, `teamSize`, `mapId`

- `match.ended`
  - fields: `mode`, `durationSecBucket`, `result`

### Queue

- `queue.joined`
  - fields: `mode`, `partySize`, `regionPreference`

- `queue.match_found`
  - fields: `mode`, `queueTimeSecBucket`

### Economy

- `economy.grant_applied`
  - fields: `grantType`, `idempotencyKeyHash`

- `economy.duplicate_grant_blocked`
  - fields: `grantType`

### Ops

- `ops.release_published`
  - fields: `targetEnv`, `artifactId`

- `ops.config_changed`
  - fields: `configKey`, `configVersion`, `approvalStatus`

### Client

- `client.performance_bucket`
  - fields: `fpsTier`, `memoryTier`

## Retention guidance

- High-volume client events: short retention, aggregated storage.
- Audit/ops events: longer retention.
- Security events: enough retention to investigate abuse waves.

## Change process

- Any new event category should be documented here.
- Any event with `playerUserId` must justify why it’s required.
