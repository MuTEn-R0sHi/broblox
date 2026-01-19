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

- Install node dependencies (`pnpm install`)
- Build/watch Roblox-TS (`pnpm build` / `pnpm dev`)
- Start Rojo server (`rojo serve`) and connect Studio

## Debugging principles

- Treat the server as the only authority for game outcomes.
- Log violations (rate limits, invalid payloads) with a correlation id.
- Keep client logs for UX and prediction debugging; do not use them as evidence.
