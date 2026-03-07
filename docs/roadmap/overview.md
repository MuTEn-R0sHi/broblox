# Roadmap

> **Last updated:** 2026-02-26
> **Status:** Phases 0–5c complete · Both games private · 0 public players

This is the single source of truth for BroBlox project planning. Raw brainstorming lives in [Ideas](ideas.md).

---

## Where we are today

The platform is **feature-complete through Phase 5c** — 33 packages, 2 games, a dashboard, and a website. All infrastructure is built, tested (3,100+ tests), and deployed.

**But nobody has played the games yet.**

Both games are deployed to Roblox across 3 environments (dev/staging/prod) — all 6 experiences are **private**. The website is live at [broblox-games.com](https://broblox-games.com), but deep links to the experiences are not configured yet (the "Play on Roblox" button currently points to roblox.com, not the specific games). There are zero public players, zero feedback, and zero revenue.

| Asset             | Status                                                |
| ----------------- | ----------------------------------------------------- |
| `games/test-park` | Deployed to Roblox (3 envs) — **private**             |
| `games/obby`      | Deployed to Roblox (3 envs) — **private**             |
| `apps/dashboard`  | Live on Vercel (internal)                             |
| `apps/website`    | Live at broblox-games.com                             |
| CI/CD pipeline    | Green — build, test, lint, publish, promote, rollback |
| Test coverage     | 3,100+ tests across 150+ test files                   |

### What's built (do not re-build)

- **33 `@broblox/*` packages** — core, net, combat, matchmaking, moderation, movement, data, config, analytics, notifications, leaderboards, codes, events, inventory, progression, quests, rewards, pets, gacha, cosmetics, battle-pass, marketplace, localization, audio, tutorial, world-systems, ui, input, security, observability, shared-types, constants, testing
- **2 games** (test-park + obby) — fully integrated with all packages
- **Dashboard v2** — RBAC, audit, bans, flags, match history, news CMS, moderation
- **Website v1** — homepage, games listing, per-game detail + wiki, rankings, news
- **Open Cloud CI** — publish/promote/rollback wired, branch protection enforced

---

## Priority: What to do next

The platform is heavily over-engineered relative to zero players. Before building more systems, we need real players giving real feedback.

### Priority 1 — Go public (10 minutes)

**Effort: trivial · Impact: unlocks everything**

1. Flip both games to **public** on Roblox (Creator Hub → each experience → Settings → set Public)
2. Set `NEXT_PUBLIC_ROBLOX_GAME_URL_TEST_PARK` and `NEXT_PUBLIC_ROBLOX_GAME_URL_OBBY` env vars in Vercel
3. Verify deep links work on broblox-games.com

This is a prerequisite for everything else. Nothing below matters without real players.

### Priority 2 — Playtest and polish

**Effort: 1–2 weeks · Impact: retention baseline**

Play both games yourself and with a small group. Focus on:

- Does the test park loop feel fun for 5 minutes? 30 minutes?
- Does the obby have enough stages / variety?
- Are the UI screens (daily rewards, quests, inventory, etc.) intuitive?
- Does matchmaking work with real concurrent players?
- Are there any server errors or exploits?

**Actions:**

- Fix bugs surfaced by playtesting
- Tune progression curves (XP, quest rewards, daily login) based on feel
- Improve first-time user experience (tutorial flow)
- Check analytics events are firing correctly

### Priority 3 — Pick ONE new game

**Effort: 2–4 weeks · Impact: validates the platform's multi-game promise**

The strongest proof that the platform works is a third game built quickly from the shared packages. Pick one based on:

- What sounds fun to build
- What uses existing packages well
- What genre is trending on Roblox right now

See [game candidates](#game-candidates) below for options.

### Priority 4 — Evaluate, then expand

**Only after Priorities 1–3 are done and you have real player data:**

- Are players returning? → If not, fix the game loop before adding features
- Are players spending? → If not, the economy design is premature
- Are players asking for social features? → If not, guilds/trading can wait

---

## Completed phases

All phases below are done.

### Phase 0 — Docs + conventions ✅

MkDocs site, architecture docs, ADR process.

### Phase 0.5 — Skeleton verification ✅

Build pipeline validated end-to-end: roblox-ts → Rojo → Roblox Studio.

### Phase 1 — Platform MVP ✅

Core platform skeleton: `core`, `shared-types`, `net`, `config-featureflags`. Test Park proving server authority, schema validation, rate limiting.

> Detail: [Phase 1 scope](phase-1-platform-mvp.md)

### Phase 2 — PvP Alpha ✅

Server-authoritative combat, matchmaking lifecycle, dashboard match history.

> Detail: [Phase 2 scope](phase-2-pvp-alpha.md)

### Phase 3 — Beta / Multi-game ✅

Second game (obby), moderation system, movement package, Dashboard v2 (RBAC + audit), feature flags v2.

### Phase 4 — Production ✅

Analytics, notifications, leaderboards, promo codes, events, Open Cloud CI pipeline, website v1 (broblox-games.com), dashboard news CMS, live leaderboard pipeline, UI screen templates.

**Deferred nice-to-haves** (do when relevant):

- Dashboard worker jobs (rollouts, ban propagation, scheduled events)
- Performance budgets in CI
- Roblox Moments integration

### Phase 5a — Progression ✅

Inventory, XP/levels/prestige, quests, daily rewards + achievements.

### Phase 5b — Collection & Monetization ✅

Pets (hatching, leveling, evolution), gacha (loot tables, pity), cosmetics, battle pass, marketplace (developer products, game passes, receipt validation).

### Phase 5c — Support Systems ✅

Localization, audio, tutorial/FTUE, world systems (day/night, weather, seasons).

---

## Milestone mapping

### Packages by phase

| Phase | Packages                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------- |
| 1     | `core`, `shared-types`, `net`, `security`, `config-featureflags`, `input`, `ui`, `data`, `observability` |
| 2     | `combat`, `matchmaking`                                                                                  |
| 3     | `moderation`, `movement`                                                                                 |
| 4     | `codes`, `leaderboards`, `analytics`, `notifications`, `events` + website + dashboard CMS                |
| 5a    | `inventory`, `progression`, `quests`, `rewards`                                                          |
| 5b    | `pets`, `gacha`, `cosmetics`, `battle-pass`, `marketplace`                                               |
| 5c    | `localization`, `audio`, `tutorial`, `world-systems`                                                     |

### Games + apps

| Asset             | Phase | Status                |
| ----------------- | ----- | --------------------- |
| `games/test-park` | 1     | ✅ Deployed (private) |
| `games/obby`      | 3     | ✅ Deployed (private) |
| `apps/dashboard`  | 3     | ✅ Live               |
| `apps/website`    | 4     | ✅ Live               |

---

## Future vision (build only when justified by player data)

Everything below is **deferred** until the games are public and there's evidence players want these features. The packages and architecture to support them are designed but not yet implemented.

### Phase 6 — Economy & Social

> **Prerequisites:** Public games with active players, Roblox OAuth for website.

| Feature                  | Effort | Notes                                  |
| ------------------------ | ------ | -------------------------------------- |
| Player-to-player trading | High   | Secure trade window, audit log         |
| Guild/clan system        | High   | Social stickiness, shared progress     |
| Global BroCoins currency | High   | Cross-game currency with sinks/faucets |
| Friend invite rewards    | Low    | Social hooks                           |
| Auction house            | High   | Optional, exploit-prone — defer        |

**Website additions (require Roblox OAuth):**

| Page                  | Integration                    |
| --------------------- | ------------------------------ |
| `/profile/[player]`   | Cross-game stats, achievements |
| `/guilds`             | Guild finder, member counts    |
| Nav: BroCoins balance | Authenticated economy display  |

**Proposed packages:** `trading`, `guilds`, `economy`, `social`

**Why defer:** None of this matters without players. BroCoins with 0 users is a ledger nobody reads. Guilds with 0 members are empty rooms. Build economy/social when retention data proves players want to stay.

### Phase 7 — Genre Templates & Games

> **Goal:** Prove the platform by shipping more games quickly.

Priority 3 above ("pick ONE new game") is the practical start of Phase 7. Full template library is aspirational.

### BroBlox Hub (post-Phase 6)

> **Concept:** Solar-system world where each planet is a block with custom gravity. Game portals, LittleBro companion home, cross-game profile, BroCoins shop.

**Depends on:** Phase 5b (companion), Phase 6 (BroCoins, social). Don't build this until Phase 6 is actually needed.

---

## Game candidates

These are options for Priority 3 ("pick ONE new game") or later Phase 7 expansion. Sorted by how well they leverage existing packages.

| Game                       | Effort | Packages it exercises                 | Why it's interesting                                         |
| -------------------------- | ------ | ------------------------------------- | ------------------------------------------------------------ |
| **PvP Arena**              | Low    | combat, matchmaking, leaderboards     | Phase 2 combat is already built — this is mostly game design |
| **BroCade** (arcade hub)   | Medium | leaderboards, rewards, UI             | Minigame collection — easy to iterate                        |
| **Race Mania**             | Medium | movement, pets, gacha, leaderboards   | Trending genre, uses pet system                              |
| **Fishing Simulator**      | High   | inventory, progression, world-systems | Fisch-style — hugely popular genre                           |
| **BroStars** (pet band)    | High   | pets, audio, progression              | Unique concept, tests audio + pets                           |
| **BroBall** (pet football) | High   | pets, matchmaking, combat             | Team-based, tests multiple systems                           |
| **Tower Defense**          | High   | combat, inventory, progression        | Wave-based co-op                                             |
| **Horror Escape**          | High   | world-systems, movement               | Doors/Piggy style                                            |
| **Tycoon**                 | High   | inventory, progression, economy       | Business sim                                                 |

**Recommendation:** Start with **PvP Arena** (lowest effort, most packages already proven) or **BroCade** (minigame hub lets you experiment without committing to one genre).

---

## Open items

Small improvements that can be done anytime, independent of the priorities above.

| Item                                   | Effort | Notes                                                              |
| -------------------------------------- | ------ | ------------------------------------------------------------------ |
| Wire `@broblox/marketplace` into games | Medium | Product handlers exist but aren't called from game services yet    |
| Bro Companion ADR                      | Low    | Design doc for cross-game mascot — write when Hub becomes relevant |
| Roblox OAuth design                    | Medium | Needed before any authenticated website features                   |
| Dashboard worker jobs                  | Medium | Rollout automation, ban propagation                                |
| Performance budgets in CI              | Medium | Bundle size / memory limits                                        |
| Roblox Moments integration             | Low    | Auto-detect highlights for sharing                                 |

### Code quality (completed)

Improvements from the [improvement plan](../improvement-plan.md), completed 2026-02-27:

| Session | Area                                                   | Status  |
| ------- | ------------------------------------------------------ | ------- |
| S1      | Memory leaks — RateLimiter & security state Maps       | ✅ Done |
| S2      | Constants — magic numbers to `@broblox/constants`      | ✅ Done |
| S3      | Security — configurable thresholds + aerial speed      | ✅ Done |
| S4      | Logger — fix `child()` prefix extraction               | ✅ Done |
| S5      | Net — `cleanup(playerId)` + player lifecycle           | ✅ Done |
| S6      | Testing — DataStore mock + richer Player mock          | ✅ Done |
| S7      | Data — `BasePlayerStore` versioning infrastructure     | ✅ Done |
| S8      | Moderation — dedup, cleanup lifecycle, callback safety | ✅ Done |
| S9      | Net validation — array guard                           | ✅ Done |
| S10     | Protocol — NaN/Infinity guard                          | ✅ Done |
| S11     | Core — duplicate-name → hard error                     | ✅ Done |
| S12     | Docs — ADR-0009, ADR-0010, roadmap update              | ✅ Done |

---

## Environments

| Environment | Purpose                | Publishing       |
| ----------- | ---------------------- | ---------------- |
| **dev**     | Continuous from `main` | Automatic        |
| **staging** | QA / canary            | Manual promote   |
| **prod**    | Tagged releases        | Release workflow |

---

_Raw brainstorming and feature research: [Ideas](ideas.md) · Phase detail pages: [Phase 1](phase-1-platform-mvp.md) · [Phase 2](phase-2-pvp-alpha.md)_
