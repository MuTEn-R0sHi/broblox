# Architecture: Device matrix & control schemes

This page defines device support requirements, control schemes, aim assist policy, and UI constraints.

## Device classes (canonical)

- `kbm`: keyboard + mouse (PC)
- `gamepad`: console or controller on PC
- `touch`: mobile/tablet touch

We may also record:

- screen size bucket
- performance tier (low/med/high)

## Compatibility goals

- Every game must be playable on:
  - PC (kbm)
  - mobile (touch)
  - console/controller (gamepad)

Competitive ranked modes may impose stricter constraints (e.g., separate queues).

## Control scheme requirements

### KBM

- Default binds with remapping support.
- Sensitivity controls.
- Optional toggle/hold for sprint/crouch.

### Gamepad

- Full navigation without mouse.
- Aim sensitivity + deadzone controls.
- Target cycling where relevant.

### Touch

- Dynamic joystick + action buttons.
- Layout scaling and safe-area support.
- Optional gyro aiming where available.

## Aim assist policy (competitive)

Aim assist must be treated as a competitive feature:

- Ranked modes can:
  - separate device queues, or
  - apply tuned aim assist by device class

Policy baseline:

- `touch`: strongest assist (friction + cone), capped
- `gamepad`: moderate assist (friction), capped
- `kbm`: minimal or none

Anti-abuse:

- aim assist should not override line-of-sight
- aim assist should not produce impossible snaps

## UI requirements

- Responsive layout: handle small screens and ultrawide.
- Safe zones: avoid cutouts/notches.
- Text scaling: readable on phones.
- Controller focus states.

## Performance tiers

Define tiers based on measured FPS/memory:

- Low: minimal effects, lower particle counts, simpler UI animations
- Medium: default
- High: enhanced effects

Rules:

- graphics settings must not change competitive outcomes
- performance mode must be available on low-end devices

## Streaming and world assumptions

- Streaming may hide world instances.
- UI must handle “loading/streaming” states.
- Gameplay-critical checks remain server-side.

## Testing checklist

- Each release must be smoke-tested on:
  - PC KBM
  - PC gamepad or console
  - mobile touch

- Verify:
  - movement feels correct
  - camera controls
  - UI navigation
  - input latency acceptable
  - no device-only advantage in ranked (or is explicitly designed)
