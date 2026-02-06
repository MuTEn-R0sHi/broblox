# Architecture: Platform

## What "platform" means here

A reusable set of packages and conventions that every game uses.

### Core Packages (Implemented ✅)

| Package               | Purpose                                                         | Phase |
| --------------------- | --------------------------------------------------------------- | ----- |
| `core`                | Lifecycle, DI/container, logging, utilities, collection helpers | 1     |
| `shared-types`        | IDs, enums, DTOs, error codes, Result types                     | 1     |
| `constants`           | Numeric constants, validation helpers                           | 1     |
| `net`                 | Remote registry, validation, rate limiting, versioning          | 1     |
| `config-featureflags` | Runtime configs, rollouts, kill-switches                        | 1     |
| `data`                | Persistence layer, session locking, DataStore patterns          | 1     |
| `security`            | Authority rules, anti-abuse instrumentation, trust scoring      | 1     |
| `observability`       | Telemetry, metrics, spans, correlation context                  | 1     |
| `input`               | Device-agnostic input handling, rebindable actions              | 1     |
| `ui`                  | UI components, theming, device-aware layout                     | 1     |
| `combat`              | Weapon system, hit validation, damage calculation               | 2     |
| `matchmaking`         | Queue management, match lifecycle, server allocation            | 2     |
| `moderation`          | Bans/mutes, evidence model, enforcement hooks                   | 3     |
| `movement`            | Server-authoritative movement validation, anti-cheat            | 3     |
| `codes`               | Redeemable promo codes with expiry and limits                   | 4     |
| `leaderboards`        | Cross-game leaderboards with period support                     | 4     |
| `analytics`           | Player behavior events, funnels, retention tracking             | 4     |
| `notifications`       | In-game toasts, announcements, news feed                        | 4     |
| `inventory`           | Base item/slot system with stacking and weight                  | 5a    |
| `progression`         | XP, levels, prestige/rebirth with configurable curves           | 5a    |
| `quests`              | Quest and objective tracking with multi-step progress           | 5a    |
| `rewards`             | Daily login rewards, streaks, achievements                      | 5a    |
| `pets`                | Pet hatching, equipping, leveling, evolution                    | 5b    |
| `gacha`               | Loot box / gacha with pity timers and banners                   | 5b    |
| `cosmetics`           | Cosmetic items, skins, appearance customization                 | 5b    |
| `battle-pass`         | Seasonal battle pass with tiers and reward tracks               | 5b    |
| `localization`        | i18n — multi-locale strings, interpolation, pluralization       | 5c    |
| `audio`               | SFX, music, spatial audio, playlists, volume management         | 5c    |
| `tutorial`            | FTUE framework, guided onboarding, step persistence             | 5c    |
| `world-systems`       | Day/night cycle, weather, seasons                               | 5c    |

**31 packages** total across 7 implementation phases.

### Planned Packages (Roadmap)

- `economy`: Currency management, shops, pricing strategies (Phase 6)
- `trading`: Player-to-player item trading with escrow (Phase 6)
- `social`: Friends, parties, guilds, social feed (Phase 6)
- `bro-companion`: Cross-game mascot system — The Bro follows players everywhere (Phase 7+)

## Trust boundaries

- **Client**: input + visuals + prediction only
- **Server**: authoritative state + decisions
- **Dashboard**: privileged ops actions (RBAC + audit logs)

## Project-level invariants

- Game code may depend on platform packages.
- Platform packages must not import game-specific code.
- Any code that crosses a trust boundary must have:
  - schema validation
  - rate limits
  - structured error codes

## roblox-ts compatibility rules

When writing package code that compiles via roblox-ts (`rbxtsc`):

- **Do not** use `Object.keys()`, `Object.entries()`, or `Object.values()` — use `pairs()` iteration instead.
- **Do not** use Lua reserved identifiers as variable/parameter names: `next`, `table`, `select`, `type`, `error`, `print`, `warn`, `require`, `pcall`, `xpcall`, `unpack`, `coroutine`, `string`, `debug`, `tick`.
- **Do not** use `for...in` loops — roblox-ts forbids them.
- **Do** use `for (const [k, v] of pairs(obj))` or manual index loops (`for (let i = 0; i < arr.size(); i++)`).
- **Do** use `.size()` instead of `.length` on arrays and strings.
- **Do** use `tostring()`, `tonumber()`, `pcall()` as Lua globals — they are available at runtime.
- All package `tsconfig.roblox.json` files must include `downlevelIteration: true` for `pairs()` compatibility.

## Competitive PvP posture

- Server determines hits/damage and validates movement constraints.
- Client may propose intent (aim, fire, ability activation), never outcomes.
