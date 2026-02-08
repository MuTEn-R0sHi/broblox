# Changelog

All notable changes to this project will be documented in this file.

This project follows **Keep a Changelog** and aims to follow **Semantic Versioning** once we cut the first tagged release.

Notes:

- Platform/API compatibility is also governed by protocol versioning rules in `docs/architecture/decisions/0002-network-protocol-versioning.md`.
- Release flow and environment promotion is governed by `docs/architecture/decisions/0004-ci-publish-promote-open-cloud.md`.

## Unreleased

### Added

- **Defensive Guards (Deep Review Rounds 1–15)** — Systematic hardening across all packages:
  - `@rbx/progression` — NaN/Infinity XP guard, corrupt data clamping in `load()`.
  - `@rbx/pets` — Negative XP guard, nickname length validation, `equippedCount` cleanup.
  - `@rbx/gacha` — Negative balance guard in `pull()`.
  - `@rbx/cosmetics` — Unequip-previous-item event on equip.
  - `@rbx/leaderboards` — NaN/Infinity/negative score guard in `submitScore()`.
  - `@rbx/codes` — DataStore fault tolerance via `pcall` wrapping.
  - `@rbx/movement` — DeltaTime ≤ 0 guard, `stateManager` exposure.
  - `@rbx/tutorial` — Corrupt progress data clamping in `restoreProgress()`.
  - `@rbx/world-systems` — DeltaTime ≤ 0 guard in tick loop.
  - `@rbx/net` — RateLimiter constructor validation (windowMs > 0, maxRequests > 0).
  - `@rbx/rewards` — Empty cycle guard, corrupt data sanitization in `tryComplete()`.
  - `@rbx/battle-pass` — Negative XP guard, `RewardEntry` type alignment.
  - `@rbx/quests` — `hasCompletedId` refactor, `RewardEntry` type alignment.
  - `@rbx/moderation` — Input validation, `Counter` constructor migration.
  - `@rbx/combat` — `PositionProvider` pattern, hit validation improvements.
  - `@rbx/observability` — `@internal` annotations, `CommonMetrics` constructor migration.
  - `@rbx/config-featureflags` — `@internal` annotations for internal APIs.
  - `@rbx/security` — `pcall` error logging in detectors.
- **New test coverage** — 2,103 tests across 90 test suites (up from ~1,500).
  - Added tests for: collections, base-player-store, detectors, enforcer, trust-score, result, testing utilities, rate-limiter constructor validation.
- **Dashboard security hardening** — IDOR fixes, rate limiting, timing-safe API key comparison, RBAC enforcement.
- **Module documentation** — 13 new module docs (audio, core, data, gacha, localization, net, observability, pets, rewards, security, shared-types, tutorial, world-systems).
- **Package READMEs** — Added for audio, battle-pass, cosmetics, gacha, localization, pets, tutorial, world-systems.

### Changed

