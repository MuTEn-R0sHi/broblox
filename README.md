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

## Versioning + releases

- We use SemVer tags (`vX.Y.Z`) for repo releases.
- See `VERSIONING.md` and `RELEASING.md`.

## License

No license has been selected yet. Until a license is added, assume **all rights reserved**.

## Docs

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

Deployment is done via lima-city (FTPS) using the GitHub Actions workflow `.github/workflows/docs-deploy-limacity.yml`.


