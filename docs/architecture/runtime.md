# Architecture: Runtime model

## Goals

- Same platform packages can be used by any game genre.
- Competitive PvP is supported without forcing every game to use the same movement.

## Trust boundary model

- **Client**
  - Collects input.
  - Predicts visuals (movement smoothing, VFX, UI).
  - Sends *intent* to server.

- **Server**
  - Owns the canonical game state.
  - Validates all intents.
  - Computes all outcomes.

## Startup lifecycle (planned)

Server boot (authoritative):

1. Load config + feature flags
2. Create DI container
3. Initialize services (no player data yet)
4. Begin player session lifecycle

Client boot (presentation):

1. Load replicated config snapshot
2. Initialize controllers (UI/input/camera)
3. Perform protocol handshake
4. Start prediction + snapshot application

## Movement abstraction (multi-genre)

Movement is a plug-in capability.

- `IMovementController` (motor): takes input commands and produces a `CharacterState`.
- `ICharacterPresentation`: applies `CharacterState` to the rig (animations/camera).

Default (broad compatibility):

- Humanoid-driven motor (casual/cross-genre)

Competitive mode option:

- Kinematic motor with stricter server verification
- Humanoid used as a *presentation shell* (animations/camera), not as authority

## Network ownership policy (defaults)

If two options are both "secure" (server decides outcomes), prefer what improves feel and reduces server load.

- Characters: automatic ownership (responsiveness) + strict server validation of outcomes
- Vehicles: driver-owned assembly while seated (performance + control feel)
- Gameplay projectiles: server simulated (fairness + anti-cheat)
- Cosmetic debris: can be client-owned (never trusted for damage/score)