- **Combat system** - Weapon definitions, hit validation, damage calculation, cooldown management.
- **Match system** - Full match lifecycle (waiting → starting → in-progress → ended) with team scores and player stats.
- **Server allocation** - Reserved server provisioning with health monitoring and graceful shutdown.
- **Match history dashboard** - List and detail views with filtering by status and game mode.
- **Match/MatchPlayer database tables** - Prisma schema for match persistence.
- **@rbx/data tests** - 24 unit tests for data persistence layer (versioning, sessions, migrations, retry, cache).
- **@rbx/security tests** - 41 unit tests for security package (trust scoring, violation detection, enforcement).
- **@rbx/observability tests** - 44 unit tests for observability package (telemetry, metrics, spans, context).
- **Dashboard deployed to Vercel** - Live at https://rbx-dashboard.vercel.app
- **Feature flags UI** - Per-environment toggles (dev/stage/prod) with database persistence.
- **Audit logging** - Complete history of all privileged actions with user attribution.
- **Role-based permissions** - VIEWER, MODERATOR, ENGINEER, ADMIN roles with server-side enforcement.
- **Flags REST API** - `GET /api/flags/:environment` endpoint for game servers.
- **GitHub OAuth** - Authentication via GitHub OAuth with NextAuth.js v5.
- **MySQL/MariaDB support** - Prisma 7 with MariaDB adapter for lima-city hosting.
- **@rbx/core/collections** - Shared roblox-ts compatible collection helpers (`arraySize`, `arrayRemoveAt`, `arrayTake`, `setSize`), replacing duplicated inline helpers across packages.
- **@rbx/movement tests** - 50 comprehensive unit tests for MovementValidator (speed hacks, teleport, fly, jump, sequence validation, state management).
- **Array.prototype.size polyfill** - Added to `@rbx/testing` roblox-mocks for roblox-ts array compatibility in Node.js tests.
- **Obby game** - Second game template (`games/obby/`) with stages, checkpoints, coins, leaderboards, and remote payload parsers.
- **@rbx/codes** - Redeemable promo code system with single/multi-use, expiry, and limits.
- **@rbx/leaderboards** - Cross-game leaderboard system with period support and sorted entries.
- **@rbx/analytics** - Player behavior analytics — events, funnels, sessions, and retention tracking.
- **@rbx/notifications** - In-game notification system — toasts, announcements, and news feed.
- **@rbx/inventory** - Base item and slot inventory system with stacking and weight limits.
- **@rbx/progression** - XP, levels, and prestige/rebirth system with configurable curves.
- **@rbx/quests** - Quest and objective tracking system with multi-step progress.
- **@rbx/rewards** - Daily login rewards, streaks, and achievement tracking.
- **@rbx/pets** - Pet system with hatching, equipping, leveling, abilities, and evolution.
- **@rbx/gacha** - Gacha / loot box system with pity timers and banner management.
- **@rbx/cosmetics** - Cosmetic items, skins, and appearance customization.
- **@rbx/battle-pass** - Seasonal battle pass with tiers, XP, and reward tracks.
- **@rbx/localization** - Internationalization — multi-locale string registry with interpolation and pluralization.
- **@rbx/audio** - SFX, music, spatial audio, playlists, and per-channel volume management.
- **@rbx/tutorial** - FTUE and guided tutorial framework with step sequencing and persistence.
- **@rbx/world-systems** - Day/night cycle, weather transitions, and season progression.
- **Service factory files** for all 25 packages — consistent `create*Service()` pattern with lifecycle hooks (`onInit`, `onStart`, `onDestroy`), player handlers (`initPlayer`, `cleanupPlayer`), and typed config.
- **Factory test suites** — 25 test files covering every factory with mock isolation and independent-instance assertions.
- **Test coverage: 1,500+ tests** across 70 test suites (all packages, games, and dashboard).
- **Shared Roblox runtime types** - `types/roblox-runtime.d.ts` centralizes `game`, `pcall`, `typeIs`, `os`, `math`, `string`, `print`, `select`, and DataStore ambient declarations; 17 per-file declaration blocks removed.
- **Reusable CI workflow** - `.github/workflows/build-and-publish.yml` — shared build + publish logic extracted from promote.yml.

### Changed

- **Dashboard tech stack** - Updated to Next.js 16, Tailwind CSS 4, Prisma 7.
- **Documentation** - Comprehensive updates to dashboard docs (tech-stack, rbac-and-audit).
- **Getting started guide** - Added dashboard setup instructions.
- **README** - Added dashboard section and live link badge.
- **Package versions** - Bumped 13 Phase 1–2 packages from `0.0.0` to `0.2.0` (moderation/movement at `0.1.0`).
- **package.json exports** - Standardized `exports` and `types` fields across all 31 packages to canonical pattern.
- **package.json descriptions** - Added missing description fields to 10 packages.
- **tsconfig.roblox.json** - Expanded root path mappings from 4 to 30 packages (all packages now mapped).
- **tsconfig.roblox.json normalization** - All 22 package tsconfigs standardized to identical template with consistent `typeRoots`, `types`, `downlevelIteration`, `exclude`, and `declarationDir`. Removed non-standard JSX, decorator, and path overrides from battle-pass/cosmetics/gacha.
- **vitest.config.ts** - Expanded aliases to cover all packages; fixed cross-package aliases.
- **@rbx/constants** - Now exports `validation.ts` module (previously dead code).
- **@rbx/combat + @rbx/matchmaking** - Now depend on `@rbx/core` for shared collection helpers (removed ~130 lines of duplicated code).
- **@rbx/audio SoundDefinition** - `playbackSpeed` and `maxInstances` now optional with defaults.
- **@rbx/world-systems configs** - `DayNightConfig.presets`, `WeatherConfig.definitions`, `SeasonConfig.seasons/startingSeason` now optional with sane defaults.
- **input + ui packages** - Added missing `lint`, `typecheck`, and `test` scripts.
- **Roadmap** - Updated through Phase 5c reflecting all completed work.
- **Starter/Obby games** - Fixed `registerStrings` arg order, `registerPlaylist` signatures, and all roblox-ts reserved identifier usage.
- **CI caching** - Added pnpm store caching to ci.yml for faster builds.
- **CI obby build** - ci.yml now builds both starter and obby games.
- **CI DRY refactor** - promote.yml reduced from 260 to ~75 lines; shared logic extracted to reusable `build-and-publish.yml` workflow.
- **@rbx/observability** - Deprecated `createCounter`/`createGauge`/`createHistogram` factory functions in favour of direct class constructors.
- **Coverage thresholds** - Raised vitest thresholds from 50% to 80% lines/functions/statements and 65% branches.
- **devDependencies** - Added missing `typescript` and `vitest` to 8 packages (config-featureflags, constants, core, input, matchmaking, net, shared-types, ui).
- **CI** - Node 22 alignment, pnpm 9.15.4 pinning, rbxcloud URL fix in publish workflows.

