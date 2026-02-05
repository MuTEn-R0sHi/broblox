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

# Production URL (required for OAuth redirects in production)
# For local dev you can usually omit this.
# AUTH_URL="http://localhost:3000"

GITHUB_ID="your-oauth-app-client-id"
GITHUB_SECRET="your-oauth-app-client-secret"

# Optional: API key for game servers fetching feature flags from the dashboard
# Recommended for production.
# FLAGS_API_KEY="$(openssl rand -base64 32)"

# Optional: restrict logins to specific GitHub usernames (comma-separated)
# ALLOWED_GITHUB_USERS="your-github-handle,teammate-handle"

# Optional: bootstrap ADMIN role for initial setup (comma-separated)
# This is useful when you're the only operator and all new users default to VIEWER.
ADMIN_GITHUB_USERS="your-github-handle"

# Optional: restrict operator access by IP (comma-separated)
# Supports exact IPs and IPv4 CIDR ranges.
# DASHBOARD_ALLOWED_IPS="203.0.113.10,198.51.100.0/24"
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

### First login and roles

- New users default to `VIEWER`, which only shows basic navigation.
- If you set `ADMIN_GITHUB_USERS`, sign out/in after setting it so the role is applied.
- Once you're Admin, manage roles at `/dashboard/users`.

## Game workflow

### Available Games

- **starter** - Base template game for new projects
- **obby** - Obstacle course game with stages, checkpoints, and coins

### 1) Install dependencies

```bash
corepack enable
pnpm install
```

### 2) Build / watch Roblox-TS

The build compiles shared packages first, then the game:

**Starter Game:**

- Build once: `pnpm game:starter:build`
- Watch: `pnpm game:starter:dev`

**Obby Game:**

- Build once: `pnpm --filter @rbx/game-obby build`
- Watch: `pnpm --filter @rbx/game-obby dev`

> **Note:** `build:starter` runs `build:packages` automatically. If you only change game code (not packages), you can run `pnpm --filter @rbx/game-starter build` directly.

### 3) Rojo + Studio sync

Recommended: install Rojo via Aftman (toolchain pinned in `aftman.toml`).

**Starter Game:**

```bash
aftman install
pnpm game:starter:rojo
```

**Obby Game:**

```bash
aftman install
cd games/obby && pnpm rojo:serve
```

The Rojo project file is `games/starter/default.project.json`.

## Debugging principles

- Treat the server as the only authority for game outcomes.
- Log violations (rate limits, invalid payloads) with a correlation id.
- Keep client logs for UX and prediction debugging; do not use them as evidence.
