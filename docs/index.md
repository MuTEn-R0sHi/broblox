# BroBlox Documentation

This repository is a reusable, multi-game **Roblox-TS** platform optimized for:

- Building multiple games from shared packages (framework, networking, security, UI, live ops)
- Competitive-capable PvP (server-authoritative outcomes, strict remote validation, anti-abuse)
- CI-driven releases (Open Cloud publishing + environment promotion)
- A **multi-game web dashboard** for game management, moderation, config/feature flags, and operational control across all registered games
- A **public-facing website** ([broblox-games.com](https://broblox-games.com)) — game portal, rankings, news, and player wikis

## Non-negotiable principles

1. **Clients are untrusted.** The server decides outcomes (damage, cooldowns, inventory, MMR, rewards).
2. **Networking is an API.** Every remote is versioned, schema-validated, rate-limited, and monitored.
3. **Everything is reusable.** Game-specific code composes shared packages; shared packages never depend on games.
4. **Operational excellence is built-in.** Audit logs, kill-switches, staged rollouts, and runbooks exist before launch.
5. **Live data is real.** Leaderboards, player counts, and news shown on the website come from authoritative sources — never hardcoded placeholders in production.

## Where to start

- Getting started: [Getting started → Overview](getting-started/overview.md)
- Architecture overview: [Architecture → Platform](architecture/platform.md)
- The security posture: [Architecture → Networking](architecture/networking.md) and [Architecture → State & data](architecture/state-and-data.md)
- Milestones: [Roadmap → Overview](roadmap/overview.md)
- Decision log: [Architecture → Decisions (ADRs)](architecture/decisions/index.md)

## Target outcomes (v1)

- A stable set of platform packages that any new game can adopt in <1 day
- A CI pipeline that publishes dev builds automatically and promotes to prod with approvals
- A **multi-game control plane dashboard** that can:
  - register and manage multiple Roblox experiences (per-env universe IDs + place IDs)
  - change feature flags globally or per-game, with environment scoping and approvals
  - manage bans/mutes with evidence and audit logs, scoped per game
  - view match history + anti-abuse signals across all games
- A **public website** at [broblox-games.com](https://broblox-games.com) that:
  - lists all BroBlox games with deep links into Roblox
  - shows live player counts and real leaderboard data (not placeholders)
  - surfaces news and events managed from the dashboard
  - provides per-game player wikis
