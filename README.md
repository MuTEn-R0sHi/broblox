# Roblox Studio Platform

Docs-first Roblox-TS multi-game platform + control-plane dashboard.

## Repo layout

- `packages/*`: shared platform packages (pure TypeScript, no Roblox services)
- `games/*`: Roblox-TS game projects (compiled to Luau)
- `apps/*`: web apps (dashboard)
- `docs/*`: MkDocs site (architecture + runbooks)

## Prereqs

- Node.js (LTS recommended)
- Corepack (bundled with modern Node) for `pnpm`

## Install

```bash
corepack enable
pnpm install
```

## Common commands

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Docs

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```
