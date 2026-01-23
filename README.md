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

### Which Rojo config to use?

- **`games/starter/default.project.json`**: Use this for game development (recommended)
- **`/default.project.json`**: Root project for testing monorepo structure

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
