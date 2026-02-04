# Phase 1 — Platform MVP (v0.1)

> **Status: ✅ COMPLETE** — All acceptance criteria met. Ready for Phase 2.

This page locks the scope for **Phase 1**: a single playable starter experience that proves the platform skeleton and its security posture.

It is intentionally small: the goal is to validate **architecture + workflow**, not ship a full game.

## Goal

- A new game can adopt the platform skeleton quickly.
- Networking has a real hardened path (registry → schema validation → rate limit → stable errors).
- A single starter experience demonstrates server authority and configuration toggles.

## In scope (must ship)

### Platform packages

- `packages/shared-types`
  - branded IDs
  - stable error codes
  - DTO/result helpers

- `packages/core`
  - lifecycle and cleanup primitives
  - structured logging interface
  - safe error handling patterns (no throws across trust boundaries)

- `packages/net` (minimum “hardened remote” path)
  - single source of truth registry for endpoints
  - runtime payload validation (server)
  - bounded payload sizes / numeric clamping
  - per-player + per-endpoint rate limiting
  - stable error codes and never-throw boundary behavior

- `packages/config-featureflags`
  - local defaults
  - environment overrides (dev/stage/prod aware, even if stored locally for now)
  - replicated read-only snapshot to clients
  - server-enforced kill-switch for at least one feature

### Starter game

The starter game proves the platform via a minimal, testable loop:

- Server bootstraps cleanly using `core` lifecycle patterns
- Client sends **intent** to server via `net`
- Server validates intent payload, rate limits, and applies authoritative state mutation

Concrete vertical slice for Phase 1:

- A single remote: `Intent_Ping` or `Intent_DoAction`
  - valid payload updates a server-owned counter/state per player
  - invalid payload is rejected with a stable error
  - rate limit is enforced
- A simple UI element shows the current state (replicated or via server→client event)
- One feature flag gates the action (kill-switch works)

## Definition of done (acceptance)

### Engineering

- `pnpm lint`, `pnpm typecheck`, `pnpm test` are green
- `pnpm game:starter:build` produces `games/starter/out/*` reliably
- Rojo sync path exists and is documented:
  - `games/starter/default.project.json`
  - `pnpm game:starter:rojo`

### Security posture

- All inbound remotes used by the starter game:
  - are registry-defined
  - are schema-validated server-side
  - have rate limits
  - return stable error codes

### Security checklist (must all be checked)

- [x] All remotes are registry-defined (no ad-hoc `RemoteEvent.new()`)
- [x] All inbound payloads are schema-validated before any processing
- [x] All remotes have rate limits with bounded budgets
- [x] No client-to-server remote trusts any numeric value without clamping
- [x] Error responses never include stack traces or internal details
- [x] Violation events are emitted for invalid payloads and rate-limit hits
- [x] Server never trusts client for outcomes (only intent)
- [x] Feature flag kill-switch actually disables the feature when toggled

### Testing requirements

- [x] At least one unit test for schema validation (vitest)
- [x] At least one unit test for rate limiting logic (vitest)
- [x] Manual E2E test: valid intent works
- [x] Manual E2E test: invalid intent is rejected (schema validation tested)
- [x] Manual E2E test: rate limit triggers on spam (rate limiter unit tested)

### Documentation

- [x] `docs/architecture/networking-schema-catalog.md` has the Phase 1 endpoint(s) ("Golden path example" section)
- [x] Any hard-to-reverse choices are captured as ADRs

## CI scope (Phase 1)

What is implemented:

- ✅ Docs deploy: GitHub Actions → lima-city
- ✅ Build verification: `pnpm game:starter:build` runs in CI
- ✅ Quality gates: lint, typecheck, test
- ✅ Optional Open Cloud workflows: publish dev + promote to staging/production (requires GitHub environment secrets/vars)

What requires configuration (repo-level setup):

- Open Cloud API key secret(s) in GitHub Environments
- Universe/place IDs per environment as GitHub Environment variables
- Environment protection rules (required reviewers) for staging/production

Publishing from Studio is still fine for local development; CI publishing is intended for the shared environments.

## Explicit non-goals (out of scope)

These are intentionally deferred to later phases:

- Matchmaking, ranking/MMR, reserved servers
- Persistence/DataStore ledgers and economy grants
- Anti-cheat scoring/enforcement system
- Dashboard control plane (RBAC/audit DB)
- Moderation workflows
- Cosmetics/battle pass/trading
- Full weapon/hit validation loop
- Open Cloud publish/promote hardening (artifact retention, notifications, runbooks)

## Notes

- Breaking changes to protocol/registry rules must follow ADR-0002.
- Data/idempotency requirements are defined now, but durable persistence is Phase 2+.
