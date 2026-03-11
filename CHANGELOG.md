# Changelog

All notable changes to this project will be documented in this file.

This project follows **Keep a Changelog** and aims to follow **Semantic Versioning** once we cut the first tagged release.

Notes:

- Platform/API compatibility is also governed by protocol versioning rules in `docs/architecture/decisions/0002-network-protocol-versioning.md`.
- Release flow and environment promotion is governed by `docs/architecture/decisions/0004-ci-publish-promote-open-cloud.md`.

## Unreleased

### Added

- **@broblox/equipment package** — Reusable gear & equipment slot system. `GearRegistry` for static definitions with rarity tiers (Common → Mythic) and stat modifiers. `EquipmentStore` for per-player equip/unequip — one gear per named slot. `createEquipmentService` factory. 54 tests across 4 suites.
- **@broblox/hazards package** — Pure-logic environmental hazard system. `HazardRegistry` for definition lookup by ID or CollectionService tag. `HazardManager` tracks per-instance state (5 behaviours: instant_kill, damage_zone, timed_burst, crumbling, contact_damage), timed toggles, and per-player immunity windows. `createHazardService` factory. 37 tests across 3 suites.
- **Observability HTTP sinks** — `@broblox/observability` now ships telemetry events to the dashboard via configurable HTTP sinks with batching and sample rate control. Dashboard API ingests and indexes events.
- **Telemetry dashboard page** — new `/telemetry` page with KPI cards (total events, unique players, unique categories, unique games), category breakdown chart, recent events stream, and environment/category/level filters.
- **CI/CD improvements** — Discord webhook notifications for publish/promote outcomes, `.rbxl` build artifact uploads for audit/rollback, PR preview deploys for docs site and website, path filtering for docs-only PRs.
- **Dashboard hardening** — distributed rate limiting (replaces in-memory limiter), Zod validation on all server actions, explicit CSRF token mechanism (double-submit cookie), custom `error.tsx` and `not-found.tsx` pages, Settings page buildout.
- **Dashboard CSRF protection** — `ensureCsrfCookie()` sets a double-submit CSRF cookie via Edge middleware using Web Crypto API. API routes are exempt (game servers use API keys). `validateCsrf()` for mutating browser-facing API routes.

### Changed

- **Dashboard BigInt serialization** — Prisma `BigInt` fields (Roblox universe/place IDs, player IDs) are now converted before reaching React Server Components. Uses `$queryRaw` with `COUNT(DISTINCT ...)` for DB-side aggregation instead of client-side `findMany` + `.length`.
- **CSRF cookie moved to middleware** — was previously set in the dashboard layout (RSC), which is forbidden by Next.js. Now set in `middleware.ts` with Edge-compatible Web Crypto API (`crypto.getRandomValues` + constant-time XOR comparison).

### Fixed

