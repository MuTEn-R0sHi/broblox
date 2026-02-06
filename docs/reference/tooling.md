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

## Docs

Local preview:

- `python -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements-docs.txt`
- `mkdocs serve`

Deploy:

- Deployment is handled by the GitHub Actions workflow `.github/workflows/docs-deploy-limacity.yml`
- Setup details: `docs/reference/docs-deployment.md`

## Starter game (Roblox-TS)

Build once:

- `pnpm game:starter:build`

Watch compile:

- `pnpm game:starter:dev`

## Obby game (Roblox-TS)

Build once:

- `pnpm game:obby:build`

Watch compile:

- `pnpm game:obby:dev`

## Rojo + Studio sync

Toolchain (recommended):

- `aftman install`

Start Rojo server (starter):

- `pnpm game:starter:rojo`

Start Rojo server (obby):

- `pnpm game:obby:rojo`

Rojo project files:

- `games/starter/default.project.json`
- `games/obby/default.project.json`

## Dashboard

From `apps/dashboard`:

- `pnpm dev`
- `pnpm build`
- `pnpm start`

Or from repo root:

- `pnpm --filter @rbx/dashboard dev`
