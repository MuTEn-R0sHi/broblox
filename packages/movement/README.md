# @rbx/movement

Server-authoritative movement system for competitive Roblox games.

## Features

- **Server Authority** - Server validates all movement for anti-cheat
- **Client Prediction** - Smooth client-side movement with server reconciliation
- **Lag Compensation** - Handles network latency gracefully
- **Anomaly Detection** - Detects speed hacks, teleporting, flying
- **Motor Abstraction** - Works with Humanoid or custom physics

## Installation

```bash
pnpm add @rbx/movement
```

## Usage

### Server Setup

```typescript
import { getMovementValidator, MovementStateManager } from "@rbx/movement";

const stateManager = new MovementStateManager();
const validator = getMovementValidator({
  walkSpeed: 16,
  runSpeed: 24,
  jumpPower: 50,
});

// Example validation loop (server-sampled):
RunService.Heartbeat.Connect((dt) => {
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
      // react to violations, optionally correct
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

### Client Setup

```typescript
// Client prediction/reconciliation is not shipped as a stable API yet.
// Current package exports focus on server-side validation primitives.
```

### Movement Validation

The server validates all movement inputs:

```typescript
// You can query the server-side state you're tracking:
const state = stateManager.getState(player.UserId).getState();

print(state.position);
print(state.velocity);
print(state.isGrounded);
```

### Custom Movement Abilities

```typescript
// Ability tracking hooks exist in types, but a public ability runtime is not shipped yet.
// If you need this, build on top of `MovementConfig.abilities` and `PlayerMovementState`.
```

## Architecture

```
@rbx/movement
├── types.ts       - Type definitions
├── constants.ts   - Movement constants + thresholds
├── validator.ts   - Movement validation logic
└── state.ts       - Player state management
```

## Anti-Cheat Integration

Movement integrates with `@rbx/security` for automatic violation reporting:

| Violation  | Detection                    | Severity    |
| ---------- | ---------------------------- | ----------- |
| Speed hack | Velocity exceeds max         | Medium-High |
| Teleport   | Distance jump > threshold    | High        |
| Fly hack   | Extended air time + movement | High        |
| Noclip     | Position inside geometry     | Critical    |

## Configuration

| Option               | Type   | Default | Description                         |
| -------------------- | ------ | ------- | ----------------------------------- |
| `maxWalkSpeed`       | number | 16      | Max walking speed (studs/sec)       |
| `maxRunSpeed`        | number | 24      | Max running speed (studs/sec)       |
| `jumpPower`          | number | 50      | Jump impulse power                  |
| `acceptanceWindow`   | number | 200     | Lag tolerance (ms)                  |
| `maxPositionError`   | number | 5       | Max allowed position desync (studs) |
| `reconciliationRate` | number | 20      | Server updates per second           |
