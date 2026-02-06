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
- `packages/leaderboards` v1: cross-game leaderboards (daily/weekly/seasonal/all-time)
- `packages/codes` v1: redeemable promo codes with dashboard management
- Open Cloud publish/promote pipeline hardening + operational excellence
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- Performance budgets enforced in CI where possible
- Rollback procedure tested + incident runbooks
- Regular ADR + security review cadence

### Feature Candidates

| Feature                 | Priority    | Effort | Notes                                    |
| ----------------------- | ----------- | ------ | ---------------------------------------- |
| Analytics package       | 🔴 Critical | Medium | Player behavior, funnels, events         |
| Notifications package   | 🔴 Critical | Medium | Toasts, announcements, news              |
| Leaderboards package    | 🔴 Critical | Medium | Cross-game, anti-cheat validated         |
| Codes system            | 🔴 Critical | Low    | Promo codes, dashboard UI, expiry/limits |
| Open Cloud hardening    | 🔴 Critical | High   | Baseline implemented; hardening remains  |
| Rollback + runbooks     | 🔴 Critical | Medium | Moved from Phase 3 reliability reqs      |
| Roblox Moments          | 🟡 High     | Low    | Auto-detect highlights, viral sharing    |
| Scheduled events system | 🟡 High     | Medium | Events section implementation            |
| Performance monitoring  | 🟡 High     | Medium | Budgets + alerts                         |

---

## Phase 5 — Gameplay Modules (Progression)

> **Goal:** Reusable gameplay systems for any game.

**Status:** 💡 Planned

### Phase 5a — Foundation

Prerequisites for all collection/reward features. Build these first.

| Feature              | Priority    | Effort | Notes                               |
| -------------------- | ----------- | ------ | ----------------------------------- |
| Inventory package    | 🔴 Critical | High   | Base for pets, cosmetics, equipment |
| Progression package  | 🔴 Critical | Medium | XP, levels, prestige/rebirth        |
| Quest/mission system | 🟡 High     | Medium | Daily/weekly/seasonal quests        |
| Daily rewards        | 🟡 High     | Low    | See `docs/modules/daily-rewards.md` |

```
packages/
  inventory/       # Base item/slot system (prerequisite)
  progression/     # XP, levels, prestige/rebirth
  quests/          # Quest/mission framework
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

| Feature             | Priority | Effort | Notes                               |
| ------------------- | -------- | ------ | ----------------------------------- |
| Localization (i18n) | 🟡 High  | Medium | Multi-language support              |
| Audio package       | 🟡 High  | Medium | SFX, music, spatial audio           |
| Tutorial/FTUE       | 🟡 High  | Medium | Guided onboarding framework         |
| World systems       | 🟡 High  | Medium | Day/night, weather, seasons, biomes |

```
packages/
  localization/    # i18n, string tables, language switching
  audio/           # SFX manager, music system, spatial audio
  tutorial/        # FTUE framework, step-by-step guides
  world-systems/   # Day/night cycle, weather, seasons, biomes
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

### Package Structure (proposed)

```
packages/
  trading/         # P2P trading, auction house
  guilds/          # Clans, guild wars, shared progress
  economy/         # Global currency, sinks/faucets
  social/          # Friends, referrals
```

---

## Phase 7 — Genre Templates & Games

> **Goal:** Pre-built game templates and original game concepts for the platform.

**Status:** 💡 Planned

### Scope

Provide starter templates that demonstrate platform capabilities, plus original BroBlox game concepts:

### Template Candidates

| Template          | Priority    | Effort | Based On                               |
| ----------------- | ----------- | ------ | -------------------------------------- |
| PvP Arena         | 🔴 Critical | Low    | Phase 2 combat already done            |
| BroStars          | 🔴 Critical | High   | Pet band game, tests pets + audio      |
| BroBall           | 🔴 Critical | High   | Pet football, tests pets + matchmaking |
| BroCade           | 🟡 High     | Medium | Arcade minigames, tests leaderboards   |
| Race Mania        | 🟡 High     | Medium | Fairground racing, tests pets + gacha  |
| Fishing Simulator | 🟡 High     | High   | Trending genre (Fisch-style)           |
| Tower Defense     | 🟢 Medium   | High   | Wave-based gameplay                    |
| Horror Escape     | 🟢 Medium   | High   | Doors/Piggy style procedural           |
| Fashion/Social    | 🟢 Medium   | Medium | Dress To Impress style                 |
| Tycoon            | 🟢 Medium   | High   | Restaurant/business sim                |
| Anime Combat      | 🔵 Future   | High   | Blox Fruits/JJK style power systems    |

