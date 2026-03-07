# BroBlox Platform — Ideas & Brainstorm Reference

> **Purpose:** Consolidated brainstorming for feature ideas, monetization patterns, game concepts, and platform direction.
> This is a living scratchpad for unvetted ideas — structured planning lives in the roadmap docs.
>
> **Official Roadmap:** [docs/roadmap/overview.md](../docs/roadmap/overview.md)

---

## Table of Contents

1. [Quick Ideas & Open Questions](#1-quick-ideas--open-questions)
2. [Ranking & Rarity Systems](#2-ranking--rarity-systems)
3. [Core Game Systems](#3-core-game-systems)
4. [Progression & Economy](#4-progression--economy)
5. [Monetization Patterns (Ethical)](#5-monetization-patterns-ethical)
6. [Social & Community Features](#6-social--community-features)
7. [World Generation & Theming](#7-world-generation--theming)
8. [Unified BroBlox Platform Features](#8-unified-broblox-platform-features)
9. [Event Systems](#9-event-systems)
10. [Game Genre Ideas](#10-game-genre-ideas)
11. [Platform & Tooling Ideas](#11-platform--tooling-ideas)
12. [Technical Debt & Infrastructure](#12-technical-debt--infrastructure)
13. [Trending Roblox Genres (2025–2026)](#13-trending-roblox-genres-20252026)
14. [Core Mechanic Patterns](#14-core-mechanic-patterns)
15. [Engagement & Retention Hooks](#15-engagement--retention-hooks)
16. [Virtual Economy Best Practices](#16-virtual-economy-best-practices)
17. [Accessibility Features](#17-accessibility-features)
18. [Platform Integration Ideas](#18-platform-integration-ideas)
19. [The LittleBro — Platform Mascot](#19-the-littlebro--platform-mascot)
20. [Game Concepts](#20-game-concepts)

---

## 1. Quick Ideas & Open Questions

These are raw, unstructured ideas to explore or decide on.

### Live Game Creation Events

Could we create a new empty game where the team is live together with players, and the players can poll for the kind of game they want? The game grows step-by-step while players watch and actively collaborate. Think "live-building with an audience."

### BroBux — Shadow Currency

Since we may want to test, give away, or sponsor things that normally cost Robux, could we have our own "BroBux" currency? Shops that accept Robux would also accept BroBux. We could mint BroBux freely without spending real money. **Open question:** Is this legitimate within Roblox ToS? Needs research.

### Branding Refinement

- "Two bros. Building Roblox games." → Consider something like **"Bro2Bro Gaming"** as tagline instead.

### Shared Loading Screen

A reusable loading screen component showing game info (name, version, news) and a polished loading visualization. Should cover longer loading times for bigger games, have a short minimum display time, but never block unnecessarily. **Candidate package:** `@broblox/loading-screen` or integrate into `@broblox/ui`.

### Game Map Type & Generator System

Define types of game maps each game can use: simple arena, world plane, space, ocean, etc. Each type has parameters/seeds for configurable generation and comes with base setup: play area boundaries, theming, environmental effects. For example, a "world plane" type would generate realistic maps with:

- Endless horizon simulation
- Naturalistic elevations (hills, mountains, riverbeds, canyons)
- Water system (rivers, shorelines, islands, oceans)
- Logical street/road and village/city layouts
- Integrated lighting, fog, weather effects

This could extend or compose with `@broblox/world-systems`.

### Performant Multiplayer Shooter

There are impressive multiplayer shooters on Roblox. Can our platform support this? **Answer: Yes** — we have `@broblox/combat` (hit validation, cooldowns), `@broblox/matchmaking`, `@broblox/movement` (anti-cheat), and `@broblox/net` (rate limiting, schema validation). A PvP Arena game is listed as low-effort in the roadmap game candidates. Key challenges: tick rate optimization, lag compensation, spatial partitioning for large player counts.

---

## 2. Ranking & Rarity Systems

### Tier System (Characters/Items/Pets)

| Tier   | Label         | Description                                 |
| ------ | ------------- | ------------------------------------------- |
| S+ / S | Meta/God      | Extremely powerful, dominant, game-changing |
| A      | Strong        | High performance, worth investing in        |
| B      | Decent        | Solid, good for mid-game or niche use       |
| C      | Below Average | Filler, early-game only                     |
| D / F  | Fodder        | Weakest, situational, upgrade material      |

### Rarity Hierarchy

| Rarity           | Color             | Drop Rate Range               |
| ---------------- | ----------------- | ----------------------------- |
| Common           | Gray/White        | 1/2 – 1/100                   |
| Uncommon         | Green             | 1/100 – 1/500                 |
| Rare             | Blue              | 1/500 – 1/2,000               |
| Epic             | Purple            | 1/2,000 – 1/10,000            |
| Legendary        | Gold/Red          | 1/10,000 – 1/100,000          |
| Mythical         | Orange/Pink       | 1/100,000 – 1/1,000,000       |
| Celestial/Divine | Rainbow/Prismatic | 1/1M – 1/10B+                 |
| Secret/???       | Hidden            | Event-only or discovery-based |

### RNG Simulator Scaling (for gacha/roll games)

- **Common:** 1/2 to 1/500
- **Rare:** 1/2,000 to 1/10,000
- **Legendary/Mythical:** 1/100,000 to 1/1M
- **Transcendent/Zenith:** 1/10T to 1/10Qn (flex/collector tiers)

---

## 3. Core Game Systems

### Pets & Mounts

- **Pet System** — Collectible companions with passive bonuses (luck, speed, damage multipliers). _Implemented: `@broblox/pets`._
- **Mounting System** — Ride pets for movement (ground, flying, swimming, diving). _Not yet implemented._
- **Pet Evolution** — Combine/fuse pets for higher tiers. _Implemented: `@broblox/pets`._
- **Pet Equipment** — Equip accessories to boost pet stats. _Not yet implemented._

### Eggs & Hatching

- **Egg Types** — Tied to biomes, events, or shops. _Implemented: `@broblox/gacha`._
- **Hatching Mechanics** — Time-based, click-based, or walk-based. _Basic hatching in gacha; specialized mechanics not yet._
- **Pity System** — Guaranteed rare after X hatches. _Implemented: `@broblox/gacha`._
- **Shiny/Golden Variants** — Cosmetic variants with small stat boosts. _Not yet implemented._

### Environment Systems

- **Day/Night Cycle** — Affects spawns, events, lighting. _Implemented: `@broblox/world-systems`._
- **Weather System** — Rain, snow, storms with gameplay effects. _Implemented: `@broblox/world-systems`._
- **Seasons** — Rotating content tied to real-world or in-game calendar. _Implemented: `@broblox/world-systems`._
- **Biomes/Worlds** — Distinct zones with unique resources, enemies, aesthetics. _Not yet implemented (see Map Generator idea)._

### Mutations & Variants

- **Mutations** — Random modifiers on drops (shiny, corrupted, blessed, etc.)
- **Auras** — Visual effects tied to rarity or achievement
- **Enchantments** — Stat modifiers applied to items

---

## 4. Progression & Economy

### Item System (Diablo-style depth)

- **Item Quality** — Normal → Magic → Rare → Unique → Set → Runeword
- **Affixes** — Prefix/suffix modifiers (e.g., "Blazing Sword of the Whale")
- **Sockets** — Embed gems/runes for customization
- **Item Level** — Determines affix pool and stat rolls
- **Durability** — Optional wear system requiring repairs

### Trading System

> Planned: `docs/modules/trading.md` — design exists, no code yet

- **Player-to-Player Trading** — Secure trade window with confirmation
- **Auction House** — List items for sale (optional, exploit-prone — deferred)
- **Trade History** — Audit log for scam prevention

### Currencies

- **Game-Specific Currency** — Earned through gameplay (coins, gems, tokens)
- **Premium Currency** — Purchased with Robux (crystals, diamonds)
- **Global BroCoins** — Cross-game currency (see Unified Features below)

---

## 5. Monetization Patterns (Ethical)

### Battle Pass

> Implemented: `@broblox/battle-pass`

- Free and premium tracks
- Earnable through gameplay, not just time gates
- No FOMO — past seasons purchasable at discount

### Daily Rewards

> Implemented: `@broblox/rewards`

- Streak bonuses with forgiveness (miss 1 day, keep streak)
- Milestone rewards at 7, 14, 30 days

### Cosmetics

> Implemented: `@broblox/cosmetics`

- Skins, trails, auras, titles, emotes
- No pay-to-win — cosmetic only

### Gacha/Loot Boxes

> Implemented: `@broblox/gacha`

- Display exact odds
- Pity system mandatory
- No duplicates or dupe protection

---

## 6. Social & Community Features

### Roblox Moments Integration

Leverage Roblox's native recording feature:

- In-game highlight triggers (epic kills, rare drops, clutch moments)
- Share to feed with game context
- Leaderboard of most-shared clips

### Guilds/Clans

> Planned: Phase 6

- Create/join guilds with shared progress
- Guild wars, raids, leaderboards
- Guild-exclusive cosmetics

### Leaderboards

> Implemented: `@broblox/leaderboards`

- Daily, weekly, seasonal, all-time
- Per-game and cross-game (BroBlox global)
- Anti-cheat validation before posting

### Codes System

> Implemented: `@broblox/codes`

- Redeemable codes for rewards
- Dashboard UI for creating/managing codes
- Expiration and usage limits

---

## 7. World Generation & Theming

### Procedural Generation

- **Terrain Generator** — Elevations, rivers, biomes
- **Structure Generator** — Buildings, villages, dungeons
- **Road/Path Generator** — Connect points of interest
- **Skybox/Atmosphere** — Match theme (day/night, weather)

### Theme System

- Unified visual language per world/zone
- Color palettes, asset packs, lighting presets
- Easy to swap for seasonal events

---

## 8. Unified BroBlox Platform Features

### Global BroCoins Currency

> Planned: Phase 6

- Earned in any BroBlox game
- Spent on cross-game cosmetics or bonuses
- Displayed in unified HUD element across all games

### BroPortal

- In-game hub to browse all BroBlox games
- Quick-join, favorites, friend activity
- Shared profile showing achievements across games

### Unified Player Profile

- Global stats, achievements, inventory
- Cross-game friends list
- Account linking with dashboard

---

## 9. Event Systems

### Admin Abuse Events (Chaos Mode)

- Scheduled or surprise events
- Admins spawn enemies, change gravity, give buffs
- Loot piñatas, boss raids, minigames

### Seasonal Events

> Scaffolding: `@broblox/events`

- Holiday themes (Halloween, Christmas, etc.)
- Limited-time items and challenges
- Event pass with exclusive rewards

### World Bosses

- Server-wide boss spawns
- Contribution-based rewards
- Scheduled or triggered by player activity

---

## 10. Game Genre Ideas

### Beat/Rhythm Games

- Actions sync to music beat
- Procedural music from player actions
- BeatSaber-style combat or DDR-style movement

### Simulator Games

- Clicking/tapping progression
- Rebirth/prestige systems
- Pet collection and automation

### Tycoon Games

- Build and manage facilities
- Economy simulation
- Visitor/customer mechanics

### RPG/Adventure

- Quest system with branching dialogue
- Skill trees and class selection
- Dungeon crawling with loot

### PvP Arena

> Architecture ready — `@broblox/combat` + `@broblox/matchmaking`

- Ranked matchmaking
- Multiple game modes (TDM, FFA, CTF)
- Seasonal rankings with rewards

---

## 11. Platform & Tooling Ideas

### Feature Demos

- Dedicated demo space per system
- Interactive testing for developers
- Documentation links in-world

### BroBlox Website/App Expansion

> Website v1 live at broblox-games.com

- Game directory with trailers
- Wiki pages per game (route exists, no content yet)
- Leaderboards and player lookup
- News and patch notes
- Code redemption portal
- Creator dashboard

### Analytics Dashboard

> Partial: `@broblox/analytics` + `@broblox/observability`

- Player retention metrics
- Monetization funnels
- A/B test results
- Error and crash tracking

---

## 12. Technical Debt & Infrastructure

### Performance Budgets

- Frame time limits per system
- Memory caps for pets/particles
- LOD system for large worlds

### Anti-Cheat Enhancements

> Implemented: `@broblox/security` + `@broblox/movement`

- Server-side validation for all actions
- Anomaly detection (speed, teleport, damage)
- Trust scoring with escalation

### Cross-Server Features

- MessagingService for global events
- DataStore versioning and migrations _(Implemented: ADR-0010)_
- Reserved server orchestration

---

## 13. Trending Roblox Genres (2025–2026)

Based on current Roblox trends and top-performing games:

| Genre                   | Examples/Inspiration                 | Platform Fit                   |
| ----------------------- | ------------------------------------ | ------------------------------ |
| Obby/Platformer         | Tower of Hell, speedrun leaderboards | **Built** (games/obby)         |
| Horror/Escape           | Doors, Piggy, Rainbow Friends        | Medium effort                  |
| Anime-Inspired          | Blox Fruits, Jujutsu games           | Medium (combat pkg helps)      |
| Fishing/Collection Sims | Fisch — rod upgrades, rare catches   | High effort                    |
| Roleplay (RP)           | Brookhaven, Royale High              | High effort                    |
| Tower Defense           | Anime TD, co-op wave defense         | High (needs new systems)       |
| Competitive Shooters    | Rivals, Arsenal, Bed Wars            | **Low** (combat + matchmaking) |
| Survival                | Dead Rails, Natural Disaster         | Medium                         |
| Fashion/Social          | Dress To Impress, social hubs        | Medium                         |

---

## 14. Core Mechanic Patterns

### Rebirth / Prestige System

> Implemented: `@broblox/progression`

- Reset progress for permanent multipliers
- Prestige currency for exclusive upgrades
- Rebirth milestones with cosmetic rewards
- Multiple prestige layers (rebirth → ascension → transcendence)

### Idle / AFK Mechanics

- Auto-collect resources while offline
- AFK zones for passive gains
- Sleep bonuses for returning players

### Lucky Block / Loot Box Mechanics

- Break blocks for random rewards
- Visible drop tables with percentages
- Lucky multipliers and boosters
- Event-exclusive lucky blocks

### Quest / Mission Systems

> Implemented: `@broblox/quests`

- Daily, weekly, seasonal quests
- Quest chains with story progression
- Bounty board with varying difficulty

### Skill Trees / Class Systems

- Multiple class paths (warrior, mage, rogue)
- Respec options (free or paid)
- Hybrid builds allowed

### Crafting Systems

- Recipe discovery
- Material gathering from world
- Quality tiers based on materials
- Blueprint unlocks from bosses/events

### Enchanting / Upgrading

- Weapon/armor enhancement levels
- Risk-based upgrading (fail = destroy)
- Safe enhancement items (cash shop)
- Enchant scrolls with random stats

---

## 15. Engagement & Retention Hooks

### First-Time User Experience (FTUE)

> Implemented: `@broblox/tutorial`

- Guided tutorial with skip option
- Immediate reward for completing intro
- Mentor/buddy system with veterans
- Progressive complexity unlock

### Daily Login Rewards

> Implemented: `@broblox/rewards`

- Calendar-style rewards
- Streak protection (miss 1–2 days)
- VIP/Premium bonus track
- Monthly reset with grand prize

### Limited-Time Offers (LTO)

- Flash sales with countdown
- Exclusive bundles
- Returning player offers
- Milestone purchase bonuses

### Social Hooks

- Friend invite rewards
- Group/guild bonuses
- Social challenges (play with friends)
- Referral tracking

### FOMO Mitigation (Ethical)

- Archive system for past content
- "Catch-up" mechanics for new players
- No permanent exclusives (rotate back)
- Fair pricing for returning items

---

## 16. Virtual Economy Best Practices

### Sink / Faucet Balance

- Clear currency sinks (upgrades, cosmetics, repairs)
- Controlled faucets (daily limits, diminishing returns)
- Anti-inflation mechanics
- Economy monitoring dashboard

### Trading Safeguards

- Trade confirmation delays
- Value warnings for unequal trades
- Scam report system
- Trade rollback for exploits

### Premium Currency Ethics

- Clear Robux → in-game conversion
- No pay-to-win advantages
- Cosmetic-only premium exclusives
- Earnable premium currency (slow)

---

## 17. Accessibility Features

### Input Options

> Implemented: `@broblox/input`

- Controller support
- Touch-friendly UI
- Keyboard remapping
- One-handed mode option

### Visual Accessibility

- Colorblind modes
- High contrast options
- Scalable UI
- Screen reader hints

### Difficulty Options

- Assist modes for younger players
- Invincibility toggles (for story content)
- Adjustable game speed

---

## 18. Platform Integration Ideas

### Roblox Moments

- Auto-detect highlight moments (rare drops, wins)
- Custom thumbnail generation
- Share with game branding
- Clip leaderboards

### UGC (User-Generated Content)

- Custom skins/cosmetics marketplace
- Level/map creator tools
- Community voting on content
- Revenue share with creators

### Voice Chat Integration

- Proximity voice for social games
- Team voice channels for competitive
- Voice moderation tools
- Opt-in only with parental controls

### Cross-Platform Sync

- Seamless PC ↔ Mobile ↔ Console
- Cloud save with conflict resolution _(Implemented: `@broblox/data` session locking)_
- Platform-specific UI adaptations _(Implemented: `@broblox/input` device detection)_

---

## 19. The LittleBro — Platform Mascot & Hub Companion

**Type:** Cross-Game Mascot / Companion System
**Purpose:** The LittleBro is the universal, customizable companion that appears across ALL BroBlox games and is central to the BroBlox hub experience (see [BroBlox Hub concept](#broblox-hub)).
**Inspiration:** Minions, Slimes, Kirby, Fall Guys beans — with a unique BroBlox twist.

### Core Concept

A tiny, cute creature that follows you everywhere on the BroBlox platform. It reacts to gameplay, can be deeply customized, and is a key part of your identity across all games. Collecting, upgrading, and showing off LittleBros is a core progression system.

### Design Direction — BroBlobs with Hats

```
    🎩 ← Big customizable hat
   (◕‿◕) ← Simple cute face
    ╰─╯  ← Blob body (color customizable)
```

- Squishy, blob-shaped body for easy animation (squish, bounce, stretch)
- Oversized, highly customizable hats as the main identity piece
- Simple, expressive faces (happy, surprised, sleepy, etc.)
- Small size (knee-height to player character)
- Slight bounce/jiggle when moving

### Personality & Behaviors

| Situation      | Bro Reaction                     |
| -------------- | -------------------------------- |
| Player idle    | Sits down, yawns, plays with hat |
| Player running | Bounces frantically to keep up   |
| Player wins    | Jumps excitedly, hat flies off   |
| Player loses   | Sad eyes, comforts player        |
| Rare drop      | Eyes go huge, sparkles           |
| Combat         | Hides behind player, peeks out   |
| Dancing        | Wiggles blob body rhythmically   |

### Cross-Game Integration

| Game      | Bro Role                                        |
| --------- | ----------------------------------------------- |
| BroStars  | Sits in audience, cheers during performances    |
| PvP Arena | Cheerleader on sidelines, reacts to kills       |
| Obby      | Follows through course, celebrates checkpoints  |
| Fishing   | Holds tiny fishing rod, gets excited at catches |
| Tycoon    | Wears hard hat, "helps" build                   |
| Horror    | Scared reactions, hides in player's pocket      |

### Customization System

| Category    | Examples                                                     |
| ----------- | ------------------------------------------------------------ |
| Hats        | Top hat, beanie, crown, pirate, chef, astronaut, flame crown |
| Faces       | Happy, sleepy, excited, grumpy, derp, cool shades            |
| Body Colors | Solid, gradients, patterns, seasonal skins                   |
| Accessories | Tiny backpacks, scarves, glasses, wings                      |

### Progression & Monetization

| Method                  | Unlocks           | Price Range      |
| ----------------------- | ----------------- | ---------------- |
| Cross-game achievements | Exclusive hats    | Free             |
| BroCoins shop           | Common/rare items | In-game currency |
| Battle pass             | Seasonal sets     | Pass price       |
| Event participation     | Limited edition   | Free             |
| Robux shop              | Premium cosmetics | 25–300 Robux     |

### Proposed Package: `@broblox/bro-companion`

```
packages/
  bro-companion/
    src/
      bro-model.ts       # 3D model/rig loading
      bro-controller.ts  # Follow behavior, reactions
      bro-customizer.ts  # Appearance management
      bro-reactions.ts   # Event-based animations
      bro-persistence.ts # Cross-game save
```

### Priority

**Candidate for Phase 7+** — Ships alongside BroBlox Hub or first game that needs a cross-game identity element. Depends on Phase 5b (pets) and Phase 6 (BroCoins, social).

---

## 20. Game Concepts

Detailed game concepts live in `ideas/game-ideas/`. Summary below with platform fit:

### BroBlox Hub (`game-ideas/broblox.md`)

The central hub game — a solar-system-inspired world where each planet is a massive block with custom gravity. Each block face is a different biome with portals to other BroBlox games. Features LittleBro progression, player homes, BroLympics events, and cross-game profiles. **Depends on:** Phase 6 (BroCoins, social) and bro-companion package.

### BroBall (`game-ideas/broball.md`)

Pet-based football management and real-time action game. Scout pets, form teams, play live matches with anime-style special moves. Exercises: `pets`, `matchmaking`, `combat`, `gacha`, `leaderboards`, `trading`. **Effort: High.**

### BroCade (`game-ideas/brocade.md`)

Arcade hub with classic-inspired real-time action minigames. Players explore an arcade, select machines, and compete for high scores. Exercises: `leaderboards`, `rewards`, `ui`, `cosmetics`. **Effort: Medium.** Good for experimentation without committing to a single genre.

### BroStars (`game-ideas/brostars.md`)

Pet collector + music creator hybrid. Collect pets that each make unique sounds, form bands, perform on stages, compete in Battle of the Bands. Exercises: `pets`, `gacha`, `audio`, `rewards`, `progression`. **Effort: High.** Unique concept with creative expression angle.

### Race Mania (`game-ideas/racemania.md`)

Fairground-style pet racing with ball-rolling scoring mechanics. Absurdly high numbers, world progression, multiplayer races. Exercises: `movement`, `pets`, `gacha`, `leaderboards`, `progression`. **Effort: Medium.**

### Next Game Priority (from Roadmap)

| Game                  | Effort | Why                                           |
| --------------------- | ------ | --------------------------------------------- |
| **PvP Arena**         | Low    | Combat + matchmaking already built            |
| **BroCade**           | Medium | Minigame hub — easy iteration, low commitment |
| **Race Mania**        | Medium | Trending genre, uses pet + movement systems   |
| **Fishing Simulator** | High   | Hugely popular genre (Fisch-style)            |
| **BroStars**          | High   | Unique concept, tests audio + pets deeply     |
| **BroBall**           | High   | Team-based, tests multiple systems            |

**Recommended first pick:** PvP Arena (lowest effort) or BroCade (most experimental flexibility).

---

## Appendix: Shared Features Across Game Concepts

Every game concept above shares common advanced feature needs. These are worth building as platform features once justified by player data:

- **Party System** — Group up with friends for co-op or competitive play
- **Spectator Mode** — Watch live games, follow top players
- **Guilds/Clans** — Shared leaderboards, chat, cosmetics (Phase 6)
- **Daily/Weekly Challenges** — Rotating objectives for engagement
- **Seasonal Events** — Limited-time content and tournaments
- **Global BroCoins** — Cross-game currency (Phase 6)
- **BroCompanion Integration** — LittleBro follows into every game (Phase 7+)
- **Unified Leaderboards** — Cross-game rankings with anti-cheat
- **Roblox Moments** — Auto-capture highlights for sharing
- **Full Accessibility** — Controller, touch, colorblind, scalable UI
