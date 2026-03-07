# Future Phases

> **Last updated:** 2026-03-07
> **Status:** Deferred until games are public with active players

Everything on this page is **deferred** until the games are public and there's evidence players want these features. The packages and architecture to support them are designed but not yet implemented.

For the current actionable plan, see [Roadmap overview](overview.md).

---

## Phase 6 — Economy & Social

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

---

## Phase 7 — Genre Templates & Games

> **Goal:** Prove the platform by shipping more games quickly.

Priority 3 from the roadmap overview ("pick ONE new game") is the practical start of Phase 7. Full template library is aspirational.

See [game candidates](overview.md#game-candidates) in the roadmap overview for the ranked list.

---

## BroBlox Hub (post-Phase 6)

> **Concept:** Solar-system world where each planet is a block with custom gravity. Game portals, LittleBro companion home, cross-game profile, BroCoins shop.

**Depends on:** Phase 5b (companion), Phase 6 (BroCoins, social). Don't build this until Phase 6 is actually needed.

See [ideas/game-ideas/broblox.md](../../ideas/game-ideas/broblox.md) for the full concept doc.

---

## Bro Companion — Cross-Game Mascot (post-Phase 6)

> **Concept:** A customizable LittleBro that follows players across all BroBlox games.

**Proposed package:** `@broblox/bro-companion`

**Depends on:** Phase 5b (pets system), Phase 6 (BroCoins for cross-game currency).

See [ideas/IDEAS.md § The LittleBro](../../ideas/IDEAS.md#19-the-littlebro--platform-mascot) for the full concept.

---

_Raw brainstorming: [Ideas](ideas.md) · Current plan: [Overview](overview.md)_
