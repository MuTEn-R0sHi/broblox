# Phase 1 — Platform MVP (v0.1)

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

### Documentation

- `docs/architecture/networking-schema-catalog.md` has the Phase 1 endpoint(s)
- Any hard-to-reverse choices are captured as ADRs

## Explicit non-goals (out of scope)

These are intentionally deferred to later phases:

- Matchmaking, ranking/MMR, reserved servers
- Persistence/DataStore ledgers and economy grants
- Anti-cheat scoring/enforcement system
- Dashboard control plane (RBAC/audit DB)
- Moderation workflows
- Cosmetics/battle pass/trading
- Full weapon/hit validation loop
- Open Cloud publish/promote pipeline automation

## Notes

- Breaking changes to protocol/registry rules must follow ADR-0002.
- Data/idempotency requirements are defined now, but durable persistence is Phase 2+.
