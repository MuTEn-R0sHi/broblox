# Architecture: Runtime model

## Goals

- Same platform packages can be used by any game genre.
- Competitive PvP is supported without forcing every game to use the same movement.

## Trust boundary model

- **Client**
  - Collects input.
  - Predicts visuals (movement smoothing, VFX, UI).
  - Sends _intent_ to server.

- **Server**
  - Owns the canonical game state.
  - Validates all intents.
  - Computes all outcomes.

## Application Lifecycle

The platform uses a unified `Application` class to manage startup order, dependency resolution, and graceful shutdown.

### Application API

```typescript
import { Application } from "@broblox/core";

// Start the application
await Application.start();

// Check if running
Application.isRunning(); // boolean

// Graceful shutdown
await Application.stop();

// Full cleanup (stop + dispose resources)
await Application.dispose();
```

### Server Lifecycle

1.  **Bootstrap**: `main.server.ts` calls `Application.start()`.
2.  **Registration**: All `Service` objects in `services/` are collected.
3.  **OnInit**: `onInit()` is called on all services (synchronously).
    - Safe to register events (`PlayerAdded`, `Remotes`).
    - Do NOT yield here.
4.  **OnStart**: `onStart()` is called on all services (asynchronously).
    - Safe to yield/call other services.
    - Game loop begins.
5.  **OnStop**: When `Application.stop()` is called, services clean up.

### Client Lifecycle

1.  **Bootstrap**: `main.client.ts` calls `Application.start()`.
2.  **Registration**: All `Controller` objects in `controllers/` are collected.
3.  **OnInit**: `onInit()` is called on all controllers.
4.  **OnStart**: `onStart()` is called on all controllers.
5.  **OnStop**: When `Application.stop()` is called, controllers clean up.

## Service & Controller Pattern

Logic is organized into singletons:

```typescript
// Server Service
const MyService: Service = {
    onInit() {
        logger.info("Initializing");
    },
    onStart() {
        logger.info("Starting");
    }
};

// Client Controller
const MyController: Controller = {
    onInit() { ... },
    onStart() { ... }
};
```

## Movement abstraction (multi-genre)

Movement is a plug-in capability.

- `IMovementController` (motor): takes input commands and produces a `CharacterState`.
- `ICharacterPresentation`: applies `CharacterState` to the rig (animations/camera).

Default (broad compatibility):

- Humanoid-driven motor (casual/cross-genre)

Competitive mode option:

- Kinematic motor with stricter server verification
- Humanoid used as a _presentation shell_ (animations/camera), not as authority

## Network ownership policy (defaults)

If two options are both "secure" (server decides outcomes), prefer what improves feel and reduces server load.

- Characters: automatic ownership (responsiveness) + strict server validation of outcomes
- Vehicles: driver-owned assembly while seated (performance + control feel)
- Gameplay projectiles: server simulated (fairness + anti-cheat)
- Cosmetic debris: can be client-owned (never trusted for damage/score)
