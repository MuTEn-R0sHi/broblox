# Future Phases (3–7)

This document outlines planned phases beyond the current roadmap, with feature candidates drawn from platform research and industry trends.

> **Source:** Feature research in [IDEAS.md](../../IDEAS.md) (brainstorm reference)

---

## Phase 3 — Beta / Multi-game

> **Goal:** Second game adopts platform; moderation + ops tooling.

**Status:** 🔜 Next

### Deliverables (from overview.md)

- Second game template created from the platform
- `packages/moderation` v1: bans/mutes + evidence model
- `packages/movement` v1: server-authoritative movement + lag compensation
- Dashboard v2 (control plane): RBAC + audit logs + ban workflow
- Feature flags: staged rollouts + kill-switch enforcement

### Feature Candidates

| Feature                 | Priority    | Effort | Notes                                 |
| ----------------------- | ----------- | ------ | ------------------------------------- |
| Moderation system       | 🔴 Critical | Medium | Bans, mutes, evidence model           |
| Movement package        | 🔴 Critical | High   | Server-auth movement, anti-speed-hack |
| RBAC + Audit logs       | 🔴 Critical | Medium | Dashboard v2 requirement              |
| Second game template    | 🔴 Critical | High   | Proves multi-game reuse               |
| Feature flag rollouts   | 🟡 High     | Low    | Kill-switch enforcement               |
| Rebirth/Prestige system | 🟡 High     | Medium | Core retention mechanic               |

### Reliability Requirements

- Rollback procedure tested
- Incident runbooks exist for matchmaking and exploit waves

---

## Phase 4 — Production (Ops Excellence)

> **Goal:** Safe continuous delivery and sustainable operations.

**Status:** 📅 Planned

### Deliverables (from overview.md)

- Open Cloud publish/promote pipeline for Roblox environments
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- `packages/analytics` v1: player behavior events, funnels, retention
- `packages/notifications` v1: in-game toasts, announcements, news
- Performance budgets enforced in CI where possible
- Regular ADR + security review cadence

### Feature Candidates

| Feature                 | Priority    | Effort | Notes                            |
| ----------------------- | ----------- | ------ | -------------------------------- |
| Open Cloud publish      | 🔴 Critical | High   | Roblox environment promotion     |
| Analytics package       | 🔴 Critical | Medium | Player behavior, funnels, events |
| Notifications package   | 🟡 High     | Medium | Toasts, announcements, news      |
| Scheduled events system | 🟡 High     | Medium | Events section implementation    |
| Performance monitoring  | 🟡 High     | Medium | Budgets + alerts                 |
| Daily login rewards     | 🟢 Medium   | Low    | Retention hook                   |
| Quest/mission system    | 🟢 Medium   | Medium | Engagement driver                |

---

## Phase 5 — Gameplay Modules (Progression)

> **Goal:** Reusable gameplay systems for any game.

**Status:** 💡 Planned

### Scope

Build platform-level packages that any BroBlox game can consume:

- Base inventory system (prerequisite for all collection features)
- Progression systems (levels, XP, prestige)
- Collection systems (pets, items, cosmetics)
- Reward systems (battle pass, daily rewards)
- Support systems (localization, audio, tutorial)

### Feature Candidates

| Feature             | Priority    | Effort | Notes                               |
| ------------------- | ----------- | ------ | ----------------------------------- |
| Inventory package   | 🔴 Critical | High   | Base for pets, cosmetics, equipment |
| Pet system          | 🔴 Critical | High   | Proven monetization                 |
| Egg/Gacha system    | 🔴 Critical | High   | Drives retention loops              |
| Localization (i18n) | 🟡 High     | Medium | Multi-language support              |
| Battle pass         | 🟡 High     | Medium | See `docs/modules/battle-pass.md`   |
| Cosmetics system    | 🟡 High     | Medium | See `docs/modules/cosmetics.md`     |
| Audio package       | 🟡 High     | Medium | SFX, music, spatial audio           |
| Tutorial/FTUE       | 🟡 High     | Medium | Guided onboarding framework         |
| Daily rewards       | 🟢 Medium   | Low    | See `docs/modules/daily-rewards.md` |
| Crafting system     | 🟢 Medium   | Medium | Item depth                          |
| Skill trees         | 🟢 Medium   | High   | Class customization                 |

### Package Structure (proposed)

```
packages/
  inventory/       # Base item/slot system (prerequisite)
  progression/     # XP, levels, prestige/rebirth
  pets/            # Pet system, evolution, equipment
  gacha/           # Eggs, hatching, pity system
  rewards/         # Daily login, battle pass, achievements
  localization/    # i18n, string tables, language switching
  audio/           # SFX manager, music system, spatial audio
  tutorial/        # FTUE framework, step-by-step guides
```

