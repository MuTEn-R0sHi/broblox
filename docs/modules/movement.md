# Modules: Movement

Server-authoritative movement validation and anti-cheat (`@rbx/movement`). **Status: Implemented** (64 tests).

## Purpose

- Validate client-reported movement against physics predictions.
- Detect speed hacks, teleports, fly hacks, invalid jumps, and sequence errors.
- Severity-based escalation with position correction (snap-back).
- Injectable ability modifiers for dashes, speed boosts, etc.

## Core rules

- Validation runs every Heartbeat on the server, not the client.
- Speed tolerance is 1.5× to account for network lag before flagging.
- Delta-time is clamped to 0.25 s to prevent large-dt exploits.
- Air-time exceeding 3 s without downward velocity triggers fly-hack detection.
- High-severity or 2+ violations in a window trigger position correction.

## Data model

- `MovementState` — per-player: `position`, `velocity`, `isGrounded`, `isJumping`, `lastValidatedAt`, `sequenceNumber`.
- `MovementInput` — client-reported: `position`, `velocity`, `isGrounded`, `timestamp`, `sequenceNumber`.
- `MovementViolation` — `type`, `severity`, `details`, `position`, `timestamp`.
- `MovementViolationType` — `"speed_hack" | "teleport" | "fly_hack" | "invalid_jump" | "sequence_error" | "noclip"`.

## Public API

| Method                                      | Description                                                  |
| ------------------------------------------- | ------------------------------------------------------------ |
| `createMovementValidationService(config)`   | Factory — returns `{ Service, stateManager }`                |
| `validate(input, state, dt)`                | Core validation — returns `ValidationResult` with violations |
| `updateConfig(partial)`                     | Hot-update validator config                                  |
| `getMaxAllowedSpeed(isRunning, abilities?)` | Max speed including ability modifiers                        |
| `predictPosition(pos, vel, dt, grounded)`   | Physics prediction helper                                    |

## Security

- **Server-authoritative** — runs on server Heartbeat, not client.
- **5 violation types** — speed, teleport, fly, jump, sequence.
- **Severity escalation** — 3+ violations in 10 s window escalates enforcement.
- **Position correction** — high-severity violations snap the player back.
- **Ability-aware** — speed modifiers factored into max-speed calculations.

## Config

| Key                   | Default  | Description                             |
| --------------------- | -------- | --------------------------------------- |
| `walkSpeed`           | `16`     | Base walk speed                         |
| `runSpeed`            | `24`     | Base run speed                          |
| `jumpPower`           | `50`     | Jump impulse                            |
| `gravity`             | `-196.2` | Gravity constant                        |
| `maxPositionError`    | `5`      | Position tolerance (studs)              |
| `speedTolerance`      | `1.5`    | Multiplier before flagging              |
| `teleportDistanceMin` | `20`     | Minimum distance for teleport detection |
| `maxAirTime`          | `3`      | Seconds before fly-hack detection       |

## Observability

- `movement_validations_total` — total validations run
- `movement_violations_total` — violations detected (per type)
- `movement_corrections_total` — position corrections applied
- `movement_validation_duration_ms` — validation latency histogram
