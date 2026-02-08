# Roblox Studio Platform

[![CI](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/ci.yml)
[![Docs](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/docs-deploy-limacity.yml/badge.svg)](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/docs-deploy-limacity.yml)
[![Dashboard](https://img.shields.io/badge/Dashboard-Live-brightgreen)](https://rbx-dashboard.vercel.app)

Docs-first Roblox-TS multi-game platform + control-plane dashboard.

## Quick Links

- **Dashboard**: https://rbx-dashboard.vercel.app
- **Documentation**: https://roshi.lima-city.de (or run `mkdocs serve` locally)

## Repo layout

```
rbx-game-platform/
├── packages/                 # 31 shared platform packages (TypeScript → Luau)
│   ├── shared-types/         # Core type definitions, Result<T>, ErrorCode
│   ├── constants/            # Numeric constants, timeouts, limits, validation helpers
│   ├── core/                 # Application lifecycle, Logger, Cleanup, collection helpers
│   ├── net/                  # Remote registry, validation, rate limiting
│   ├── data/                 # PlayerDataStore, SessionManager, persistence
│   ├── security/             # Violation detectors, trust scoring, enforcement
│   ├── observability/        # Telemetry, metrics, spans, correlation context
│   ├── config-featureflags/  # Feature flags and kill-switches
│   ├── combat/               # Weapon system, hit validation, cooldowns
│   ├── matchmaking/          # Queue management, match lifecycle, server alloc
│   ├── moderation/           # Bans/mutes, evidence model, enforcement hooks
│   ├── movement/             # Server-authoritative movement validation
│   ├── codes/                # Redeemable promo codes with expiry and limits
│   ├── leaderboards/         # Cross-game leaderboards with period support
│   ├── analytics/            # Player behavior events, funnels, sessions, retention
│   ├── notifications/        # In-game toasts, announcements, news feed
│   ├── inventory/            # Item registry, per-player slots, stacking, transfers
│   ├── progression/          # XP, levels, prestige/rebirth with curves
│   ├── quests/               # Quest/objective tracking with multi-step progress
│   ├── rewards/              # Daily login rewards, streaks, achievements
│   ├── pets/                 # Pet hatching, equipping, leveling, evolution
│   ├── gacha/                # Egg/loot box system with pity timers
│   ├── cosmetics/            # Cosmetic ownership, equip slots, validation
│   ├── battle-pass/          # Seasonal tiers, free/premium tracks, XP
│   ├── localization/         # i18n, multi-locale string registry, pluralization
│   ├── audio/                # SFX, music, spatial audio, playlists
│   ├── tutorial/             # FTUE framework, step sequencing, persistence
│   ├── world-systems/        # Day/night cycle, weather, seasons
│   ├── input/                # Unified input (keyboard, gamepad, touch)
│   ├── ui/                   # UI components, theming, layout utilities
│   └── testing/              # Test utilities and Roblox API mocks for vitest
├── games/                    # Roblox-TS game projects
│   ├── starter/              # Starter game template
│   └── obby/                 # Obby game with stages, coins, leaderboards
├── apps/                     # Web applications
│   └── dashboard/            # Next.js admin dashboard (deployed on Vercel)
├── docs/                     # MkDocs documentation site
└── tools/                    # Build and development tools
```

## Prereqs

- Node.js >= 20.11.0 (LTS recommended)
- Corepack (bundled with modern Node) for `pnpm`
- [Aftman](https://github.com/LPGhatguy/aftman) for Rojo (optional, for Roblox sync)

## Install

```bash
corepack enable
pnpm install
```

## Common commands

```bash
pnpm lint          # Run ESLint across all packages
pnpm typecheck     # Run TypeScript/roblox-ts type checking
pnpm test          # Run all tests with vitest
```

## Dashboard

The operations dashboard provides:

- **Feature flags** with per-environment toggles (dev/stage/prod)
- **Audit logging** for all privileged actions
- **Role-based permissions** (VIEWER, MODERATOR, ENGINEER, ADMIN)
- **REST API** for game servers to fetch flags

See [apps/dashboard/README.md](apps/dashboard/README.md) for setup instructions.

### Quick start (local)

```bash
cd apps/dashboard
cp .env.example .env
# Edit .env with your database and OAuth credentials
pnpm prisma db push
pnpm dev
```

## Versioning + releases

- We use SemVer tags (`vX.Y.Z`) for repo releases.
- See `VERSIONING.md` and `RELEASING.md`.

## Build workflow

### Development

```bash
# Build all packages
pnpm run build:packages

# Build starter game (builds packages first)
pnpm run build:starter

# Watch mode for development
pnpm run game:starter:dev

# Run Rojo server (in separate terminal)
pnpm run game:starter:rojo
```

### Rojo Project Files

This repository contains two Rojo project files:

| File                                 | Purpose              | When to use                                             |
| ------------------------------------ | -------------------- | ------------------------------------------------------- |
| `games/starter/default.project.json` | Starter game project | **Development** - Use this for syncing to Roblox Studio |
| `games/obby/default.project.json`    | Obby game project    | **Development** - Use this for syncing to Roblox Studio |

> **Note**: Each game has its own `default.project.json` for Rojo syncing and builds.

## Package dependency graph

```
Layer 0 — Leaf packages (zero deps)
  constants    testing    shared-types

Layer 1 — Core platform
  core (← shared-types, constants)

Layer 2 — Infrastructure
  net    data    security    observability    config-featureflags
  (all ← core)

Layer 3 — Domain systems
  combat    matchmaking    moderation    movement
  (← core + infrastructure)

Layer 4 — Ops & engagement
  codes    leaderboards    analytics    notifications
  (← core)

Layer 5a — Progression foundation
  inventory    progression    quests    rewards
  (← core)

Layer 5b — Collection & monetization
  pets    gacha    cosmetics    battle-pass
  (← core)

Layer 5c — Support systems
  localization    audio    tutorial    world-systems
  (← core)

Layer 6 — Client
  input    ui
  (← core + constants)

Games
  starter    obby
  (compose from all layers above)
```

Packages follow strict dependency direction rules enforced by ESLint. Games compose from packages; packages never depend on games.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Docs

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

Deployment is done via lima-city (FTPS) using the GitHub Actions workflow `.github/workflows/docs-deploy-limacity.yml`.
