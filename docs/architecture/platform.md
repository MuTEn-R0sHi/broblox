# Architecture: Platform

## What "platform" means here

A reusable set of packages and conventions that every game uses.

### Core Packages (Implemented ✅)

- `core`: lifecycle, DI/container, logging, utilities, collection helpers
- `shared-types`: ids, enums, DTOs, error codes
- `constants`: numeric constants, validation helpers
- `net`: remote registry, validation, rate limiting, versioning
- `security`: authority rules + anti-abuse instrumentation
- `config-featureflags`: configs, rollouts, kill-switches
- `input`: device-agnostic input handling, rebindable actions
- `ui`: consistent UI components and device-aware layout
- `data`: persistence layer, session locking, DataStore patterns
- `observability`: telemetry, metrics, spans, correlation context
- `combat`: weapon system, hit validation, damage calculation (Phase 2)
- `matchmaking`: queue management, match lifecycle, server allocation (Phase 2)
- `moderation`: bans/mutes, evidence model, enforcement hooks (Phase 3)
- `movement`: server-authoritative movement validation + anti-cheat (Phase 3)

### Planned Packages (Roadmap)

- `analytics`: player behavior events, funnels, retention tracking (Phase 4)
- `notifications`: in-game toasts, announcements, news panel (Phase 4)
- `inventory`: base item/slot system for pets, cosmetics, equipment (Phase 5)
- `bro-companion`: cross-game mascot system — The Bro follows players everywhere (Phase 5)
- `localization`: i18n support, multi-language strings (Phase 5)
- `audio`: SFX management, music system, spatial audio (Phase 5)
- `tutorial`: FTUE framework, guided onboarding (Phase 5)

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
