# Tooling & commands

This page is a quick index of the most common commands used in this repo.

## Node + pnpm

One-time setup:

- `corepack enable`
- `pnpm install`

Repo checks:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Starter game (Roblox-TS)

Build once:

- `pnpm game:starter:build`

Watch compile:

- `pnpm game:starter:dev`

## Rojo + Studio sync (starter)

Toolchain (recommended):

- `aftman install`

Start Rojo server:

- `pnpm game:starter:rojo`

Rojo project file:

- `games/starter/default.project.json`

## Dashboard

From `apps/dashboard`:

- `pnpm dev`
- `pnpm build`
- `pnpm start`

Or from repo root:

- `pnpm --filter @rbx/dashboard dev`
