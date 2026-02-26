# BroCade — Game Concept & Integration Plan

> **BroCade** is a real-time, action-focused arcade mashup game, designed for seamless integration with the Roblox-TS monorepo platform. This document outlines the core gameplay, architectural fit, and integration points with the shared platform packages.

---

## 1. Game Overview

Players enter a giant arcade hub, where they can select from a variety of classic-inspired, real-time action minigames (e.g., ladder climbing, barrel dodging, spaceship shooting). Each arcade machine represents a different game, and players jump on buttons to select and enter their chosen challenge. Once selected, players are teleported into a themed level that recreates the feel of classic arcade games, but with unique names, visuals, and mechanics to avoid conflicts.

**Core Loops:**

- Explore arcade hub → select game → play real-time action minigame → earn score → climb global leaderboards → unlock cosmetics/achievements → repeat

**Game Modes:**

- Multiple arcade-inspired minigames (platformer, shooter, etc.)
- Solo and competitive score attack

**Key Features:**

- Real-time, skill-based action gameplay in each minigame
- Unique mechanics and visuals for each arcade game
- Prominent global and friends leaderboards
- Unlockable cosmetics, badges, and achievements
- Social hub with arcade machine selection

---

## 2. Integration with Monorepo Platform

BroCade is designed to be a first-class citizen in the monorepo, leveraging shared packages and adhering to platform architecture:

- **Domain logic** in `games/brocade/` (no direct Roblox service calls)
- **Shared packages** for:
  - `@broblox/shared-types`: Player, Score, GameMode, Achievement, etc. types
  - `@broblox/data`: Player profiles, high scores, unlocks, achievements
  - `@broblox/net`: Typed remotes for game actions, leaderboard updates
  - `@broblox/security`: Anti-cheat for score validation, input checks
  - `@broblox/observability`: Telemetry for game sessions, scores, abuse signals
  - `@broblox/ui`: Arcade hub UI, leaderboard screens, minigame HUDs
  - `@broblox/config-featureflags`: Feature rollouts, tuning (e.g., event games, score multipliers)

**Game folder provides:**

- Content (maps, minigame configs, UI composition)
- Feature selection/config
- Minimal glue to boot platform services

---

## 3. Gameplay Systems (Domain Layer)

### Arcade Hub & Game Selection

- Giant arcade map with interactive machines
- Players select games by jumping on machine buttons
- Social features: see other players, chat, spectate

### Real-Time Minigames

- Each minigame is real-time and action-focused (platforming, dodging, shooting, etc.)
- Unique mechanics, hazards, and power-ups per game
- Skill-based scoring (combos, speed, accuracy)
- Server-authoritative score validation

### Leaderboards & Progression

- Global and friends leaderboards for each minigame
- Achievements and badges for milestones
- Cosmetic unlocks for high scores and participation

---

## 4. Data & State (Persistence)

- **Player profile**: High scores, unlocked cosmetics, achievements
- **Game data**: Minigame configs, score history, event participation
- **Leaderboard data**: Global and friends rankings

Use `@broblox/data` for versioned, migratable persistence. Session locking for profile safety. All grants idempotent.

---

## 5. Networking & Remotes

- All remotes defined in `@broblox/net` registry
- Typed payloads, runtime schema validation (`@rbxts/t`)
- Rate limits on score submissions, game actions
- Error codes for all failure cases
- No client-authoritative outcomes (server validates all actions and scores)

---

## 6. Observability & Telemetry

- Emit structured events for:
  - `game.*`: start, end, actions, scores
  - `economy.*`: unlocks, purchases
  - `security.*`: invalid actions, suspected abuse
- Attach correlation context (playerId, gameId, serverId, etc.)
- Use platform metrics and tracing for performance and abuse monitoring

---

## 7. Extensibility & Roadmap

- Future: Multiplayer/competitive minigames
- Future: Seasonal events, rotating arcade games
- Future: Analytics, moderation, notifications, localization

---

## 9. Advanced & Trending Feature Ideas

### Social & Community Features

- **Party System:** Group up and enter minigames together, with party chat and shared rewards.
- **Spectator Mode:** Watch friends or top players in real time, with emote reactions.
- **Guilds/Clans:** Form arcade clubs with shared leaderboards, club chat, and exclusive cosmetics.
- **Friend Challenges:** Send score challenges to friends; async or live duels.

### Engagement & Retention

- **Daily/Weekly Challenges:** Rotating objectives (e.g., “Score 10,000 in Space Blaster”) for bonus rewards.
- **Seasonal Events:** Limited-time minigames, event leaderboards, and exclusive unlocks.
- **Progression Tracks:** Level up your arcade profile to unlock new machines, cosmetics, and emotes.
- **Achievements:** Tiered badges for skill, participation, and social play.

### Monetization (Ethical)

- **Cosmetics-Only Shop:** Skins for avatars, arcade machines, minigame effects, and emotes.
- **Battle Pass:** Free and premium tracks with cosmetics, currency, and boosters.
- **Gacha Capsules:** Random cosmetic drops with clear odds and dupe protection.
- **VIP Club:** Monthly subscription for bonus cosmetics, exclusive machines, and party features.

### Gameplay & Mechanics

- **Procedural Minigame Variants:** Randomized layouts, hazards, or power-ups for replayability.
- **Skill Combos:** Chaining actions (e.g., perfect jumps, enemy streaks) for score multipliers.
- **Power-Ups:** Temporary boosts (e.g., invincibility, double points) earned or found in-game.
- **User-Generated Content:** Community minigame builder, with voting and featured slots.

### Platform Integration

- **Global BroCoins Currency:** Earned in BroCade, spendable on cross-game cosmetics.
- **BroCompanion Support:** Your Bro follows you in the arcade, reacts to wins/losses, and can be customized.
- **Unified Leaderboards:** Daily, weekly, and all-time, with anti-cheat and replay validation.
- **Roblox Moments Integration:** Auto-capture and share highlight clips (e.g., new high score, rare unlock).

### Accessibility & Inclusivity

- **Input Options:** Full controller, touch, and keyboard support; remappable controls.
- **Visual Modes:** Colorblind, high-contrast, and scalable UI.
- **Assist Modes:** Optional slow-motion or invincibility for younger or new players.

### Future/Extensible Features

- **Cross-Game Events:** Compete in BroCade for rewards usable in other BroBlox games.
- **Voice Chat:** Proximity or party voice for social play (with moderation).
- **Analytics Dashboard:** Track player retention, engagement, and event participation for live ops.

---

## 8. References & Related Docs

- [Platform README](../../README.md)
- [Architecture: Folders & Packages](../../docs/architecture/folders-and-packages.md)
- [Clean Architecture](../../docs/architecture/clean-architecture.md)
- [Platform Package List](../../docs/architecture/platform.md)
- [Networking](../../docs/architecture/networking.md)
- [State & Data](../../docs/architecture/state-and-data.md)
- [Observability](../../docs/architecture/observability.md)
- [Config & Validation](../../docs/architecture/config-schema-and-validation.md)
- [Ideas Reference](../IDEAS.md)
