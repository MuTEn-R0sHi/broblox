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
  - `apps/dashboard` — studio operations dashboard ([dashboard.broblox-games.com](https://dashboard.broblox-games.com))
  - `apps/website` — public marketing site and game portal ([broblox-games.com](https://broblox-games.com))

- `tools/`
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
  - Validation helpers for Roblox-specific type checks.
  - Build info: version, commit hash, environment.
  - Safe for both Roblox runtime and Node.js testing.

- `core`
  - Application lifecycle: `start()`/`stop()`/`dispose()`.
  - Logger with child loggers and structured context.
  - Cleanup primitives (resource lifetimes).
  - Roblox-TS compatible collection helpers (`arraySize`, `arrayRemoveAt`, `arrayTake`, `setSize`) — **all packages should import from `@rbx/core` instead of inlining these helpers**.

- `shared-types`
  - Branded ids: `PlayerId`, `MatchId`, `ConfigVersion`, etc.
  - `Result<T>` type with `ok()`, `err()`, `isOk()`, `isErr()` helpers.
  - Stable error codes (`ErrorCode` enum) with code ranges.
  - `DoAction<T>` for deferred execution patterns.

- `net`
  - Remote registry (single source of truth for all remotes).
  - Type-safe `defineServerFunction()`, `defineServerEvent()`, `defineClientEvent()`.
  - `ServerRemoteRegistry` and `ClientRemoteRegistry` classes.
  - Built-in rate limiting and validation support.
  - Per-endpoint and per-player rate limits.
  - Protocol version handshake.
  - Client utilities: `withRetry()`, `withTimeout()`.

- `data`
  - `PlayerDataStore` - Type-safe DataStore wrapper.
  - Automatic versioning and migrations.
  - Retry with exponential backoff.
  - `SessionManager` - Auto-save and cleanup.
  - Dirty tracking for optimized saves.

- `security`
  - Detector signals (`checkSpeed()`, `checkTeleport()`, `reportViolation()`).
  - Trust scoring system with factor-based calculation.
  - Enforcement policy (`Enforcer` class with escalation).
  - Shadow banning and kick actions.

- `observability`
  - Telemetry system with `emit()` for structured events.
  - Metrics: `incrementCounter()`, `setGauge()`, `recordHistogram()`, `recordTiming()`.
  - Span tracing: `startSpan()`, `endSpan()`, `withSpan()` for operation timing.
  - Correlation context for request-scoped data propagation.
  - Automatic context enrichment (player, session, server job ID).

- `input`
  - Unified input abstraction for keyboard, gamepad, and touch.
  - Device detection with `getCurrentDevice()` and `onDeviceChange()`.
  - Action system: `registerAction()`, `isActionActive()`, `getActionValue()`.
  - Movement state: `getMovementState()` returns normalized vectors.
  - Default bindings for WASD, arrow keys, gamepad sticks, touch.

- `ui`
  - Theme system with dark/light themes and color utilities.
  - Creation helpers: `createFrame()`, `createLabel()`, `createButton()`.
  - Layout utilities: `addCorner()`, `addPadding()`, `addListLayout()`.
  - Higher-level components: `Dialog`, `Toast`, `ListView`, `ProgressBar`, `Spinner`.
  - Device-safe sizing with `px()` and `scale()` helpers.

- `testing`
  - Shared test utilities for vitest.
  - Roblox API mocks for Node.js.
  - Test factories and helpers.

- `config-featureflags`
  - Runtime feature flag configuration.
  - Type-safe flag definitions.
  - Validation with error details.

## Phase 2–3 packages

- `combat`
  - Weapon definitions, cooldowns, ammunition.
  - Server-authoritative hit validation (raycast verification).
  - Damage calculation and ability system.
  - Depends on `@rbx/core` for collection helpers and `@rbx/shared-types` for Result types.

- `matchmaking`
  - Queue management with skill-based matching.
  - Match lifecycle (waiting → starting → in-progress → ended).
  - Server allocation with reserved server provisioning.
  - Health monitoring and graceful shutdown.
  - Depends on `@rbx/core` for collection helpers and `@rbx/shared-types` for Result types.

- `moderation`
  - Ban/mute system with evidence model.
  - Enforcement hooks for server-side action.
  - Dashboard integration for moderator workflows.

- `movement`
  - Server-authoritative movement validation.
  - Speed hack, teleport, fly hack, and noclip detection.
  - Configurable walk/run speeds with ability modifiers.
  - Player movement state tracking with violation history.

## Phase 4 packages

- `codes`
  - Redeemable promo codes with usage-count limits, start/end dates, per-player tracking.
  - Dashboard management for creating and disabling codes.

- `leaderboards`
  - Cross-game leaderboards with period support (daily, weekly, seasonal, all-time).
  - Score submission, ranking, and top-N retrieval.

- `analytics`
  - Player behavior events: funnels, retention, session tracking.
  - Structured event emitter with category/action/label/value fields.

- `notifications`
  - In-game toasts, announcements, and news feed.
  - Priority queue with dismiss/expire logic.

- `events`
  - Scheduled in-game events with time-window management and start/end callbacks.
  - Per-event feature-flag kill-switch via `@rbx/config-featureflags`.
  - Optional gameplay modifiers (`xpMultiplier`, `dropRateMultiplier`, `coinMultiplier`).
  - Player-join notification when events are in progress.

## Phase 5a packages

- `inventory`
  - Base item/slot system with stacking, weight limits, transfers.
  - Per-player inventories backed by DataStore persistence.
  - Metadata, sorting, and slot validation.

- `progression`
  - XP calculation with configurable curves (linear, quadratic, exponential, custom).
  - Auto level-up, prestige/rebirth support, XP bonus multipliers.

- `quests`
  - Quest registry with schedule/tier/tag/level filtering.
  - Multi-objective tracking, auto-completion, prerequisite chains.

- `rewards`
  - Daily login rewards with streaks, grace periods, cycles.
  - Achievement store with incremental progress tracking.

## Phase 5b packages

- `pets`
  - Pet hatching, equipping, leveling, evolution.
  - Rarity tiers and stat scaling.

- `gacha`
  - Weighted loot tables with pity timers and banner rotation.
  - Rate-up mechanics and guaranteed-at-N pulls.

- `cosmetics`
  - Cosmetic item registry with per-player ownership and equipping.
  - Skin/variant support and rarity classification.

- `battle-pass`
  - Seasonal battle passes with free/premium tracks.
  - Tier progression via XP, milestone rewards, auto-claim.

## Phase 5c packages

- `localization`
  - Multi-locale string tables organized by namespace.
  - Interpolation (`{key}` replacement) and pluralization rules.
  - Fallback chain: requested locale → default locale → key echo.

- `audio`
  - Sound registry, channel-based volume control.
  - Playlist management: sequential and shuffle modes.
  - Spatial audio support and concurrent-instance limits.

- `tutorial`
  - FTUE framework with step sequences and prerequisite chains.
  - Per-player completion persistence with started/completed/skipped states.

- `world-systems`
  - Day/night cycle with configurable period and lighting presets.
  - Weather transitions with visual and gameplay effects.
  - Seasonal system driving weather probability tables.

## Game folder expectations

A game should only provide:

- content (maps, weapons configs, UI composition)
- feature selection/config
- minimal glue to boot platform services

If game-specific logic starts duplicating across games, it belongs in `packages/`.

Current games:

- `games/starter/` — Starter game template (Phase 1). Demonstrates core platform integration with handshake, actions, remotes, moderation, and feature flags.
- `games/obby/` — Obby game (Phase 3). Stages, checkpoints, coins, leaderboards, and remote payload validation.

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
pnpm game:starter:build
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
