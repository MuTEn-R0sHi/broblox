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

### Phase 4 — Production (operational excellence)

**Status:** 🔜 Next

**Goal:** safe continuous delivery and sustainable operations.

Deliverables:

- `packages/analytics` v1: player behavior events, funnels, retention
- `packages/notifications` v1: in-game toasts, announcements, news
- Open Cloud publish/promote pipeline hardening + ops maturity
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- Performance budgets enforced in CI where possible (lint/test + scripted checks)
- Rollback procedure tested + incident runbooks (matchmaking, exploit waves)
- Regular ADR + security review cadence

## Milestone mapping (packages)

### Phase 1–3 (Complete ✅)

- `core`, `shared-types`, `net`, `security`, `config-featureflags`
- `input`, `ui`, `data`, `observability`
- `combat`, `matchmaking`
- `moderation`, `movement`
- Games: `starter`, `obby`
- Dashboard: RBAC, audit, ban workflow, flag propagation

### Phase 4 (Next)

- `analytics`: player behavior events, funnels
- `notifications`: in-game toasts, announcements

### Phase 5a — Foundation

- `inventory`: base item/slot system (prerequisite for collections)
- `progression`: XP, levels, prestige/rebirth
- `rewards`: daily login, achievements

### Phase 5b — Collection

- `pets`, `gacha`, `cosmetics`, battle pass

### Phase 5c — Support

- `localization`, `audio`, `tutorial`

### Phase 6+

- `trading`, `guilds`, `economy`, `social`

> **Full roadmap:** See [Future Phases (3–7)](future-phases.md) for detailed planning.
