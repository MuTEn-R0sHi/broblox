# Getting started: Local dev

This page will expand once the code scaffold exists. For now, it defines the intended local workflow.

## Docs workflow (already usable)

- Create a Python venv (recommended)
- Install docs requirements
- Run MkDocs locally

Expected commands:

- `python -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements-docs.txt`
- `mkdocs serve`

## Game workflow (planned)

This is now scaffolded for the `games/starter` project.

### 1) Install dependencies

- `corepack enable`
- `pnpm install`

### 2) Build / watch Roblox-TS

- Build once: `pnpm game:starter:build`
- Watch: `pnpm game:starter:dev`

### 3) Rojo + Studio sync

Recommended: install Rojo via Aftman (toolchain pinned in `aftman.toml`).

- Install tools: `aftman install`
- Start Rojo: `pnpm game:starter:rojo`

The Rojo project file is:

- `games/starter/default.project.json`

## Debugging principles

- Treat the server as the only authority for game outcomes.
- Log violations (rate limits, invalid payloads) with a correlation id.
- Keep client logs for UX and prediction debugging; do not use them as evidence.
