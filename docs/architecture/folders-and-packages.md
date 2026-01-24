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

- `constants`
  - Pure numeric constants (no dependencies).
  - Timeouts: remote invoke, handshake retry, session expiry.
  - Limits: payload sizes, timestamp tolerance, vector magnitudes.
  - Build info: version, commit hash, environment.
  - Safe for both Roblox runtime and Node.js testing.

- `core`
  - Application lifecycle: `start()`/`stop()`/`dispose()`.
  - Logger with child loggers and structured context.
  - Cleanup primitives (resource lifetimes).

- `shared-types`
  - Branded ids: `PlayerId`, `MatchId`, `ConfigVersion`, etc.
  - `Result<T>` type with `ok()`, `err()`, `isOk()`, `isErr()` helpers.
  - Stable error codes (`ErrorCode` enum) with code ranges.
  - `DoAction<T>` for deferred execution patterns.

- `net`
  - Remote registry (single source of truth).
  - Runtime schema validation.
  - Per-endpoint and per-player rate limits.
  - Protocol version handshake.
  - Client utilities: `withRetry()`, `withTimeout()`.

- `testing`
  - Shared test utilities for vitest.
  - Roblox API mocks for Node.js.
  - Test factories and helpers.

- `config-featureflags`
  - Runtime feature flag configuration.
  - Type-safe flag definitions.
  - Validation with error details.

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

## Roblox-TS monorepo setup

The platform uses [roblox-ts](https://roblox-ts.com/) to compile TypeScript to Luau. This section documents the package architecture.

### Package structure

Each `@rbx/*` package has:

```
packages/example/
├── src/
│   └── index.ts        # Source code
├── out/
│   ├── init.luau       # Compiled Luau (gitignored)
│   └── index.d.ts      # TypeScript declarations (gitignored)
├── package.json        # main: "out", types: "out/index.d.ts"
├── tsconfig.json       # Extends tsconfig.roblox.json (for VS Code)
└── tsconfig.roblox.json # Roblox-TS compiler config
```

### Why two tsconfig files?

- `tsconfig.roblox.json` - Used by `rbxtsc` compiler with Roblox-specific settings (`noLib: true`, `@rbxts/types`)
- `tsconfig.json` - Extends the roblox config so VS Code gets proper intellisense

### Build workflow

Packages must be compiled before the game:

```bash
# Build all packages, then the game
pnpm run build:starter

# Or separately:
pnpm run build:packages    # Compiles packages to out/
pnpm --filter @rbx/game-starter build
```

### How games consume packages

1. **pnpm workspaces** create symlinks in `node_modules/@rbx/*`
2. **Packages export** `.d.ts` files for TypeScript and compiled Luau
3. **Rojo config** maps `node_modules/@rbx/*/out` to the game tree
4. **roblox-ts** resolves types from `.d.ts`, emits requires to the Rojo paths

### Key constraints

- **Respect dependency direction** - Packages may depend on `@rbx/shared-types` and other packages per the dependency graph, but avoid cycles.
- **Types point to `out/`** - `package.json` has `"types": "out/index.d.ts"` so roblox-ts doesn't recompile package sources
- **Games use `--type game`** - This emits RuntimeLib requires in entry scripts
- **Rojo `include` folder** - Must match `includePath` in tsconfig for RuntimeLib resolution
