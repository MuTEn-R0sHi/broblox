# Modules: Movement

Server-authoritative movement validation and anti-cheat (`@rbx/movement`). **Status: Implemented** (78 tests).

## Purpose

- Validate client-reported movement against physics predictions.
- Detect speed hacks, teleports, fly hacks, invalid jumps, and sequence errors.
- Severity-based escalation with position correction (snap-back).
- Injectable ability modifiers for dashes, speed boosts, etc.
- Per-game configurable thresholds via `ValidationThresholds`.

## Core rules

- Validation runs every Heartbeat on the server, not the client.
- Speed tolerance is 2.0× to account for network lag before flagging.
- Delta-time uses `math.max(heartbeat dt, os.clock() delta)` capped at 1.0 s to handle Studio lag spikes without enabling large-dt exploits.
- Teleport detection uses **axis-split budgets** — horizontal and vertical distances are checked independently. The vertical budget includes a gravity term (`0.5 * g * dt²`) so freefall and large drops don't trigger false positives.
- Air-time exceeding 3 s without downward velocity triggers fly-hack detection.
- Dead characters (`Health <= 0`) are skipped to prevent ragdoll false positives.
- Server-initiated teleports (respawn, checkpoint) are auto-detected and reset state instead of flagging a violation.
- Character-model changes (e.g., Roblox UI reset) are detected and state is reset.
- High-severity or 3+ violations in a 10 s window trigger position correction.

## Data model

- `MovementState` — per-player: `position`, `velocity`, `isGrounded`, `isJumping`, `isFalling`, `isRunning`, `lastValidatedAt`, `sequenceNumber`.
- `MovementInput` — client-reported: `position`, `velocity`, `isGrounded`, `isJumping`, `isRunning`, `timestamp`, `sequenceNumber`.
- `MovementViolation` — `type`, `severity`, `details`, `position`, `timestamp`.
- `MovementViolationType` — `"speed_hack" | "teleport" | "fly_hack" | "invalid_jump" | "sequence_error" | "noclip"`.
- `ValidationThresholds` — per-game tunable detection thresholds (see Config section).

## Public API

| Method / Type                                           | Description                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `createMovementValidationService(config)`               | Factory — returns `MovementValidationHandle { Service, stateManager }`                             |
| `MovementValidationConfig`                              | Config type: `onPlayerRemoving`, `isEnabled?`, `thresholds?`                                       |
| `MovementValidationHandle`                              | Return type: `{ Service, stateManager }`                                                           |
| `validate(input, state, dt)`                            | Core validation — returns `ValidationResult` with violations                                       |
| `updateConfig(partial)`                                 | Hot-update validator config                                                                        |
| `getMaxAllowedSpeed(isRunning, abilities?)`             | Max speed including ability modifiers                                                              |
| `predictPosition(pos, vel, dt, grounded)`               | Physics prediction helper                                                                          |
| `MovementStateManager.notifyTeleport(playerId, newPos)` | Reset state after a server-initiated teleport (e.g., checkpoint respawn) to avoid false violations |
| `PlayerMovementState`                                   | Per-player state wrapper with teleport notification support                                        |
| `MovementValidator(config?, thresholds?)`               | Constructor accepts optional `Partial<ValidationThresholds>`                                       |

## Security

- **Server-authoritative** — runs on server Heartbeat, not client.
- **6 violation types** — speed, teleport, fly, jump, sequence, noclip.
- **Severity escalation** — 3+ violations in 10 s window escalates enforcement.
- **Position correction** — high-severity violations snap the player back.
- **Ability-aware** — speed modifiers factored into max-speed calculations.
- **Dead-character skip** — validation paused while `Health <= 0` (ragdoll).
- **Server teleport detection** — auto-detects server-side position changes and resets state.

## Config

### `MovementConfig` (base physics)

| Key                | Default  | Description                            |
| ------------------ | -------- | -------------------------------------- |
| `walkSpeed`        | `16`     | Base walk speed (studs/s)              |
| `runSpeed`         | `24`     | Base run speed (studs/s)               |
| `jumpPower`        | `50`     | Jump impulse                           |
| `gravity`          | `-196.2` | Gravity constant (studs/s²)            |
| `maxPositionError` | `5`      | Position tolerance (studs)             |
| `allowFlying`      | `false`  | Allow flying (for specific game modes) |

### `ValidationThresholds` (per-game tunable)

All thresholds can be overridden per-game by passing `thresholds` to `createMovementValidationService`:

| Key                            | Default | Description                                      |
| ------------------------------ | ------- | ------------------------------------------------ |
| `speedTolerance`               | `2.0`   | Multiplier for max speed before flagging         |
| `teleportDistanceMin`          | `30`    | Minimum distance for teleport detection (studs)  |
| `teleportDistanceMax`          | `100`   | Maximum correctable teleport distance (studs)    |
| `positionTolerance`            | `1.2`   | Position error tolerance multiplier              |
| `maxAirTime`                   | `3`     | Seconds before fly-hack detection                |
| `groundResetTime`              | `0.1`   | Ground contact time to reset air timer (s)       |
| `serverTeleportThreshold`      | `100`   | Distance for server-side teleport auto-detection |
| `violationEscalationThreshold` | `3`     | Consecutive violations before escalation         |
| `violationWindow`              | `10`    | Time window for violation counting (seconds)     |

### Per-game threshold overrides

Games with unusual movement patterns should override thresholds to avoid false positives:

```typescript
// Example: obby with large vertical drops
createMovementValidationService({
  onPlayerRemoving: (cb) => playerLifecycle.onPlayerRemoving(cb),
  thresholds: { teleportDistanceMin: 75 },
});
```

### Calling `notifyTeleport()` for server-initiated moves

When your game teleports a player (checkpoint respawn, stage warp, etc.), call `notifyTeleport()` on the state manager to prevent a false violation:

```typescript
const { Service, stateManager } = createMovementValidationService(config);

// After teleporting a player:
stateManager.notifyTeleport(player, newCFrame.Position);
```

## Observability

- `movement_validations_total` — total validations run
- `movement_violations_total` — violations detected (per type)
- `movement_corrections_total` — position corrections applied
- `movement_validation_duration_ms` — validation latency histogram