---

## Phase 6 — Economy & Social

> **Goal:** Cross-game economy, guilds, social features.

**Status:** 💡 Planned

### Scope

- Player-to-player trading with safeguards
- Guild/Clan infrastructure
- Global BroCoins currency across games
- Social features (leaderboards, friend rewards)

### Feature Candidates

| Feature               | Priority    | Effort | Notes                         |
| --------------------- | ----------- | ------ | ----------------------------- |
| Trading system        | 🔴 Critical | High   | See `docs/modules/trading.md` |
| Guild/Clan system     | 🔴 Critical | High   | Social stickiness             |
| Global BroCoins       | 🟡 High     | High   | Cross-game currency           |
| Auction house         | 🟢 Medium   | High   | Optional, exploit-prone       |
| Friend invite rewards | 🟢 Medium   | Low    | Social hooks                  |
| Leaderboards          | 🟢 Medium   | Low    | Competition driver            |

### Package Structure (proposed)

```
packages/
  trading/         # P2P trading, auction house
  guilds/          # Clans, guild wars, shared progress
  economy/         # Global currency, sinks/faucets
  social/          # Leaderboards, friends, referrals
```

---

## Phase 7 — Genre Templates

> **Goal:** Pre-built game templates for common Roblox genres.

**Status:** 💡 Planned

### Scope

Provide starter templates that demonstrate platform capabilities for popular Roblox game types:

### Template Candidates

| Template          | Priority    | Effort | Based On                            |
| ----------------- | ----------- | ------ | ----------------------------------- |
| PvP Arena         | 🔴 Critical | Low    | Phase 2 combat already done         |
| Obby Generator    | 🟡 High     | Medium | Procedural obstacle courses         |
| Fishing Simulator | 🟡 High     | High   | Trending genre (Fisch-style)        |
| Tower Defense     | 🟢 Medium   | High   | Wave-based gameplay                 |
| Horror Escape     | 🟢 Medium   | High   | Doors/Piggy style procedural        |
| Fashion/Social    | 🟢 Medium   | Medium | Dress To Impress style              |
| Tycoon            | 🟢 Medium   | High   | Restaurant/business sim             |
| Anime Combat      | 🔵 Future   | High   | Blox Fruits/JJK style power systems |

### Template Structure (proposed)

```
games/
  starter/           # Current: basic platform demo
  pvp-arena/         # Ranked PvP with matchmaking
  obby/              # Procedural obstacle courses
  fishing-sim/       # Collection + exploration
  tower-defense/     # Wave-based co-op
  horror-escape/     # Procedural horror
  fashion/           # Social fashion game
  tycoon/            # Business simulation
```

---

## Quick Reference: Feature → Phase Mapping

| Feature                           | Phase | Status     |
| --------------------------------- | ----- | ---------- |
| Core packages (net, config, etc.) | 1     | ✅ Done    |
| Combat + hit validation           | 2     | ✅ Done    |
| Matchmaking + match lifecycle     | 2     | ✅ Done    |
| Dashboard match history           | 2     | ✅ Done    |
| Moderation system                 | 3     | 🔜 Next    |
| Movement package                  | 3     | 🔜 Next    |
| RBAC + audit logs                 | 3     | 🔜 Next    |
| Rebirth/prestige                  | 3     | 🔜 Next    |
| Open Cloud publish                | 4     | 📅 Planned |
| Analytics package                 | 4     | 📅 Planned |
| Notifications package             | 4     | 📅 Planned |
| Scheduled events                  | 4     | 📅 Planned |
| Inventory package                 | 5     | 💡 Planned |
| Pet system                        | 5     | 💡 Planned |
| Egg/gacha system                  | 5     | 💡 Planned |
| Battle pass                       | 5     | 💡 Planned |
| Localization (i18n)               | 5     | 💡 Planned |
| Audio package                     | 5     | 💡 Planned |
| Tutorial/FTUE                     | 5     | 💡 Planned |
| Trading                           | 6     | 💡 Planned |
| Guilds                            | 6     | 💡 Planned |
| Global BroCoins                   | 6     | 💡 Planned |
| Genre templates                   | 7     | 💡 Planned |

---

## Timeline Estimates

| Phase | Estimated Duration | Dependencies          |
| ----- | ------------------ | --------------------- |
| 3     | 4–6 weeks          | Phase 2 ✅            |
| 4     | 3–4 weeks          | Phase 3               |
| 5     | 6–8 weeks          | Phase 4               |
| 6     | 6–8 weeks          | Phase 5 (partial)     |
| 7     | Ongoing            | Phases 5–6 (parallel) |

---

_See [IDEAS.md](../../IDEAS.md) for detailed feature research, mechanic patterns, and genre analysis._
