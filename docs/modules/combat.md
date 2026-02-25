# Modules: Combat

Server-authoritative combat systems — cooldowns, hit validation, and anti-cheat (`@rbx/combat`). **Status: Implemented** (138 tests).

## Purpose

- Multi-charge ability cooldown system with shared cooldown groups.
- Server-authoritative hit validation with bounded lag compensation.
- Anti-cheat pattern detection for suspicious hit sequences.
- Injectable position and raycast providers for line-of-sight checks.

## Core rules

- All cooldown state is server-side; clients cannot bypass or manipulate timers.
- Hit validation performs a 6-step chain: rate-limit → lag-check → range → target-lookup → invulnerability → angle → obstruction.
- Bounded lag compensation: hits beyond `maxLagMs` (default 200 ms) are rejected.
- Minimum 50 ms between hits (`minHitInterval`) to prevent rapid-fire exploits.
- Angle validation: aim must be within ~60° of the target direction.

## Data model

- `CooldownConfig` — ability registration: `abilityId`, `durationSeconds`, `charges`, `chargeRecoverySeconds`, `sharedCooldown`.
- `CooldownState` — per-player runtime: `abilityId`, `charges`, `maxCharges`, `nextChargeAt`.
- `HitIntent` — client-submitted: `origin`, `direction`, `clientTimestamp`, `targetId`, `weaponId`, `maxDistance`.
- `HitValidationResult` — server response: `valid`, `hitPosition`, `hitDistance`, `reason`, `serverTimestamp`.

## Public API

### Cooldown module

| Method                                      | Description                                |
| ------------------------------------------- | ------------------------------------------ |
| `registerAbility(config)`                   | Register an ability with cooldown settings |
| `useAbility(playerId, abilityId)`           | Consume a charge (server-authoritative)    |
| `isOnCooldown(playerId, abilityId)`         | Check if an ability is on cooldown         |
| `getRemainingCooldown(playerId, abilityId)` | Seconds remaining                          |
| `getAvailableCharges(playerId, abilityId)`  | Available charges                          |
| `resetCooldown(playerId, abilityId)`        | Reset a single cooldown                    |
| `resetAllCooldowns(playerId)`               | Reset all cooldowns for a player           |

### Hit validation module

| Method                            | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `configureHitValidation(config)`  | Set `maxLagMs`, `maxRange`, etc.                |
| `setPositionProvider(provider)`   | Inject position source for range checks         |
| `setRaycastProvider(provider)`    | Inject raycast for line-of-sight checks         |
| `validateHit(shooterId, intent)`  | Core validation — returns `HitValidationResult` |
| `setInvulnerable(playerId, bool)` | Toggle invulnerability (e.g. respawn)           |

### Factory

```ts
const combat = createCombatService({
  abilities: [{ abilityId: "slash", durationSeconds: 0.8, charges: 3 }],
  hitValidation: { maxLagMs: 200, maxRange: 100, checkObstruction: true },
  positionProvider: (id) => getPlayerPosition(id),
});
```

## Security

- **Server-authoritative** — clients send intents only; server validates everything.
- **Rate limiting** — 50 ms minimum between hits.
- **Suspicious pattern tracking** — failed hits increment a per-player counter; `SuspiciousHitEvent` emitted.
- **Invulnerability gating** — hits on invulnerable targets immediately rejected.
- **Obstruction checks** — server-side raycast prevents shooting through walls.

## Config

| Key                | Default | Description                              |
| ------------------ | ------- | ---------------------------------------- |
| `maxLagMs`         | `200`   | Maximum allowed client-server time delta |
| `maxRange`         | `1000`  | Maximum hit distance                     |
| `checkObstruction` | `true`  | Enable line-of-sight raycast             |
| `logSuspicious`    | `true`  | Log suspicious hits                      |

## Observability

- `CooldownStartedEvent` — charge consumed
- `CooldownEndedEvent` — charge recovered
- `AbilityRejectedEvent` — use attempt denied (on cooldown / no charges)
- `SuspiciousHitEvent` — invalid hit detected (reason, intent details)
