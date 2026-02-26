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

> **Goal:** Safe continuous delivery, sustainable operations, and a live public-facing platform.

**Status:** ✅ Complete

### Shipped

- `packages/analytics` v1: player behavior events, funnels, sessions, retention tracking ✅
- `packages/notifications` v1: in-game toasts, announcements, news feed ✅
- `packages/leaderboards` v1: cross-game leaderboards with period support ✅
- `packages/codes` v1: redeemable promo codes with single/multi-use, expiry, and limits ✅
- Open Cloud publish/promote pipeline (ci.yml, promote.yml, release.yml) ✅
- Rollback procedure + incident runbooks ✅
- **`apps/website` v1** — public portal at [broblox-games.com](https://broblox-games.com) ✅
  - Homepage (hero, games grid, features, animated stats, footer)
  - `/games` listing + `/games/[slug]` detail + `/games/[slug]/wiki`
  - `/rankings` — live leaderboards from OrderedDataStore via dashboard API (60s ISR)
  - `/news` — live posts from dashboard News CMS (5-min ISR)
  - Responsive nav with mobile hamburger; neon cyan/purple brand theme
  - Deployed to Vercel; `broblox-games.com` live
- **Dashboard news CMS** — full CRUD for news posts with RBAC, audit, and public API ✅
- **Live leaderboard pipeline** — game → `@rbx/leaderboards` OrderedDataStore → dashboard API → website `/rankings` ✅
- `@rbx/ui` v1: 8 screen templates (daily-rewards, quest-tracker, pet-collection, inventory, cosmetics, gacha, settings, battle-pass) ✅

### Remaining Deliverables

- **Roblox game deep links** — both games deployed to Roblox across dev/staging/live (6 private experiences); set `NEXT_PUBLIC_ROBLOX_GAME_URL_*` env vars in Vercel when experiences are made public
- Dashboard worker jobs: rollouts, ban propagation, scheduled events
- Performance budgets enforced in CI where possible
- Regular ADR + security review cadence

### Feature Candidates

| Feature                 | Priority | Effort | Notes                                                 |
| ----------------------- | -------- | ------ | ----------------------------------------------------- |
| Roblox deep links       | 🟡 High  | Low    | Experiences deployed (private) — activate when public |
| Open Cloud hardening    | 🟡 High  | High   | Baseline implemented; hardening remains               |
| Roblox Moments          | 🟡 High  | Low    | Auto-detect highlights, viral sharing                 |
| Scheduled events system | 🟡 High  | Medium | Events section implementation                         |
| Performance monitoring  | 🟡 High  | Medium | Budgets + alerts                                      |

---

## Phase 5 — Gameplay Modules (Progression)

> **Goal:** Reusable gameplay systems for any game.

**Status:** ✅ Complete

Prerequisites for all collection/reward features.

**Status:** ✅ Complete

### Shipped

- `packages/inventory` v1: base item/slot system with stacking and weight limits ✅
- `packages/progression` v1: XP, levels, prestige/rebirth with configurable curves ✅
- `packages/quests` v1: quest/objective tracking with multi-step progress ✅
- `packages/rewards` v1: daily login rewards, streaks, achievement tracking ✅

```
packages/
  inventory/       # Base item/slot system (prerequisite)  ✅
  progression/     # XP, levels, prestige/rebirth          ✅
  quests/          # Quest/mission framework               ✅
  rewards/         # Daily login, achievements             ✅
```

### Phase 5b — Collection & Monetization

Revenue-driving mechanics. Depend on inventory.

**Status:** ✅ Complete

### Shipped

- `packages/pets` v1: pet registry, store, leveling, evolution, equip (34 tests) ✅
- `packages/gacha` v1: egg registry, weighted loot tables, pity system (20 tests) ✅
- `packages/cosmetics` v1: ownership, equip slots, slot validation (26 tests) ✅
- `packages/battle-pass` v1: seasons, XP/tier progression, free/premium claims (29 tests) ✅
- Game integrations: PetService, GachaService, CosmeticsService, BattlePassService for both starter and obby ✅
- 1089 tests across 36 test suites ✅

### Remaining

| Feature         | Priority    | Effort | Notes                             |
| --------------- | ----------- | ------ | --------------------------------- |
| Bro Companion   | 🔴 Critical | High   | Cross-game mascot, brand identity |
| Crafting system | 🟢 Medium   | Medium | Item depth                        |
| Skill trees     | 🟢 Medium   | High   | Class customization               |

```
packages/
  bro-companion/   # Cross-game mascot system (The Bro)
  pets/            # Pet system, evolution, equipment       ✅
  gacha/           # Eggs, hatching, pity system            ✅
  cosmetics/       # Skins, outfits, accessories            ✅
  battle-pass/     # Seasonal progression, free/premium     ✅
```

### Phase 5c — Support Systems ✅

Independent packages built in parallel with 5b.

**Status:** ✅ Complete

### Shipped

- `packages/localization` v1: multi-locale string registry with interpolation and pluralization ✅
- `packages/audio` v1: SFX, music, spatial audio, playlists, per-channel volume ✅
- `packages/tutorial` v1: FTUE framework with step sequencing and persistence ✅
- `packages/world-systems` v1: day/night cycle, weather transitions, season progression ✅
- 2,400+ tests across 115+ test suites ✅

```
packages/
  localization/    # i18n, string tables, language switching  ✅
  audio/           # SFX manager, music system, spatial audio ✅
  tutorial/        # FTUE framework, step-by-step guides     ✅
  world-systems/   # Day/night cycle, weather, seasons        ✅
```

---

## Phase 6 — Economy & Social

> **Goal:** Cross-game economy, guilds, social features, and live-data website integration.

**Status:** 💡 Planned

### Prerequisites (must land before Phase 6 is real)

- ✅ **`packages/marketplace`** — `MarketplaceService` wrapper: developer products, game passes, purchase receipt validation. Built in Phase 5b close-out; see ADR-0008. Games must wire product handlers before Phase 6 Robux flows are activated.
- **Roblox OAuth for website** — `/profile/[player]`, BroCoins balance in nav, and guild pages all require an authenticated Roblox identity. No auth flow is designed yet — needs its own scope and ADR before Phase 6 website features are built.

### Scope

- Player-to-player trading with safeguards
- Guild/Clan infrastructure
- Global BroCoins currency across games
- Social features (leaderboards, friend rewards)

### Website Integration (Phase 6 dependency)

Once Phase 6 backend packages exist, the website gains real data:

| Page                              | Integration                                            | Prerequisite                          |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| `/rankings`                       | Live scores from `@rbx/leaderboards` via dashboard API | Running game + leaderboard DataStores |
| `/rankings`                       | BroCoins totals per player                             | Global economy (`@rbx/economy`)       |
| Website `/guilds` (new)           | Guild finder, member counts                            | `@rbx/guilds`                         |
| Website `/profile/[player]` (new) | Cross-game stats, achievements                         | `@rbx/social` + dashboard API         |
| Website nav                       | BroCoins balance (if authenticated)                    | Auth + `@rbx/economy`                 |

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

| Feature                                      | Phase  | Status     |
| -------------------------------------------- | ------ | ---------- |
| Core packages (net, config, etc.)            | 1      | ✅ Done    |
| Combat + hit validation                      | 2      | ✅ Done    |
| Matchmaking + match lifecycle                | 2      | ✅ Done    |
| Dashboard match history                      | 2      | ✅ Done    |
| Moderation system                            | 3      | ✅ Done    |
| Movement package                             | 3      | ✅ Done    |
| RBAC + audit logs                            | 3      | ✅ Done    |
| Feature flag v2 (segments, etc.)             | 3      | ✅ Done    |
| Second game template (obby)                  | 3      | ✅ Done    |
| Dashboard moderation bridge                  | 3      | ✅ Done    |
| Analytics package                            | 4      | ✅ Done    |
| Notifications package                        | 4      | ✅ Done    |
| Leaderboards package                         | 4      | ✅ Done    |
| Codes system                                 | 4      | ✅ Done    |
| Open Cloud hardening                         | 4      | ✅ Done    |
| Rollback + runbooks                          | 4      | ✅ Done    |
| Roblox Moments                               | 4      | 💡 Planned |
| Website (broblox-games.com)                  | 4      | ✅ Done    |
| Dashboard news CMS route                     | 4      | ✅ Done    |
| UI screen templates                          | 4      | ✅ Done    |
| Roblox game deep links                       | 4      | 🔄 Pending |
| Live leaderboard data pipeline               | 4      | ✅ Done    |
| Inventory package                            | 5a     | ✅ Done    |
| Progression (XP, prestige)                   | 5a     | ✅ Done    |
| Quest/mission system                         | 5a     | ✅ Done    |
| Daily rewards                                | 5a     | ✅ Done    |
| Pet system                                   | 5b     | ✅ Done    |
| Egg/gacha system                             | 5b     | ✅ Done    |
| Bro Companion (LittleBro)                    | 5b     | 💡 Planned |
| Battle pass                                  | 5b     | ✅ Done    |
| Cosmetics system                             | 5b     | ✅ Done    |
| Localization (i18n)                          | 5c     | ✅ Done    |
| Audio package                                | 5c     | ✅ Done    |
| Tutorial/FTUE                                | 5c     | ✅ Done    |
| World systems (day/night, weather)           | 5c     | ✅ Done    |
| `packages/marketplace` (MonetizationService) | 5b     | ✅ Done    |
| Trading                                      | 6      | 💡 Planned |
| Guilds                                       | 6      | 💡 Planned |
| Global BroCoins                              | 6      | 💡 Planned |
| Website: live rankings                       | 4      | ✅ Done    |
| Website: guild finder page                   | 6      | 💡 Planned |
| Website: player profile page                 | 6      | 💡 Planned |
| Genre templates + games                      | 7      | 💡 Planned |
| BroBlox Hub                                  | Post-6 | 💡 Planned |

---

## Timeline Estimates

| Phase | Estimated Duration | Dependencies          |
| ----- | ------------------ | --------------------- |
| 4     | ✅ Complete        | Phase 3 ✅            |
| 5a    | ✅ Complete        | Phase 4               |
| 5b    | ✅ Complete        | Phase 5a              |
| 5c    | ✅ Complete        | Phase 4 (parallel)    |
| 6     | 6–8 weeks          | Phase 5a (partial)    |
| 7     | Ongoing            | Phases 5–6 (parallel) |
| Hub   | 4–6 weeks          | Phases 5b + 6         |

---

_See [Ideas (brainstorm reference)](ideas.md) for detailed feature research, mechanic patterns, and genre analysis._
