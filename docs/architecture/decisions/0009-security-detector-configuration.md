# ADR-0009: Security Detector Configuration

**Status:** Accepted  
**Date:** 2026-02-27  
**Relates to:** S1, S2, S3 from the improvement plan

## Context

The security detection subsystem (`@broblox/security`) had several architectural issues:

1. **Hardcoded thresholds** — Speed, teleport, and cache-TTL values were inline magic numbers, impossible to adjust without modifying library code.
2. **No aerial awareness** — `checkSpeed()` used a single speed threshold for all movement types. Players legitimately moving faster in the air (jumping, falling, launchers) triggered false positives.
3. **Manual teleport allow-listing** — `checkTeleport()` relied on a `allowedTeleport` boolean parameter that callers had to set per-call. Any server-initiated teleport (respawn, zipline, waypoint) that forgot to pass `true` would trigger a false violation.
4. **Memory leaks** — Per-player detection state Maps (`speedStates`, `rateStates`, `trustCache`, `playerStates`) grew unboundedly because cleanup functions existed but were not wired into the player lifecycle.

## Decision

### Centralised constants (S2)

All anticheat thresholds are now exported from `@broblox/constants/anticheat`:

- `ANTICHEAT_MAX_SPEED_STUDS_PER_SEC` (100)
- `ANTICHEAT_SPEED_CHECK_INTERVAL_SEC` (0.5)
- `ANTICHEAT_MAX_TELEPORT_DISTANCE_STUDS` (200)
- `TRUST_SCORE_CACHE_TTL_SEC` (60)
- `DEFAULT_TEMP_BAN_DURATION_HOURS` (24)

Consumer files import from `@broblox/constants` instead of declaring local constants.

### Aerial speed multiplier (S3)

`checkSpeed()` now accepts an optional `isAerial` parameter. When `true`, the allowed speed threshold is scaled by `1.5×`:

```typescript
const maxSpeed = isAerial
  ? ANTICHEAT_MAX_SPEED_STUDS_PER_SEC * 1.5
  : ANTICHEAT_MAX_SPEED_STUDS_PER_SEC;
```

The caller is responsible for checking `Humanoid.FloorMaterial` to determine aerial status.

### Timed teleport suppression (S3)

The `allowedTeleport` parameter was replaced with a time-based suppression system:

```typescript
suppressTeleportCheck(player, durationSeconds);
```

Game features call `suppressTeleportCheck()` before teleporting a player. The detector automatically skips checks during the suppression window. This eliminates the need for callers to thread a boolean through every position update.

### Auto-cleanup via lifecycle (S1)

`createSecurityService` now calls `cleanupTrustCache(player)` alongside the existing `cleanupPlayer()` and `cleanupEnforcementState()` in its `onPlayerRemoving` handler, ensuring all four per-player Maps are cleaned up on player leave.

## Consequences

- Game code importing `@broblox/security` must update `checkSpeed()` calls to pass `isAerial` if they want aerial tolerance.
- All `checkTeleport()` call sites that passed `allowedTeleport = true` must be updated to call `suppressTeleportCheck()` instead.
- New games automatically benefit from correct cleanup behaviour without manual wiring.
