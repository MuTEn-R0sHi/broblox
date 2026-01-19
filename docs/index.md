# Roblox Studio Platform (Docs)

This repository will become a reusable, multi-game **Roblox-TS** platform optimized for:

- Building multiple games from shared packages (framework, networking, security, UI, live ops)
- Competitive-capable PvP (server-authoritative outcomes, strict remote validation, anti-abuse)
- CI-driven releases (Open Cloud publishing + environment promotion)
- A web dashboard for moderation, config/feature flags, and operational control

## Non-negotiable principles

1. **Clients are untrusted.** The server decides outcomes (damage, cooldowns, inventory, MMR, rewards).
2. **Networking is an API.** Every remote is versioned, schema-validated, rate-limited, and monitored.
3. **Everything is reusable.** Game-specific code composes shared packages; shared packages never depend on games.
4. **Operational excellence is built-in.** Audit logs, kill-switches, staged rollouts, and runbooks exist before launch.

## Where to start

- Getting started: [Getting started → Overview](getting-started/overview.md)
- Architecture overview: [Architecture → Platform](architecture/platform.md)
- The security posture: [Architecture → Networking](architecture/networking.md) and [Architecture → State & data](architecture/state-and-data.md)
- Milestones: [Roadmap → Overview](roadmap/overview.md)
- Decision log: [Architecture → Decisions (ADRs)](architecture/decisions/index.md)

## Target outcomes (v1)

- A stable set of platform packages that any new game can adopt in <1 day
- A CI pipeline that publishes dev builds automatically and promotes to prod with approvals
- A dashboard that can:
  - change feature flags and configs with approvals
  - manage bans/mutes with evidence and audit logs
  - view match history + anti-abuse signals
