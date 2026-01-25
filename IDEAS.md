# BroBlox Platform — Ideas & Roadmap Brainstorm

> **Purpose:** Capture feature ideas, monetization patterns, and game mechanics for future development phases.
> Some items already have docs in `docs/modules/` — this file is for early brainstorming.

---

## 1. Ranking & Rarity Systems

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

## 2. Core Game Systems

### Pets & Mounts

- **Pet System** — Collectible companions with passive bonuses (luck, speed, damage multipliers)
- **Mounting System** — Ride pets for movement (ground, flying, swimming, diving)
- **Pet Evolution** — Combine/fuse pets for higher tiers
- **Pet Equipment** — Equip accessories to boost pet stats

### Eggs & Hatching

- **Egg Types** — Tied to biomes, events, or shops
- **Hatching Mechanics** — Time-based, click-based, or walk-based
- **Pity System** — Guaranteed rare after X hatches (anti-frustration)
- **Shiny/Golden Variants** — Cosmetic variants with small stat boosts

### Environment Systems

- **Day/Night Cycle** — Affects spawns, events, lighting
- **Weather System** — Rain, snow, storms with gameplay effects
- **Seasons** — Rotating content tied to real-world or in-game calendar
- **Biomes/Worlds** — Distinct zones with unique resources, enemies, aesthetics

### Mutations & Variants

- **Mutations** — Random modifiers on drops (shiny, corrupted, blessed, etc.)
- **Auras** — Visual effects tied to rarity or achievement
- **Enchantments** — Stat modifiers applied to items

---

## 3. Progression & Economy

### Item System (Diablo-style depth)

- **Item Quality** — Normal → Magic → Rare → Unique → Set → Runeword
- **Affixes** — Prefix/suffix modifiers (e.g., "Blazing Sword of the Whale")
- **Sockets** — Embed gems/runes for customization
- **Item Level** — Determines affix pool and stat rolls
- **Durability** — Optional wear system requiring repairs

### Trading System

> See: `docs/modules/trading.md`

- **Player-to-Player Trading** — Secure trade window with confirmation
- **Auction House** — List items for sale (optional, can be exploited)
- **Trade History** — Audit log for scam prevention

### Currencies

- **Game-Specific Currency** — Earned through gameplay (coins, gems, tokens)
- **Premium Currency** — Purchased with Robux (crystals, diamonds)
- **Global BroCoins** — Cross-game currency (see Unified Features below)

---

## 4. Monetization Patterns (Ethical)

### Battle Pass

> See: `docs/modules/battle-pass.md`

- Free and premium tracks
- Earnable through gameplay, not just time gates
- No FOMO — past seasons purchasable at discount

### Daily Rewards

> See: `docs/modules/daily-rewards.md`

- Streak bonuses with forgiveness (miss 1 day, keep streak)
- Milestone rewards at 7, 14, 30 days

### Cosmetics

> See: `docs/modules/cosmetics.md`

- Skins, trails, auras, titles, emotes
- No pay-to-win — cosmetic only

### Gacha/Loot Boxes (if applicable)

- Display exact odds
- Pity system mandatory
- No duplicates or dupe protection

---

## 5. Social & Community Features

### Roblox Moments Integration

Leverage Roblox's native recording feature:

- In-game highlight triggers (epic kills, rare drops, clutch moments)
- Share to feed with game context
- Leaderboard of most-shared clips

### Guilds/Clans

- Create/join guilds with shared progress
- Guild wars, raids, leaderboards
- Guild-exclusive cosmetics

### Leaderboards

- Daily, weekly, seasonal, all-time
- Per-game and cross-game (BroBlox global)
- Anti-cheat validation before posting

### Codes System

- Redeemable codes for rewards
- Dashboard UI for creating/managing codes
- Expiration and usage limits

---

## 6. World Generation & Theming

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

## 7. Unified BroBlox Platform Features

### Global BroCoins Currency

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

## 8. Event Systems

### Admin Abuse Events (Chaos Mode)

- Scheduled or surprise events
- Admins spawn enemies, change gravity, give buffs
- Loot piñatas, boss raids, minigames

### Seasonal Events

- Holiday themes (Halloween, Christmas, etc.)
- Limited-time items and challenges
- Event pass with exclusive rewards

### World Bosses

- Server-wide boss spawns
- Contribution-based rewards
- Scheduled or triggered by player activity

---

## 9. Game Genre Ideas

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

> Phase 2 complete — see `docs/roadmap/phase-2-pvp-alpha.md`

- Ranked matchmaking
- Multiple game modes (TDM, FFA, CTF)
- Seasonal rankings with rewards

---

## 10. Platform & Tooling Ideas

### Feature Demos

- Dedicated demo space per system
- Interactive testing for developers
- Documentation links in-world

### BroBlox Website/App

Expand beyond docs site:

- Game directory with trailers
- Wiki pages per game
- Leaderboards and player lookup
- News and patch notes
- Code redemption portal
- Creator dashboard

### Analytics Dashboard

- Player retention metrics
- Monetization funnels
- A/B test results
- Error and crash tracking

---

## 11. Technical Debt & Infrastructure

### Performance Budgets

- Frame time limits per system
- Memory caps for pets/particles
- LOD system for large worlds

### Anti-Cheat Enhancements

> See: `packages/security/`

- Server-side validation for all actions
- Anomaly detection (speed, teleport, damage)
- Trust scoring with escalation

### Cross-Server Features

- MessagingService for global events
- DataStore versioning and migrations
- Reserved server orchestration

---

## Priority Candidates for Phase 3+

1. **Pet System** — High engagement, proven monetization
2. **Egg/Gacha System** — Drives retention loops
3. **Guild System** — Social stickiness
4. **Procedural Worlds** — Replayability
5. **Global BroCoins** — Cross-game ecosystem lock-in

---

_Last updated: 2026-01-25_
