# Roblox Studio Platform

[![CI](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/ci.yml)
[![Docs](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/docs-deploy-limacity.yml/badge.svg)](https://github.com/MuTEn-R0sHi/rbx-game-platform/actions/workflows/docs-deploy-limacity.yml)

Docs-first Roblox-TS multi-game platform + control-plane dashboard.

## Repo layout

```
rbx-game-platform/
├── packages/              # Shared platform packages (TypeScript → Luau)
│   ├── shared-types/      # Core type definitions, Result<T>, ErrorCode
│   ├── constants/         # Numeric constants (timeouts, limits, build info)
│   ├── core/              # Application lifecycle, Logger, Cleanup utilities
│   ├── net/               # Remote registry, validation, rate limiting
│   ├── data/              # PlayerDataStore, SessionManager, persistence
│   ├── security/          # Violation detectors, trust scoring, enforcement
│   ├── observability/     # Telemetry, metrics, spans, correlation context
│   ├── input/             # Unified input (keyboard, gamepad, touch)
│   ├── ui/                # UI components, theming, layout utilities
│   ├── config-featureflags/  # Feature flags and kill-switches
│   └── testing/           # Test utilities and mocks for vitest
├── games/                 # Roblox-TS game projects
│   └── starter/           # Starter game template
├── apps/                  # Web applications
│   └── dashboard/         # Next.js admin dashboard
├── docs/                  # MkDocs documentation site
└── tools/                 # Build and development tools
```

## Prereqs

- Node.js 20+ (LTS recommended)
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

| File                                 | Purpose               | When to use                                                           |
| ------------------------------------ | --------------------- | --------------------------------------------------------------------- |
| `games/starter/default.project.json` | Game-specific project | **Development (recommended)** - Use this for syncing to Roblox Studio |
| `/default.project.json`              | Monorepo root project | **CI/tooling only** - Used for sourcemap generation and validation    |

> **Note**: Always use `games/starter/default.project.json` for active game development. The root project file exists primarily for monorepo-level tooling and CI checks.

## Package dependency graph

```
constants (0 deps)          testing (vitest only)
     ↓
shared-types
     ↓
   core
     ↓
┌────┴────┬─────────┬──────────┬──────────┐
│         │         │          │          │
net   data    security   observability   config-featureflags
│         │         │          │
│    ┌────┴─────────┴──────────┘
│    │
input   ui
│    │
└────┴──→ games/starter
```

Packages follow strict dependency direction rules. Games compose from packages; packages never depend on games.

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
