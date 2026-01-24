# Getting started: Local dev

This page covers local development setup for all components.

## Docs workflow

- Create a Python venv (recommended)
- Install docs requirements
- Run MkDocs locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-docs.txt
mkdocs serve
```

If you moved/renamed the repo folder and your existing `.venv` breaks (bad interpreter path), recreate it:

```bash
rm -rf .venv
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-docs.txt
```

## Dashboard workflow

The dashboard is a Next.js application for managing feature flags and viewing audit logs.

### Prerequisites

- Node.js 20+
- pnpm (via corepack)
- MySQL/MariaDB database

### Setup

```bash
cd apps/dashboard
cp .env.example .env
# Edit .env with your credentials
```

Configure `.env`:

```bash
DATABASE_URL="mysql://user:pass@host:3306/database"
AUTH_SECRET="$(openssl rand -base64 32)"
GITHUB_ID="your-oauth-app-client-id"
GITHUB_SECRET="your-oauth-app-client-secret"
```

Create a GitHub OAuth App at https://github.com/settings/developers:

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

### Database setup

```bash
npx prisma db push
```

### Run development server

```bash
pnpm dev
# or from repo root:
pnpm --filter @rbx/dashboard dev
```

Open http://localhost:3000

## Game workflow

### 1) Install dependencies

```bash
corepack enable
pnpm install
```

### 2) Build / watch Roblox-TS

The build compiles shared packages first, then the game:

- Build once: `pnpm game:starter:build`
- Watch: `pnpm game:starter:dev`

> **Note:** `build:starter` runs `build:packages` automatically. If you only change game code (not packages), you can run `pnpm --filter @rbx/game-starter build` directly.

### 3) Rojo + Studio sync

Recommended: install Rojo via Aftman (toolchain pinned in `aftman.toml`).

```bash
aftman install
pnpm game:starter:rojo
```

The Rojo project file is `games/starter/default.project.json`.

## Debugging principles

- Treat the server as the only authority for game outcomes.
- Log violations (rate limits, invalid payloads) with a correlation id.
- Keep client logs for UX and prediction debugging; do not use them as evidence.
