# Future Phases (4–7)

This document outlines planned phases beyond the completed roadmap, with feature candidates drawn from platform research and industry trends.

> **Source:** Feature research in [Ideas (brainstorm reference)](ideas.md)

---

## Phase 3 — Beta / Multi-game ✅

> **Goal:** Second game adopts platform; moderation + ops tooling.

**Status:** ✅ Complete

### Shipped

- Second game template (obby) ✅
- `packages/moderation` v1: bans/mutes + evidence model + dashboard bridge ✅
- `packages/movement` v1: server-authoritative movement + observability + kill-switch ✅
- Dashboard v2: RBAC + audit logs + ban workflow + Open Cloud propagation ✅
- Feature flags v2: segments, scheduling, rollout history, kill-switch ✅
- 620 tests across 24 test suites ✅

---

## Phase 4 — Production (Ops Excellence)

> **Goal:** Safe continuous delivery and sustainable operations.

**Status:** � Next

### Deliverables

- `packages/analytics` v1: player behavior events, funnels, retention
- `packages/notifications` v1: in-game toasts, announcements, news
- Open Cloud publish/promote pipeline hardening + operational excellence
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- Performance budgets enforced in CI where possible
- Rollback procedure tested + incident runbooks
- Regular ADR + security review cadence

### Feature Candidates

| Feature                 | Priority    | Effort | Notes                                   |
| ----------------------- | ----------- | ------ | --------------------------------------- |
| Analytics package       | 🔴 Critical | Medium | Player behavior, funnels, events        |
| Notifications package   | 🔴 Critical | Medium | Toasts, announcements, news             |
| Open Cloud hardening    | 🔴 Critical | High   | Baseline implemented; hardening remains |
| Rollback + runbooks     | 🔴 Critical | Medium | Moved from Phase 3 reliability reqs     |
| Scheduled events system | 🟡 High     | Medium | Events section implementation           |
| Performance monitoring  | 🟡 High     | Medium | Budgets + alerts                        |
| Quest/mission system    | 🟢 Medium   | Medium | Engagement driver                       |

---

## Phase 5 — Gameplay Modules (Progression)

> **Goal:** Reusable gameplay systems for any game.

**Status:** 💡 Planned

### Phase 5a — Foundation

Prerequisites for all collection/reward features. Build these first.

| Feature             | Priority    | Effort | Notes                               |
| ------------------- | ----------- | ------ | ----------------------------------- |
| Inventory package   | 🔴 Critical | High   | Base for pets, cosmetics, equipment |
| Progression package | 🔴 Critical | Medium | XP, levels, prestige/rebirth        |
| Daily rewards       | 🟡 High     | Low    | See `docs/modules/daily-rewards.md` |

```
packages/
  inventory/       # Base item/slot system (prerequisite)
  progression/     # XP, levels, prestige/rebirth
  rewards/         # Daily login, achievements
```

### Phase 5b — Collection & Monetization

Revenue-driving mechanics. Depend on inventory.

| Feature          | Priority    | Effort | Notes                             |
| ---------------- | ----------- | ------ | --------------------------------- |
| Pet system       | 🔴 Critical | High   | Proven monetization               |
| Egg/Gacha system | 🔴 Critical | High   | Drives retention loops            |
| Bro Companion    | 🔴 Critical | High   | Cross-game mascot, brand identity |
| Battle pass      | 🟡 High     | Medium | See `docs/modules/battle-pass.md` |
| Cosmetics system | 🟡 High     | Medium | See `docs/modules/cosmetics.md`   |
| Crafting system  | 🟢 Medium   | Medium | Item depth                        |
| Skill trees      | 🟢 Medium   | High   | Class customization               |

```
packages/
  bro-companion/   # Cross-game mascot system (The Bro)
  pets/            # Pet system, evolution, equipment
  gacha/           # Eggs, hatching, pity system
  cosmetics/       # Skins, outfits, accessories
```

### Phase 5c — Support Systems

Independent packages that can be built in parallel.

| Feature             | Priority | Effort | Notes                       |
| ------------------- | -------- | ------ | --------------------------- |
| Localization (i18n) | 🟡 High  | Medium | Multi-language support      |
| Audio package       | 🟡 High  | Medium | SFX, music, spatial audio   |
| Tutorial/FTUE       | 🟡 High  | Medium | Guided onboarding framework |

```
packages/
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
| BroStars          | 🔴 Critical | High   | Pet band game, tests pets + audio   |
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
  brostars/          # Pet band music game (showcase for pets + audio)
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
| Moderation system                 | 3     | ✅ Done    |
| Movement package                  | 3     | ✅ Done    |
| RBAC + audit logs                 | 3     | ✅ Done    |
| Feature flag v2 (segments, etc.)  | 3     | ✅ Done    |
| Second game template (obby)       | 3     | ✅ Done    |
| Dashboard moderation bridge       | 3     | ✅ Done    |
| Analytics package                 | 4     | 🔜 Next    |
| Notifications package             | 4     | 🔜 Next    |
| Open Cloud hardening              | 4     | 🔜 Next    |
| Rollback + runbooks               | 4     | 🔜 Next    |
| Scheduled events                  | 4     | 🔜 Next    |
| Inventory package                 | 5a    | 💡 Planned |
| Progression (XP, prestige)        | 5a    | 💡 Planned |
| Daily rewards                     | 5a    | 💡 Planned |
| Pet system                        | 5b    | 💡 Planned |
| Egg/gacha system                  | 5b    | 💡 Planned |
| Bro Companion (The Bro)           | 5b    | 💡 Planned |
| Battle pass                       | 5b    | 💡 Planned |
| Cosmetics system                  | 5b    | 💡 Planned |
| Localization (i18n)               | 5c    | 💡 Planned |
| Audio package                     | 5c    | 💡 Planned |
| Tutorial/FTUE                     | 5c    | 💡 Planned |
| Trading                           | 6     | 💡 Planned |
| Guilds                            | 6     | 💡 Planned |
| Global BroCoins                   | 6     | 💡 Planned |
| Genre templates                   | 7     | 💡 Planned |
| BroStars game                     | 7     | 💡 Planned |

---

## Timeline Estimates

| Phase | Estimated Duration | Dependencies          |
| ----- | ------------------ | --------------------- |
| 4     | 3–4 weeks          | Phase 3 ✅            |
| 5a    | 3–4 weeks          | Phase 4               |
| 5b    | 4–6 weeks          | Phase 5a              |
| 5c    | 3–4 weeks          | Phase 4 (parallel)    |
| 6     | 6–8 weeks          | Phase 5a (partial)    |
| 7     | Ongoing            | Phases 5–6 (parallel) |

---

_See [Ideas (brainstorm reference)](ideas.md) for detailed feature research, mechanic patterns, and genre analysis._