### Template Structure (proposed)

```
games/
  starter/           # Current: basic platform demo
  obby/              # Current: obstacle courses
  pvp-arena/         # Ranked PvP with matchmaking
  brostars/          # Pet band music game
  broball/           # Pet football management + action
  brocade/           # Arcade minigame hub
  race-mania/        # Fairground pet racing
  fishing-sim/       # Collection + exploration
  tower-defense/     # Wave-based co-op
  horror-escape/     # Procedural horror
  fashion/           # Social fashion game
  tycoon/            # Business simulation
```

---

## BroBlox Hub (Post-Phase 6)

> **Goal:** Central hub game tying all BroBlox games together.

**Status:** 💡 Planned

### Scope

The BroBlox Hub is a solar-system-inspired world where each planet is a giant block with unique biomes. Players walk on all sides (custom gravity), discover portals to other BroBlox games, and progress their LittleBro companion. This is the social heart of the platform.

**Depends on:** Phase 5b (LittleBro/pets), Phase 6 (BroCoins, social)

### Key Features

| Feature              | Priority    | Notes                                   |
| -------------------- | ----------- | --------------------------------------- |
| Gravity block worlds | 🔴 Critical | Walk on all sides of planet-blocks      |
| Game portals         | 🔴 Critical | Quick-join any BroBlox game from hub    |
| LittleBro home       | 🔴 Critical | Personal space to display pets/trophies |
| BroLympics events    | 🟡 High     | Platform-wide competitive events        |
| Cross-game profile   | 🟡 High     | Global stats, achievements, inventory   |
| BroCoins shop        | 🟡 High     | Spend cross-game currency on cosmetics  |

---

## Quick Reference: Feature → Phase Mapping

| Feature                            | Phase  | Status     |
| ---------------------------------- | ------ | ---------- |
| Core packages (net, config, etc.)  | 1      | ✅ Done    |
| Combat + hit validation            | 2      | ✅ Done    |
| Matchmaking + match lifecycle      | 2      | ✅ Done    |
| Dashboard match history            | 2      | ✅ Done    |
| Moderation system                  | 3      | ✅ Done    |
| Movement package                   | 3      | ✅ Done    |
| RBAC + audit logs                  | 3      | ✅ Done    |
| Feature flag v2 (segments, etc.)   | 3      | ✅ Done    |
| Second game template (obby)        | 3      | ✅ Done    |
| Dashboard moderation bridge        | 3      | ✅ Done    |
| Analytics package                  | 4      | 🔜 Next    |
| Notifications package              | 4      | 🔜 Next    |
| Leaderboards package               | 4      | 🔜 Next    |
| Codes system                       | 4      | 🔜 Next    |
| Open Cloud hardening               | 4      | 🔜 Next    |
| Rollback + runbooks                | 4      | 🔜 Next    |
| Roblox Moments                     | 4      | 🔜 Next    |
| Inventory package                  | 5a     | 💡 Planned |
| Progression (XP, prestige)         | 5a     | 💡 Planned |
| Quest/mission system               | 5a     | 💡 Planned |
| Daily rewards                      | 5a     | 💡 Planned |
| Pet system                         | 5b     | 💡 Planned |
| Egg/gacha system                   | 5b     | 💡 Planned |
| Bro Companion (LittleBro)          | 5b     | 💡 Planned |
| Battle pass                        | 5b     | 💡 Planned |
| Cosmetics system                   | 5b     | 💡 Planned |
| Localization (i18n)                | 5c     | 💡 Planned |
| Audio package                      | 5c     | 💡 Planned |
| Tutorial/FTUE                      | 5c     | 💡 Planned |
| World systems (day/night, weather) | 5c     | 💡 Planned |
| Trading                            | 6      | 💡 Planned |
| Guilds                             | 6      | 💡 Planned |
| Global BroCoins                    | 6      | 💡 Planned |
| Genre templates + games            | 7      | 💡 Planned |
| BroBlox Hub                        | Post-6 | 💡 Planned |

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
| Hub   | 4–6 weeks          | Phases 5b + 6         |

---

_See [Ideas (brainstorm reference)](ideas.md) for detailed feature research, mechanic patterns, and genre analysis._
