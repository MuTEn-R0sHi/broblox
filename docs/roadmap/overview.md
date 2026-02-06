# Roadmap: Overview

This roadmap turns the architecture plan into staged deliverables.

## Environments

We will run three isolated environments:

- **dev**: continuous publishing from `main`
- **stage**: QA/canary + manual promotion
- **prod**: tagged releases only

## Phases

### Phase 0 — Docs + conventions (now)

**Goal:** the plan is written down and enforceable.

Deliverables:

- MkDocs site published automatically
- Architecture pages cover trust boundaries, networking, data, runtime
- ADR process exists (every big decision becomes an ADR)

Definition of done:

- Docs build and deploy from CI
- Navigation is stable

### Phase 0.5 — Skeleton verification spike (recommended before Phase 1)

**Goal:** validate tooling and architecture with minimal code.

This is a **2-day spike** to verify the build pipeline works end-to-end before investing in Phase 1 implementation.

Deliverables:

- roblox-ts compiles the package structure correctly
- Rojo syncs the compiled output to Roblox Studio
- A single remote works end-to-end (client → server → response)
- Rate limiting and validation middleware are wired up (even if minimal)

Definition of done:

- `pnpm game:starter:build` succeeds
- Rojo sync shows client/server/shared in correct locations
- One test remote can be called from client and receives validated response
- Any tooling issues are documented and resolved

Why this matters:

- Catches roblox-ts/Rojo configuration issues early
- Validates that the package structure compiles correctly
- Confirms the networking middleware pattern works in practice
- Reduces risk of discovering fundamental issues deep into Phase 1

### Phase 1 — Platform MVP (single game proves the platform) ✅

**Status: COMPLETE**

**Goal:** one playable experience built from the platform skeleton.

Scope is locked in: `docs/roadmap/phase-1-platform-mvp.md`.

Deliverables:

- `packages/core`: lifecycle + DI + logging + cleanup ✅
- `packages/shared-types`: ids + error codes + DTOs ✅
- `packages/net`: remote registry + validation + rate limits + protocol handshake ✅
- `packages/config-featureflags`: local defaults + replicated snapshot ✅
- Minimal "starter game" consuming those packages ✅

Security baseline:

- All inbound remotes are schema validated ✅
- All inbound remotes are rate limited ✅
- Server decides outcomes for any state mutation ✅

Test coverage: 620+ tests across all packages, games, and dashboard.

### Phase 2 — PvP Alpha (competitive loop + ops visibility) ✅

**Status: COMPLETE**

**Goal:** competitive-capable match flow and anti-abuse instrumentation.

Scope documented in: `docs/roadmap/phase-2-pvp-alpha.md`.

Deliverables:

- `packages/combat`: weapon system + hit validation + damage calculation ✅
- `packages/matchmaking`: match lifecycle + state + events ✅
- `packages/matchmaking`: server allocation + health monitoring ✅
- Dashboard match history: list + detail + filtering ✅

PvP requirements:

- Server authoritative hit validation (raycast verification) ✅
- Deterministic cooldown/ammo logic server-side ✅
- Match state transitions server-controlled ✅

### Phase 3 — Beta (multi-game reuse + moderation) ✅

**Status: COMPLETE**

**Goal:** second game adopts platform with minimal extra glue.

Deliverables:

- Second game template created from the platform ✅ (obby game)
- `packages/moderation` v1: bans/mutes + evidence model + dashboard bridge ✅
- `packages/movement` v1: server-authoritative movement + observability + feature flag kill-switch ✅
- Dashboard v2 (control plane): RBAC + audit logs + ban workflow ✅
- Feature flags v2: segments, scheduling, rollout history, kill-switch ✅
- Both games (starter + obby) integrated with moderation + movement ✅

Test coverage: 620 tests across 24 test suites.

### Phase 4 — Production (operational excellence) ✅

**Status: COMPLETE**

**Goal:** safe continuous delivery and sustainable operations.

Deliverables:

- `packages/codes` v1: redeemable promo codes + dashboard management ✅
- `packages/leaderboards` v1: cross-game leaderboards (daily/weekly/seasonal/all-time) ✅
- `packages/analytics` v1: player behavior events, funnels, retention ✅
- `packages/notifications` v1: in-game toasts, announcements, news ✅
- Game integrations (both starter + obby) ✅
- Open Cloud publish/promote pipeline hardening + ops maturity
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- Performance budgets enforced in CI where possible (lint/test + scripted checks)
- Rollback procedure tested + incident runbooks (matchmaking, exploit waves)
- Roblox Moments integration (auto-detect highlights, viral sharing)
- Regular ADR + security review cadence

Test coverage: 764 tests across 32 test suites.

### Phase 5a — Foundation ✅

**Status: COMPLETE**

**Goal:** core progression & engagement systems that underpin collections, economy, and retention.

Deliverables:

- `packages/inventory` v1: item registry, per-player inventory, stacking, transfers, slot management, metadata, sorting, DataStore persistence ✅
- `packages/progression` v1: XP curves (linear/quadratic/exponential/custom), auto level-up, prestige/rebirth, XP bonus multipliers, DataStore persistence ✅
- `packages/quests` v1: quest registry with schedule/tier/tag/level filtering, objective tracking, auto-completion, prerequisites, DataStore persistence ✅
- `packages/rewards` v1: daily login rewards with streaks/grace periods/cycles, achievement store with progress tracking, DataStore persistence ✅
- Game integrations: both starter and obby games with themed items, quests, achievements ✅

Test coverage: 976 tests across 22 test suites.

## Milestone mapping (packages)

### Phase 1–3 (Complete ✅)

- `core`, `shared-types`, `net`, `security`, `config-featureflags`
- `input`, `ui`, `data`, `observability`
- `combat`, `matchmaking`
- `moderation`, `movement`
- Games: `starter`, `obby`
- Dashboard: RBAC, audit, ban workflow, flag propagation

### Phase 4 (Complete ✅)

- `codes`: redeemable promo codes ✅
- `leaderboards`: cross-game leaderboard infrastructure ✅
- `analytics`: player behavior events, funnels ✅
- `notifications`: in-game toasts, announcements ✅

### Phase 5a — Foundation (Complete ✅)

- `inventory`: item registry + per-player inventory with stacking, transfers, slots ✅
- `progression`: XP curves, auto level-up, prestige/rebirth ✅
- `quests`: quest registry, objective tracking, daily/weekly schedules ✅
- `rewards`: daily login rewards, achievements with progress tracking ✅
- Game integrations: starter (combat-themed) + obby (stage-themed) ✅

### Phase 5b — Collection

- `pets`, `gacha`, `cosmetics`, battle pass
- `bro-companion`: LittleBro cross-game mascot

### Phase 5c — Support

- `localization`, `audio`, `tutorial`
- `world-systems`: day/night, weather, seasons, biomes

### Phase 6 — Economy & Social

- `trading`, `guilds`, `economy`, `social`

### Phase 7+ — Games & Hub

- Genre templates: PvP Arena, BroStars, BroBall, BroCade, Race Mania, ...
- BroBlox Hub: central hub game with gravity worlds, game portals, LittleBro home

> **Full roadmap:** See [Future Phases (4–7)](future-phases.md) for detailed planning.
