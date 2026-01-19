# Architecture: Folders & packages

This project is intended to be a **monorepo** with many games sharing a common platform.

## Top-level structure (target)

- `games/`
  - One folder per game experience.
  - Each game is composed from shared `packages/`.
  - Each game can have multiple places (lobby, match, hub).

- `packages/`
  - Shared runtime libraries used by all games.
  - Must not depend on `games/`.

- `apps/`
  - Non-Roblox apps (web dashboard, backend API, workers).

- `tooling/`
  - Scripts and templates for scaffolding, publishing, validation.

- `docs/`
  - This documentation site.

## Package boundaries (hard rules)

1. Packages are split into `client/`, `server/`, and `shared/` entrypoints (or folders).
2. Client code may not import server-only modules.
3. Server code may not import client-only modules.
4. Shared code must be deterministic and side-effect light.

## Core packages (v1 target)

- `core`
  - Lifecycle: `init()`/`start()` order.
  - Dependency injection (DI) container.
  - Logging + correlation ids.
  - Cleanup primitives (resource lifetimes).

- `shared-types`
  - Branded ids: `PlayerId`, `MatchId`, `ConfigVersion`, etc.
  - Stable error codes for networking.

- `net`
  - Remote registry (single source of truth).
  - Runtime schema validation.
  - Per-endpoint and per-player rate limits.
  - Protocol version handshake.

- `security`
  - Authoritative outcome rules.
  - Detector signals and scoring.
  - Enforcement policy (warn → throttle → kick → ban).

- `movement`
  - Motor abstraction (`IMovementController`).
  - Humanoid compatibility layer.
  - Competitive motor option (for ranked).

- `config-featureflags`
  - Config sources + validation.
  - Kill-switch flags.
  - Rollouts and targeting.

- `ui-kit`
  - Components, theming, device-safe layout.
  - Localization hooks.

## Game folder expectations

A game should only provide:

- content (maps, weapons configs, UI composition)
- feature selection/config
- minimal glue to boot platform services

If game-specific logic starts duplicating across games, it belongs in `packages/`.