- **Dashboard 500 error (BigInt)** — `TypeError: Do not know how to serialize a BigInt` in RSC protocol when Prisma returned `BigInt` fields for Roblox IDs and player counts (PRs #183, #184).
- **Dashboard 500 error (CSRF)** — `Error: Cookies can only be modified in a Server Action or Route Handler` caused by `getCsrfToken()` calling `cookieStore.set()` during RSC render (PR #185).
- **Dashboard 404 errors (routing)** — game card clicks and internal navigation used `/dashboard/games/[id]` instead of `/games/[id]`. The `(dashboard)` route group does not appear in URL paths. Fixed 24 occurrences across 16 files (PR #186).
- **Obby: HazardService** — 6 hazard definitions (lava floor, fire jet, poison zone, crumbling platform, spike trap, hot surface). Humanoid damage via `TakeDamage()`, death tracking via `DataService.incrementDeaths()`, `CollectionService` tag scanning, `RunService.Heartbeat` → `manager.update(dt)`, `HazardToggle`/`HazardDamage` remotes. 16 integration tests.
- **Obby: Lava Caves world** — New `lava_caves` world config (unlock: speed 15, jump 40, stamina 10, requires grasslands completion), shared types and remote events for hazards, client-side HudController (damage flash) and RemoteController (hazard event listeners).
- **@broblox/marketplace package (ADR-0008)** — Roblox `MarketplaceService` wrapper for developer products, game passes, and idempotent purchase receipt validation. Includes `DeveloperProductRegistry`, `GamePassCache` (TTL-based ownership cache), `PurchaseValidator` (deduplicates on `PurchaseId`), and `createMarketplaceService` factory. 47 tests across 5 suites.
- **ADR-0008** — Architecture decision record for marketplace / MonetizationService wrapper.
- **Scope rename** — all internal packages renamed from `@rbx/*` to `@broblox/*` for branding consistency (491 files, zero external impact since all packages are private).

### Changed

- **Rollup security patch** — added pnpm override `rollup@>=4.0.0 <4.59.0: ">=4.59.0"` to fix GHSA-mw96-cpmx-2vgc. All `@rollup/*` platform packages upgraded 4.55.2 → 4.59.0.
- **tsconfig.roblox.json** — added `@broblox/events` path alias.
- **vitest.config.ts** — added `@broblox/marketplace` alias.
- **Docs sync** — updated `NEXT-SESSION.md`, `README.md`, `docs/roadmap/overview.md`, `docs/roadmap/future-phases.md`, `docs/architecture/folders-and-packages.md`, and `docs/architecture/platform.md` to reflect 33 packages, Phase 4 complete status, and marketplace addition.

---

## Previous (pre-marketplace)

### Added

- **@broblox/movement — configurable `ValidationThresholds`** — all detection thresholds are now tunable per-game via `createMovementValidationService({ thresholds: { ... } })`. New `ValidationThresholds` interface exported from `@broblox/movement`.
- **@broblox/movement — axis-split teleport detection** — teleport checks now use separate horizontal and vertical budgets with a gravity term (`0.5 * g * dt²`) for accurate freefall detection.
- **@broblox/movement — dead-character skip** — validation is paused when `humanoid.Health <= 0` to prevent false positives from ragdoll physics.
- **@broblox/movement — `notifyTeleport()` API** — `MovementStateManager.notifyTeleport(player, newPos)` resets state after server-initiated teleports (checkpoint respawn, stage warp) to avoid false violations.
- **@broblox/movement — server teleport auto-detection** — large server-side position changes are automatically detected and reset state instead of flagging a violation.
- **@broblox/movement — character-change detection** — movement state resets when Roblox's UI character reset creates a new character model.
- **@broblox/moderation — chat moderation** — `createChatModerationService()` prevents muted players from sending chat messages.
- **Test Park — Baseplate and SpawnLocation** — added ground plane and spawn point via Rojo model JSON files and Workspace section in `default.project.json`.

- **Dashboard News CMS** — full CRUD for studio news posts (`/news`).
  - `NewsPost` Prisma model (title, slug, content, excerpt, coverImage, published, author).
  - Server actions for create / update / delete with RBAC enforcement (ENGINEER+ required).
  - Public API endpoint `GET /api/news` consumed by website with ISR (5-min revalidation).
  - Dashboard list view with status badges and edit page with live preview.

- **Live leaderboard pipeline** — OrderedDataStore → Dashboard API → Website.
  - In-game `LeaderboardService` publishes scores to Roblox OrderedDataStore.
  - Dashboard API `GET /api/leaderboards` queries Open Cloud OrderedDataStore.
  - Website `/rankings` page renders live player rankings with period selector.

- **@broblox/ui v1** — 8 full-screen UI modules for roblox-ts games.
  - `daily-rewards.ts` — reward calendar with streak tracking and claim animations.
  - `quest-tracker.ts` — HUD overlay with objective progress and tier badges.
  - `pet-collection.ts` — grid browser with equip/unequip and XP bars.
  - `inventory.ts` — item grid with search, filters, and drag-to-equip.
  - `cosmetics.ts` — appearance customizer with category tabs and preview.
  - `gacha.ts` — egg/banner opening screen with pity display and animations.
  - `settings.ts` — accessibility and preference panel with sliders and toggles.
  - `battle-pass.ts` — seasonal pass viewer with tier progression and reward previews.

- **Module documentation** — 10 new module docs (combat, matchmaking, moderation, movement, codes, notifications, leaderboards, inventory, progression, quests).
- **Dashboard documentation** — News CMS and Website docs added to dashboard section.
- **ADR-0007** — Multi-game dashboard design decision record added to nav.
- **Roblox type declarations** — Comprehensive GUI types (`Frame`, `TextLabel`, `TextButton`, `ScrollingFrame`, `UIListLayout`, `UICorner`, `UIPadding`, `UIStroke`, `UIGradient`), `Enum` namespace, `TweenInfo`, `UDim2`, `UDim`, `Color3`, `NumberSequence` added to `types/roblox-runtime.d.ts`.
- **String.upper / String.lower** — Added to `types/roblox-ts-editor.d.ts` for roblox-ts string method compat.

### Changed

- **@broblox/movement — timing overhaul** — delta-time now uses `math.max(heartbeat dt, os.clock() delta)` capped at 1.0 s (replaces 0.25 s clamp). Prevents both large-dt exploits and Studio lag spike false positives.
- **@broblox/movement — speed tolerance raised** — `speedTolerance` default changed from `1.5` to `2.0` for more lag-tolerant speed checks.
- **@broblox/movement — teleportDistanceMin raised** — default `teleportDistanceMin` changed from `20` to `30` studs.
- **Obby game — movement thresholds** — overrides `teleportDistanceMin: 75` for large vertical drops between stages.
- **Test Park — added dependencies** — `@broblox/observability`, `@broblox/data`, `@broblox/input` added as dependencies with Rojo mappings.
- **Test suite** — 2,329 tests across 105 test suites (up from 2,307 / 105).
- **Documentation** — Updated movement.md (thresholds, axis-split detection, notifyTeleport API), core.md (153 tests, PlayerAdded dedup), security.md (threshold interaction with @broblox/movement), folders-and-packages.md (test park deps, movement description).
- **Roadmap** — Phase 4 marked complete; future-phases and overview docs updated with deliverables.
- **mkdocs.yml** — Navigation updated: 10 new module entries, 2 new dashboard entries, ADR-0007.
- **docs/modules/rewards.md** — Rewritten with accurate DailyRewardStore + AchievementStore coverage (47 tests).
- **docs/modules/daily-rewards.md** — Consolidated into rewards.md (redirect note).

---

- **BroBlox website (`apps/website`)** — public-facing marketing and game portal at [broblox-games.com](https://broblox-games.com)
  - Next.js 16 app with Tailwind CSS 4, neon cyan/purple (`#00e5ff` / `#c084fc`) brand theme.
  - Responsive nav with mobile hamburger drawer.
  - Homepage: hero with shimmer headline, games grid, platform features, animated stats counters, footer.
  - `/games` — full games listing page.
  - `/games/[slug]` — per-game detail page with features grid and wiki/Roblox CTAs.
  - `/games/[slug]/wiki` — player wiki and mechanics reference (Obby + Test Park).
  - `/rankings` — global leaderboard page (static placeholder; live Roblox Open Cloud wiring TBD).
  - `/news` — studio announcements and patch notes.
  - Root monorepo scripts: `pnpm website:dev`, `pnpm website:build`.

- **Repo renamed to `broblox`** — GitHub repo moved from `rbx-game-platform` → `broblox`; all CI badge URLs, dashboard links, and docs `site_url` updated accordingly.

- **Domains live**
  - `broblox-games.com` — website (Vercel)
  - `dashboard.broblox-games.com` — operations dashboard (Vercel)
  - `docs.broblox-games.com` — documentation (lima-city via SFTP deploy)

### Fixed

- **@broblox/core — circular dependency** — resolved circular import between core modules.
- **@broblox/core — PlayerAdded deduplication** — `createPlayerLifecycleService` now deduplicates `PlayerAdded` events to prevent double-fire on rapid reconnects.
- **@broblox/config-featureflags — pcall wrappers** — `GetAsync` and `Connect` calls wrapped in `pcall` for safe fallback when RemoteConfig is unavailable.
- **@broblox/movement — checkpoint respawn false positives** — `CheckpointService` now calls `notifyTeleport()` after CFrame respawns so the movement validator doesn't flag the teleport.
- **@broblox/movement — invalid_jump false positives** — early return when `input.velocity.Y < 0` (falling, not jumping).
- **Test Park — missing module: observability** — added `@broblox/observability`, `@broblox/data`, `@broblox/input` Rojo mappings and package.json dependencies.
- **Test Park — no ground** — added Baseplate (512×512 Part) and SpawnLocation via Rojo model JSON files; players no longer fall through the void.

- Removed `prisma db push` from the dashboard `build` script — it requires a live database which is not available in Vercel's build environment. Moved to a separate `db:push` script.

- **Game service wiring & test coverage (notification callbacks, event remotes, analytics)**
  - Added `onQuestCompleted` callback to `createQuestService` config; wired in both games to fire typed (obby) or generic Notification (test-park) client events.
  - Added `onAchievementCompleted` and `onDailyRewardClaimed` callbacks to `createRewardsService` config; wired in both games.
  - **Obby typed remotes** — `LevelUp`, `PrestigeUnlocked`, `QuestCompleted`, `AchievementCompleted`, `DailyRewardClaimed` added to `ObbyRemotes`.
  - **Event broadcast remotes** — `EventStarted` / `EventEnded` (typed `EventActivePayload`) added to both `GameRemotes` (test-park) and `ObbyRemotes`, with `fireAllClients` wiring in both games' `EventService`; removes the long-standing TODO comment.
  - **Stage achievements** — `StageService.completeStage` now increments `ach_first_stage`, `ach_stages_25`, `ach_stages_100` progress on every completion.
  - **Level achievements** — Obby `ProgressionService.onLevelUp` sets `ach_level_25`; test-park sets `ach_level_10` and `ach_level_50`.
  - **Kill routing** — Test Park `ActionService` routes `actionId === "kill"` to quest `incrementObjective("kill")`, achievement `incrementProgress` for `ach_first_kill` / `ach_kill_100`, and analytics `track("action.kill")`.
  - `action.kill` event definition added to test-park `AnalyticsService`.
  - `player.level_up` analytics event now fired from test-park `ProgressionService.onLevelUp`.
  - Removed dead `initPlayerProgression` / `initPlayerQuests` / `initPlayerRewards` functions and unused loggers from both games.
- **New test files (103 suites / 2,266 tests, up from 101 / 2,253)**
  - `games/obby/src/server/services/AnalyticsService.test.ts` (14 tests) — datastoreName, event defs, funnel defs, lifecycle wiring.
  - `games/obby/src/server/services/EventService.test.ts` (9 tests) — `EventStarted` / `EventEnded` broadcast, no-modifier path, lifecycle wiring.
  - `games/test-park/src/server/services/AnalyticsService.test.ts` (15 tests) — datastoreName, all 7 event defs incl. `action.kill`, funnel, lifecycle.
  - `games/test-park/src/server/services/EventService.test.ts` (9 tests) — same broadcast coverage.
  - `games/test-park/src/server/services/ActionService.test.ts` (9 tests) — kill quest/achievement/analytics routing, graceful undefined stores, validation-fail short-circuit.
  - Updated `games/test-park/src/server/services/ProgressionService.test.ts` — added `player.level_up` analytics assertion and `./AnalyticsService` mock.

- **Defensive Guards (Deep Review Rounds 1–15)** — Systematic hardening across all packages:
  - `@broblox/progression` — NaN/Infinity XP guard, corrupt data clamping in `load()`.
  - `@broblox/pets` — Negative XP guard, nickname length validation, `equippedCount` cleanup.
  - `@broblox/gacha` — Negative balance guard in `pull()`.
  - `@broblox/cosmetics` — Unequip-previous-item event on equip.
  - `@broblox/leaderboards` — NaN/Infinity/negative score guard in `submitScore()`.
  - `@broblox/codes` — DataStore fault tolerance via `pcall` wrapping.
  - `@broblox/movement` — DeltaTime ≤ 0 guard, `stateManager` exposure.
  - `@broblox/tutorial` — Corrupt progress data clamping in `restoreProgress()`.
  - `@broblox/world-systems` — DeltaTime ≤ 0 guard in tick loop.
  - `@broblox/net` — RateLimiter constructor validation (windowMs > 0, maxRequests > 0).
  - `@broblox/rewards` — Empty cycle guard, corrupt data sanitization in `tryComplete()`.
  - `@broblox/battle-pass` — Negative XP guard, `RewardEntry` type alignment.
  - `@broblox/quests` — `hasCompletedId` refactor, `RewardEntry` type alignment.
  - `@broblox/moderation` — Input validation, `Counter` constructor migration.
  - `@broblox/combat` — `PositionProvider` pattern, hit validation improvements.
  - `@broblox/observability` — `@internal` annotations, `CommonMetrics` constructor migration.
  - `@broblox/config-featureflags` — `@internal` annotations for internal APIs.
  - `@broblox/security` — `pcall` error logging in detectors.
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
- **@broblox/data tests** - 24 unit tests for data persistence layer (versioning, sessions, migrations, retry, cache).
- **@broblox/security tests** - 41 unit tests for security package (trust scoring, violation detection, enforcement).
- **@broblox/observability tests** - 44 unit tests for observability package (telemetry, metrics, spans, context).
- **Dashboard deployed to Vercel** - Live at https://rbx-dashboard.vercel.app
- **Feature flags UI** - Per-environment toggles (dev/stage/prod) with database persistence.
- **Audit logging** - Complete history of all privileged actions with user attribution.
- **Role-based permissions** - VIEWER, MODERATOR, ENGINEER, ADMIN roles with server-side enforcement.
- **Flags REST API** - `GET /api/flags/:environment` endpoint for game servers.
- **GitHub OAuth** - Authentication via GitHub OAuth with NextAuth.js v5.
- **MySQL/MariaDB support** - Prisma 7 with MariaDB adapter for lima-city hosting.
- **@broblox/core/collections** - Shared roblox-ts compatible collection helpers (`arraySize`, `arrayRemoveAt`, `arrayTake`, `setSize`), replacing duplicated inline helpers across packages.
- **@broblox/movement tests** - 50 comprehensive unit tests for MovementValidator (speed hacks, teleport, fly, jump, sequence validation, state management).
- **Array.prototype.size polyfill** - Added to `@broblox/testing` roblox-mocks for roblox-ts array compatibility in Node.js tests.
- **Obby game** - Second game template (`games/obby/`) with stages, checkpoints, coins, leaderboards, and remote payload parsers.
- **@broblox/codes** - Redeemable promo code system with single/multi-use, expiry, and limits.
- **@broblox/leaderboards** - Cross-game leaderboard system with period support and sorted entries.
- **@broblox/analytics** - Player behavior analytics — events, funnels, sessions, and retention tracking.
- **@broblox/notifications** - In-game notification system — toasts, announcements, and news feed.
- **@broblox/inventory** - Base item and slot inventory system with stacking and weight limits.
- **@broblox/progression** - XP, levels, and prestige/rebirth system with configurable curves.
- **@broblox/quests** - Quest and objective tracking system with multi-step progress.
- **@broblox/rewards** - Daily login rewards, streaks, and achievement tracking.
- **@broblox/pets** - Pet system with hatching, equipping, leveling, abilities, and evolution.
- **@broblox/gacha** - Gacha / loot box system with pity timers and banner management.
- **@broblox/cosmetics** - Cosmetic items, skins, and appearance customization.
- **@broblox/battle-pass** - Seasonal battle pass with tiers, XP, and reward tracks.
- **@broblox/localization** - Internationalization — multi-locale string registry with interpolation and pluralization.
- **@broblox/audio** - SFX, music, spatial audio, playlists, and per-channel volume management.
- **@broblox/tutorial** - FTUE and guided tutorial framework with step sequencing and persistence.
- **@broblox/world-systems** - Day/night cycle, weather transitions, and season progression.
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
- **@broblox/constants** - Now exports `validation.ts` module (previously dead code).
- **@broblox/combat + @broblox/matchmaking** - Now depend on `@broblox/core` for shared collection helpers (removed ~130 lines of duplicated code).
- **@broblox/audio SoundDefinition** - `playbackSpeed` and `maxInstances` now optional with defaults.
- **@broblox/world-systems configs** - `DayNightConfig.presets`, `WeatherConfig.definitions`, `SeasonConfig.seasons/startingSeason` now optional with sane defaults.
- **input + ui packages** - Added missing `lint`, `typecheck`, and `test` scripts.
- **Roadmap** - Updated through Phase 5c reflecting all completed work.
- **Test Park/Obby games** - Fixed `registerStrings` arg order, `registerPlaylist` signatures, and all roblox-ts reserved identifier usage.
- **CI caching** - Added pnpm store caching to ci.yml for faster builds.
- **CI obby build** - ci.yml now builds both test-park and obby games.
- **CI DRY refactor** - promote.yml reduced from 260 to ~75 lines; shared logic extracted to reusable `build-and-publish.yml` workflow.
- **@broblox/observability** - Deprecated `createCounter`/`createGauge`/`createHistogram` factory functions in favour of direct class constructors.
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
- Monorepo scaffold (pnpm workspaces) for platform packages, test park, and dashboard.
- CI workflows for JS checks and docs publishing.
- roblox-ts monorepo architecture: packages (`@broblox/*`) compile independently with `--type package`, games consume them via Rojo symlinks.
- Parallel docs deployment to lima-city (`lftp --parallel=10`).
- Dependabot configuration with grouped updates (dev-dependencies, roblox-ts, eslint).
- Branch protection on `main` requiring CI and PR reviews.
- **MIT License** for open-source distribution.
- **Package README files** with comprehensive API documentation for all packages.
- **Build verification in CI** - packages and test park are now built in CI pipeline.
- **Pre-commit hooks** using simple-git-hooks and lint-staged for automatic linting and formatting.
- **Test coverage configuration** with vitest, including coverage thresholds (80% lines/functions/statements, 65% branches).
- **VSCode workspace settings** with recommended extensions, tasks, and editor configuration.
- **Tools directory** with error catalog generator script.
- **Error code reference documentation** auto-generated from ErrorCode enum.
- **Enhanced CONTRIBUTING.md** with detailed workflow, commit conventions, and branch protection info.
- **@broblox/testing package** - Shared test utilities, mocks, and helpers for vitest.
- **Expanded test coverage** - 241 tests across all packages (core, config-featureflags, net, shared-types, constants, dashboard, test park).
- **Commitlint** - Conventional commit enforcement with commit-msg hook.
- **Coverage tooling** - `@vitest/coverage-v8` for test coverage reporting.
- **Luau tooling** - Added selene (linter) and stylua (formatter) to aftman.toml with configuration.
- **VS Code launch.json** - Debug configurations for tests, tools, and dashboard.
- **CODEOWNERS** - Code review ownership routing for GitHub.
- **Security scanning** - `pnpm audit` step added to CI workflow.
- **@broblox/constants package** - Centralized timeout, limit, and build constants (zero dependencies).
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
- **@broblox/data package** - Player data persistence layer with DataStore wrapper, versioning, migrations, and retry.
- **SessionManager** - Auto-save and cleanup for player sessions with dirty tracking.
- **@broblox/security package** - Security utilities with violation detectors, trust scoring, and enforcement.
- **Violation Detectors** - `checkSpeed()`, `checkTeleport()`, `reportInvalidData()`, `checkRateAbuse()` functions.
- **Trust Score System** - Factor-based trust calculation for adaptive enforcement.
- **Enforcer** - Automatic violation handling with escalation policy (warn → kick → ban).
- **@broblox/observability package** - Telemetry, metrics, spans, and correlation context for game instrumentation.
- **Telemetry system** - `emit()` events with automatic context enrichment (player, session, server).
- **Metrics collection** - `incrementCounter()`, `setGauge()`, `recordHistogram()`, `recordTiming()` functions.
- **Span tracing** - `startSpan()`, `endSpan()`, `withSpan()` for operation tracing.
- **Correlation context** - Request-scoped context propagation across async operations.
- **@broblox/input package** - Unified input abstraction for keyboard, gamepad, and touch controls.
- **Device detection** - Automatic detection of input device type with change callbacks.
- **Action system** - Register named actions with bindings, query active state.
- **Movement state** - Unified `getMovementState()` returning normalized move vectors.
- **Default bindings** - Pre-configured WASD/arrow keys, gamepad sticks, touch controls.
- **@broblox/ui package** - Reusable UI component library with theming support.
- **Theme system** - Dark/light themes with color utilities (`rgb()`, `hex()`, `darken()`, `lighten()`).
- **Creation utilities** - `createFrame()`, `createLabel()`, `createButton()`, `createScrollFrame()`.
- **Layout helpers** - `addCorner()`, `addPadding()`, `addListLayout()`, `addGridLayout()`, `addStroke()`.
- **Components** - `Dialog`, `Toast`, `ListView`, `ProgressBar`, `Spinner` higher-level components.
- **Test Park tests** - 32 unit tests for handshake, action validation, and remote contracts.
- **Root package.json** - Added `"type": "module"` for ES modules support.

### Changed

- Consolidated docs workflows into single `docs-deploy-limacity.yml` (removed redundant `docs.yml`).
- Bumped GitHub Actions to v6 (checkout, setup-node, setup-python).
- **README.md** now includes MIT license info and build workflow documentation.
- **@broblox/net** now imports types from `@broblox/shared-types` instead of duplicating them.
- **.gitignore** updated with better patterns for coverage, VSCode settings, and build outputs.
- **Package.json exports** - All packages now have proper `exports` field for module resolution.
- **Configuration docs** - Updated with constants and feature flags documentation.
- **Networking docs** - Added client utilities section and Result type references.
- **Runtime docs** - Updated Application lifecycle with new API methods.
- **Folders & packages docs** - Added all new packages with descriptions.
- **tsconfig.json files** - Roblox packages now extend their tsconfig.roblox.json for proper VS Code intellisense.

### Removed

- **Duplicate types file** (`packages/net/src/types.ts`) - types now imported from @broblox/shared-types.
