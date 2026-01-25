# @rbx/security

Security utilities for Roblox games — anti-abuse and trust scoring.

## Purpose

This package provides server-side security infrastructure:

- **Anomaly detection** — Detect suspicious player behavior
- **Trust scoring** — Track player trustworthiness over time
- **Enforcement** — Actions for policy violations
- **Rate limiting** — Request throttling (used by `@rbx/net`)

## Dependencies

- `@rbx/core` — Logging utilities
- `@rbx/shared-types` — Type definitions

## Features

### Anomaly Detectors

```typescript
import { Detectors } from "@rbx/security";

// Speed hack detection
Detectors.movement.check(player, {
  previousPosition,
  currentPosition,
  deltaTime,
  maxSpeed: 50, // studs/second
});

// Teleport detection
Detectors.teleport.check(player, {
  distance,
  threshold: 100, // studs
});

// Damage anomaly detection
Detectors.damage.check(player, {
  damageDealt,
  timeWindow: 1, // second
  maxDps: 500,
});
```

### Trust Scoring

```typescript
import { TrustScore } from "@rbx/security";

// Get player's trust score (0-100)
const score = TrustScore.get(player);

// Score decreases on violations
TrustScore.recordViolation(player, {
  type: "speed_anomaly",
  severity: "medium",
  evidence: { ... },
});

// Score recovers over time with good behavior
TrustScore.recordGoodBehavior(player);
```

### Enforcement Actions

```typescript
import { Enforcer } from "@rbx/security";

// Escalating responses based on trust score
if (trustScore < 20) {
  Enforcer.kick(player, "Suspicious activity detected");
} else if (trustScore < 50) {
  Enforcer.throttle(player, { duration: 60 });
} else {
  Enforcer.warn(player);
}
```

## Architecture

### Defense in Depth

1. **Network layer** — Rate limiting, schema validation (`@rbx/net`)
2. **Action layer** — Server-authoritative outcomes
3. **Detection layer** — Anomaly detection (this package)
4. **Response layer** — Trust scoring and enforcement

### Server Authority

All security checks run server-side. Client is never trusted.

## Related Docs

- [Security Threat Model](../../docs/security/threat-model.md)
- [Hit Validation](../../docs/architecture/hit-validation.md)
- [Exploit Wave Runbook](../../docs/runbooks/exploit-wave.md)
