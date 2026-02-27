# Getting started: Overview

This project is a **monorepo platform** with 32 shared packages, 2 game templates, a web dashboard, and full CI/CD.

## Intended stack

- Roblox game code: **roblox-ts** (TypeScript → Luau)
- Project sync/build: **Rojo** (filesystem → DataModel)
- Dependencies: **pnpm** workspaces
- Formatting/linting/testing: ESLint + Prettier + **vitest** (2,900+ tests across 125+ test files)
- CI/CD: GitHub Actions + Roblox **Open Cloud**
- Docs hosting: static **MkDocs** site
- Web dashboard: **Next.js** + Prisma (audit logs, config history, moderation workflow)

## Key constraints (Roblox reality)

- You cannot make Roblox "client" code cheat-proof. The goal is **server authority + detection + containment**.
- Competitive PvP requires disciplined networking and consistent simulation rules.
- roblox-ts has reserved identifiers and API restrictions — see [Platform: roblox-ts rules](../architecture/platform.md#roblox-ts-compatibility-rules).

## Golden path

1. A new game is created by copying a template folder and picking feature modules.
2. Remotes are defined once in a typed registry and automatically enforced.
3. Builds are published via CI with environment promotion (dev → stage → prod).
4. The dashboard is the control plane (RBAC + audit logs) for configuration and moderation.

## What's implemented

| Phase | Packages                                                                                                   | Status |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 1     | core, shared-types, constants, net, config-featureflags, data, security, observability, input, ui, testing | ✅     |
| 2     | combat, matchmaking                                                                                        | ✅     |
| 3     | moderation, movement                                                                                       | ✅     |
| 4     | codes, leaderboards, analytics, notifications, events                                                      | ✅     |
| 5a    | inventory, progression, quests, rewards                                                                    | ✅     |
| 5b    | pets, gacha, cosmetics, battle-pass                                                                        | ✅     |
| 5c    | localization, audio, tutorial, world-systems                                                               | ✅     |

Games: **starter** (Phase 1 template) and **obby** (checkpoint/coin game).
