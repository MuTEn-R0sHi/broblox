# @broblox/movement

Server-authoritative movement validation for competitive Roblox games.
Detects speed hacks, teleporting, flying, and jump exploits, then optionally
soft-corrects the player's position/velocity.

## Features

- **Server Authority** — validates every movement tick on the server
- **Anomaly Detection** — speed, teleport, fly, and jump-sequence checks
- **Soft Correction** — snaps exploiting players back to a legal position
- **Observability** — counters and histograms via `@broblox/observability`
- **Feature-Flag Kill-Switch** — disable validation at runtime via
  `movement.validation.enabled`

## Installation

```bash
pnpm add @broblox/movement
```

## Quick Start

### 1. Server validation loop

```typescript
import { getMovementValidator, MovementStateManager } from "@broblox/movement";
import { isFlagEnabled } from "@broblox/config-featureflags";

const stateManager = new MovementStateManager();
const validator = getMovementValidator();

RunService.Heartbeat.Connect((dt) => {
  // Kill-switch: skip when flag is off
  if (!isFlagEnabled("movement.validation.enabled")) return;

  for (const player of Players.GetPlayers()) {
    const character = player.Character;
    const hrp = character?.FindFirstChild("HumanoidRootPart");
    const humanoid = character?.FindFirstChildOfClass("Humanoid");
    if (!hrp?.IsA("BasePart") || !humanoid) continue;

    const state = stateManager.getState(player.UserId, hrp.Position);

    const input = {
      position: hrp.Position,
      velocity: hrp.AssemblyLinearVelocity,
      isGrounded: humanoid.FloorMaterial !== Enum.Material.Air,
      isJumping: humanoid.GetState() === Enum.HumanoidStateType.Jumping,
      isRunning: humanoid.WalkSpeed > 16,
      timestamp: os.clock(),
      sequenceNumber: state.incrementSequence(),
    };

    const result = validator.validate(input, state, dt);

    if (!result.isValid) {
      for (const v of result.violations) {
        state.recordViolation(v.type);
      }
    }

    // Apply soft correction when the validator provides one
    if (result.correctedPosition) {
      hrp.CFrame = new CFrame(result.correctedPosition);
    }
    if (result.correctedVelocity) {
      hrp.AssemblyLinearVelocity = result.correctedVelocity;
    }

    state.updateState({
      position: result.correctedPosition ?? input.position,
      velocity: result.correctedVelocity ?? input.velocity,
      isGrounded: input.isGrounded,
      isJumping: input.isJumping,
      isRunning: input.isRunning,
      sequenceNumber: input.sequenceNumber,
    });
  }
});
```

### 2. Reading player state

```typescript
const state = stateManager.getState(player.UserId).getState();
print(state.position, state.velocity, state.isGrounded);
```

### 3. Cleaning up on disconnect

```typescript
Players.PlayerRemoving.Connect((player) => {
  stateManager.removeState(player.UserId);
});
```

## Architecture

```
@broblox/movement
├── types.ts       - MovementConfig, MovementInput, ValidationResult, etc.
├── constants.ts   - Default config, physics params, validation thresholds
├── validator.ts   - MovementValidator (singleton via getMovementValidator)
├── state.ts       - PlayerMovementState & MovementStateManager
└── index.test.ts  - 50 unit tests
```

## Anti-Cheat Checks

| Check     | What it detects              | Severity |
| --------- | ---------------------------- | -------- |
| Speed     | Velocity exceeds max allowed | medium   |
| Teleport  | Distance jump > threshold    | high     |
| Fly       | Extended air time + movement | high     |
| Jump seq. | Impossible jump patterns     | medium   |

## Observability

The validator emits the following metrics automatically (requires
`@broblox/observability` as a dependency):

| Metric                            | Type      | Labels |
| --------------------------------- | --------- | ------ |
| `movement.validations.total`      | Counter   | —      |
| `movement.violations.total`       | Counter   | `type` |
| `movement.corrections.total`      | Counter   | —      |
| `movement.validation.duration_ms` | Histogram | —      |

## Feature Flag

The `movement.validation.enabled` flag (defined in
`@broblox/config-featureflags`) acts as a kill-switch. When set to `false`,
the per-heartbeat validation loop exits early so no checks or corrections
run. The flag defaults to `true`.

## Configuration

Default values live in `constants.ts` and can be overridden via the
`MovementConfig` type:

| Option               | Type   | Default | Description                         |
| -------------------- | ------ | ------- | ----------------------------------- |
| `maxWalkSpeed`       | number | 16      | Max walking speed (studs/sec)       |
| `maxRunSpeed`        | number | 24      | Max running speed (studs/sec)       |
| `jumpPower`          | number | 50      | Jump impulse power                  |
| `acceptanceWindow`   | number | 200     | Lag tolerance (ms)                  |
| `maxPositionError`   | number | 5       | Max allowed position desync (studs) |
| `reconciliationRate` | number | 20      | Server updates per second           |
