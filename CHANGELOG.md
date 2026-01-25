# Changelog

All notable changes to this project will be documented in this file.

This project follows **Keep a Changelog** and aims to follow **Semantic Versioning** once we cut the first tagged release.

Notes:

- Platform/API compatibility is also governed by protocol versioning rules in `docs/architecture/decisions/0002-network-protocol-versioning.md`.
- Release flow and environment promotion is governed by `docs/architecture/decisions/0004-ci-publish-promote-open-cloud.md`.

## Unreleased

### Added

- **Phase 1 test coverage complete** - 305 total tests across all packages.
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

### Changed

- **Dashboard tech stack** - Updated to Next.js 16, Tailwind CSS 4, Prisma 7.
- **Documentation** - Comprehensive updates to dashboard docs (tech-stack, rbac-and-audit).
- **Getting started guide** - Added dashboard setup instructions.
- **README** - Added dashboard section and live link badge.

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
- **Test coverage configuration** with vitest, including coverage thresholds (50% minimum).
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