### Fixed

- **roblox-ts reserved identifiers** - Renamed `next` → `newVol`/`nextDef` and `table` → `nsMap` in audio/localization/world-systems packages (Lua reserved words cannot be used as identifiers in roblox-ts).
- **`Object.keys()` unavailable in roblox-ts** - Replaced with `pairs()` iteration in localization-service `objectKeys` helper.
- **`downlevelIteration` missing** - Added to all per-package `tsconfig.roblox.json` files for `pairs()` / `for...of` compatibility.
- **world-systems tsconfig** - Rebuilt from scratch (was missing `allowSyntheticDefaultImports`, `typeRoots`, `types`, `rbxts` section).

### Removed

- **Unused pnpm overrides** - Removed `hono` and `lodash` entries from `pnpm.overrides` (neither package exists in the dependency tree).
- **Orphaned `roblox-globals.d.ts`** - Root-level ambient type file that was never referenced by any tsconfig.
- **Per-file Roblox declarations** - Removed 17 redundant `declare const game/pcall/os/math` blocks; replaced by shared `types/roblox-runtime.d.ts`.

## 0.1.0 - 2026-01-24

### Added

- **Open Cloud CI/CD publishing** - Automated publishing to dev on main push, manual promotion to staging/production with approval gates.
- **Reusable build-game action** - Composite GitHub Action for DRY build steps.
- **CI/CD secrets documentation** - Setup guide for Roblox Open Cloud API keys and GitHub Environments.
- Initial docs site (MkDocs) and architecture plan.
- Monorepo scaffold (pnpm workspaces) for platform packages, starter game, and dashboard.
- CI workflows for JS checks and docs publishing.
- roblox-ts monorepo architecture: packages (`@rbx/*`) compile independently with `--type package`, games consume them via Rojo symlinks.
- Parallel docs deployment to lima-city (`lftp --parallel=10`).
- Dependabot configuration with grouped updates (dev-dependencies, roblox-ts, eslint).
- Branch protection on `main` requiring CI and PR reviews.
- **MIT License** for open-source distribution.
- **Package README files** with comprehensive API documentation for all packages.
- **Build verification in CI** - packages and starter game are now built in CI pipeline.
- **Pre-commit hooks** using simple-git-hooks and lint-staged for automatic linting and formatting.
- **Test coverage configuration** with vitest, including coverage thresholds (80% lines/functions/statements, 65% branches).
- **VSCode workspace settings** with recommended extensions, tasks, and editor configuration.
- **Tools directory** with error catalog generator script.
- **Error code reference documentation** auto-generated from ErrorCode enum.
- **Enhanced CONTRIBUTING.md** with detailed workflow, commit conventions, and branch protection info.
- **@rbx/testing package** - Shared test utilities, mocks, and helpers for vitest.
- **Expanded test coverage** - 241 tests across all packages (core, config-featureflags, net, shared-types, constants, dashboard, starter game).
- **Commitlint** - Conventional commit enforcement with commit-msg hook.
- **Coverage tooling** - `@vitest/coverage-v8` for test coverage reporting.
- **Luau tooling** - Added selene (linter) and stylua (formatter) to aftman.toml with configuration.
- **VS Code launch.json** - Debug configurations for tests, tools, and dashboard.
- **CODEOWNERS** - Code review ownership routing for GitHub.
- **Security scanning** - `pnpm audit` step added to CI workflow.
- **@rbx/constants package** - Centralized timeout, limit, and build constants (zero dependencies).
- **Result<T> type system** - Explicit error handling with `ok()`, `err()`, `isOk()`, `isErr()` helpers in shared-types.
- **Enhanced ErrorCode enum** - Expanded error codes with code ranges (validation, business, protocol, auth, server).
- **Application lifecycle** - `start()`/`stop()`/`dispose()` methods with proper state management in core.
- **Client utilities** - `withRetry()` and `withTimeout()` helpers in net package.
- **Enhanced Logger** - Child loggers with `child()` method and structured context support.
- **Protocol compatibility tests** - Serialization round-trip tests for network types.
- **Application integration tests** - Lifecycle and state management tests.
- **Result types documentation** - New reference page at `docs/reference/result-types.md`.
- **Remote Registry** - Type-safe remote definitions with `defineServerFunction()`, `defineServerEvent()`, `defineClientEvent()` in net package.
- **Server/Client Remote Registry** - `createServerRegistry()` and `createClientRegistry()` for automatic remote creation and connection.
- **@rbx/data package** - Player data persistence layer with DataStore wrapper, versioning, migrations, and retry.
- **SessionManager** - Auto-save and cleanup for player sessions with dirty tracking.
- **@rbx/security package** - Security utilities with violation detectors, trust scoring, and enforcement.
- **Violation Detectors** - `checkSpeed()`, `checkTeleport()`, `reportInvalidData()`, `checkRateAbuse()` functions.
- **Trust Score System** - Factor-based trust calculation for adaptive enforcement.
- **Enforcer** - Automatic violation handling with escalation policy (warn → kick → ban).
- **@rbx/observability package** - Telemetry, metrics, spans, and correlation context for game instrumentation.
- **Telemetry system** - `emit()` events with automatic context enrichment (player, session, server).
- **Metrics collection** - `incrementCounter()`, `setGauge()`, `recordHistogram()`, `recordTiming()` functions.
- **Span tracing** - `startSpan()`, `endSpan()`, `withSpan()` for operation tracing.
- **Correlation context** - Request-scoped context propagation across async operations.
- **@rbx/input package** - Unified input abstraction for keyboard, gamepad, and touch controls.
- **Device detection** - Automatic detection of input device type with change callbacks.
- **Action system** - Register named actions with bindings, query active state.
- **Movement state** - Unified `getMovementState()` returning normalized move vectors.
- **Default bindings** - Pre-configured WASD/arrow keys, gamepad sticks, touch controls.
- **@rbx/ui package** - Reusable UI component library with theming support.
- **Theme system** - Dark/light themes with color utilities (`rgb()`, `hex()`, `darken()`, `lighten()`).
- **Creation utilities** - `createFrame()`, `createLabel()`, `createButton()`, `createScrollFrame()`.
- **Layout helpers** - `addCorner()`, `addPadding()`, `addListLayout()`, `addGridLayout()`, `addStroke()`.
- **Components** - `Dialog`, `Toast`, `ListView`, `ProgressBar`, `Spinner` higher-level components.
- **Starter game tests** - 32 unit tests for handshake, action validation, and remote contracts.
- **Root package.json** - Added `"type": "module"` for ES modules support.

### Changed

- Consolidated docs workflows into single `docs-deploy-limacity.yml` (removed redundant `docs.yml`).
- Bumped GitHub Actions to v6 (checkout, setup-node, setup-python).
- **README.md** now includes MIT license info and build workflow documentation.
- **@rbx/net** now imports types from `@rbx/shared-types` instead of duplicating them.
- **.gitignore** updated with better patterns for coverage, VSCode settings, and build outputs.
- **Package.json exports** - All packages now have proper `exports` field for module resolution.
- **Configuration docs** - Updated with constants and feature flags documentation.
- **Networking docs** - Added client utilities section and Result type references.
- **Runtime docs** - Updated Application lifecycle with new API methods.
- **Folders & packages docs** - Added all new packages with descriptions.
- **tsconfig.json files** - Roblox packages now extend their tsconfig.roblox.json for proper VS Code intellisense.

### Removed

- **Duplicate types file** (`packages/net/src/types.ts`) - types now imported from @rbx/shared-types.
