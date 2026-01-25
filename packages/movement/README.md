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
import { MovementServer } from "@rbx/movement";

// Initialize on server
MovementServer.init({
  maxWalkSpeed: 16,
  maxRunSpeed: 24,
  jumpPower: 50,
  acceptanceWindow: 200, // ms tolerance for lag
  onViolation: (player, violation) => {
    // Handle movement violations (integrates with @rbx/security)
    print(`${player.Name} violated movement: ${violation.type}`);
  },
});

// Player setup
Players.PlayerAdded.Connect((player) => {
  player.CharacterAdded.Connect((character) => {
    MovementServer.registerCharacter(player, character);
  });
});
```

### Client Setup

```typescript
import { MovementClient } from "@rbx/movement";

// Initialize on client
MovementClient.init({
  reconciliationMode: "smooth", // "instant" or "smooth"
  predictionEnabled: true,
});
```

### Movement Validation

The server validates all movement inputs:

```typescript
// Movement is automatically validated, but you can query state:
const state = MovementServer.getPlayerState(player);

print(state.position); // Current validated position
print(state.velocity); // Current velocity
print(state.isGrounded); // Is player on ground
print(state.trustScore); // Movement trust score (0-100)
```

### Custom Movement Abilities

```typescript
import { MovementServer } from "@rbx/movement";

// Register a custom movement ability (e.g., dash)
MovementServer.registerAbility("dash", {
  maxSpeed: 80, // Higher than normal max
  duration: 0.3, // seconds
  cooldown: 2, // seconds
  validator: (player, input) => {
    // Custom validation logic
    return player.Character?.FindFirstChild("DashAbility") !== undefined;
  },
});

// Use ability
MovementServer.useAbility(player, "dash", {
  direction: new Vector3(1, 0, 0),
});
```

## Architecture

```
@rbx/movement
├── types.ts           - Type definitions
├── server/
│   ├── index.ts       - MovementServer API
│   ├── validator.ts   - Movement validation logic
│   └── state.ts       - Player state management
├── client/
│   ├── index.ts       - MovementClient API
│   └── predictor.ts   - Client-side prediction
└── shared/
    ├── physics.ts     - Physics calculations
    └── constants.ts   - Movement constants
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
