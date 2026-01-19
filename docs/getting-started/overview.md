# Getting started: Overview

This project is a **docs-first** platform. The docs define the architecture; the code will follow.

## Intended stack

- Roblox game code: **Roblox-TS** (TypeScript → Luau)
- Project sync/build: Rojo (filesystem → DataModel)
- Dependencies: npm/pnpm (and optionally Wally later for Luau packages)
- Formatting/linting/testing: ESLint/Prettier + (later) Roblox-side tests
- CI/CD: GitHub Actions + Roblox **Open Cloud**
- Docs hosting: static MkDocs site deployed to external hosting (not GitHub Pages)
- Web dashboard: Next.js + Postgres (audit logs, config history, moderation workflow)

## Key constraints (Roblox reality)

- You cannot make Roblox “client” code cheat-proof. The goal is **server authority + detection + containment**.
- Competitive PvP requires disciplined networking and consistent simulation rules.

## Golden path (what should be true later)

1. A new game can be created by copying a template folder and picking feature modules.
2. Remotes are defined once in a typed registry and automatically enforced.
3. Builds are published via CI with environment promotion (dev → stage → prod).
4. The dashboard is the control plane (RBAC + audit logs) for configuration and moderation.
