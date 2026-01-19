# Architecture: Platform

## What "platform" means here

A reusable set of packages and conventions that every game uses:

- `core`: lifecycle, DI/container, logging, utilities
- `shared-types`: ids, enums, DTOs, error codes
- `net`: remote registry, validation, rate limiting, versioning
- `security`: authority rules + anti-abuse instrumentation
- `movement`: motor-agnostic movement abstraction (Humanoid + competitive motor)
- `ui-kit`: consistent UI components and device-aware layout
- `config-featureflags`: configs, rollouts, kill-switches
- `analytics`: event taxonomy + batching
- `moderation`: reports, bans/mutes, enforcement hooks

## Trust boundaries

- Client: input + visuals + prediction only
- Server: authoritative state + decisions
- Dashboard: privileged ops actions (RBAC + audit logs)

## Project-level invariants

- Game code may depend on platform packages.
- Platform packages must not import game-specific code.
- Any code that crosses a trust boundary must have:
  - schema validation
  - rate limits
  - structured error codes

## Competitive PvP posture

- Server determines hits/damage and validates movement constraints.
- Client may propose intent (aim, fire, ability activation), never outcomes.
