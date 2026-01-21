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

### Phase 1 — Platform MVP (single game proves the platform)

**Goal:** one playable experience built from the platform skeleton.

Scope is locked in: `docs/roadmap/phase-1-platform-mvp.md`.

Deliverables:

- `packages/core`: lifecycle + DI + logging + cleanup
- `packages/shared-types`: ids + error codes + DTOs
- `packages/net`: remote registry + validation + rate limits + protocol handshake
- `packages/config-featureflags`: local defaults + replicated snapshot
- Minimal “starter game” consuming those packages

Security baseline:

- All inbound remotes are schema validated
- All inbound remotes are rate limited
- Server decides outcomes for any state mutation

### Phase 2 — PvP Alpha (competitive loop + ops visibility)

**Goal:** competitive-capable match flow and anti-abuse instrumentation.

Deliverables:

- `packages/matchmaking` v1: queue + reserved server joins
- `packages/movement` v1: motor abstraction + Humanoid motor
- `packages/security` v1: violation signals + scoring + enforcement hooks
- `packages/analytics` v1: event batching + match summary
- Dashboard v1 (read-only): match list, security signals, publish history

PvP requirements:

- Server authoritative hit validation (raycast/projectile sim)
- Deterministic cooldown/ammo logic server-side
- Protocol versioning rules defined and enforced

### Phase 3 — Beta (multi-game reuse + moderation)

**Goal:** second game adopts platform with minimal extra glue.

Deliverables:

- Second game template created from the platform
- `packages/moderation` v1: bans/mutes + evidence model
- Dashboard v2 (control plane): RBAC + audit logs + ban workflow
- Feature flags: staged rollouts + kill-switch enforcement

Reliability requirements:

- Rollback procedure tested
- Incident runbooks exist for matchmaking and exploit waves

### Phase 4 — Production (operational excellence)

**Goal:** safe continuous delivery and sustainable operations.

Deliverables:

- Open Cloud publish/promote pipeline for Roblox environments
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- Performance budgets enforced in CI where possible (lint/test + scripted checks)
- Regular ADR + security review cadence

## Milestone mapping (packages)

- Security-critical first: `net`, `security`, `shared-types`
- Live-ops next: `config-featureflags`, `analytics`, `moderation`
- Gameplay modules later: progression, cosmetics, battle pass, trading
