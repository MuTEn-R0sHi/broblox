# Modules: Security

Security utilities — anomaly detection, trust scoring, and enforcement (`@rbx/security`). **Status: Implemented** (~58 tests).

## Purpose

- Detect cheating and exploitation via server-side anomaly detectors.
- Maintain a per-player trust score that degrades on violations and recovers on good behavior.
- Enforce escalating actions: warn → throttle → kick → ban → shadow.
- Reusable across games — each game configures detection thresholds and enforcement policies.

## Public API

### Detectors

- Movement/speed hack detector — flags impossible velocities.
- Teleport detector — flags sudden position jumps beyond threshold.
- Damage detector — flags implausible damage values.
- Custom detectors can be registered at startup.

### Trust scoring

- `TrustScore` — per-player score (0–100).
- Degrades when detectors fire; recovers passively over time.
- Threshold-based enforcement triggers.

### Enforcement

- `Enforcer` — escalating response based on trust score:
  - **warn** — send client-visible warning.
  - **throttle** — reduce action rates.
  - **kick** — remove from server with reason.
  - **ban** — persist ban via data store.
  - **shadow** — silently degrade experience (last resort).

### Service factory

- `createSecurityService(config)` — registers detectors and wires enforcement.
- `SecurityServiceConfig` — thresholds, cooldowns, ban policy.

## Dependencies

- `@rbx/core` (service lifecycle, logging).
- `@rbx/shared-types` (branded IDs, Result type).

## Data ownership

Security owns the `trustScore` and `violationHistory` sub-keys in the player profile. Ban records are stored in a separate `DataStore`.

## Architecture

Defense-in-depth layers:

1. **Network layer** — rate limiting and payload validation (handled by `@rbx/net`).
2. **Action layer** — action validation before processing.
3. **Detection layer** — anomaly detectors run post-action.
4. **Response layer** — enforcement based on accumulated trust score.

## Configuration

- `security.enabled` — global kill-switch.
- `security.speedThreshold` — max studs/sec before flagging.
- `security.teleportThreshold` — max position delta per frame.
- `security.damageMax` — max single-hit damage.
- `security.trustRecoveryRate` — points recovered per minute of clean behavior.
- `security.banDurationHours` — default ban length.

## Observability

- `security.anomaly_detected` — detector name, severity, player ID.
- `security.trust_score_changed` — old score, new score, reason.
- `security.enforcement_action` — action type, player ID, trust score.

## Testing

~58 unit tests covering each detector, trust score math (degradation + recovery), enforcement escalation, and service factory wiring.
