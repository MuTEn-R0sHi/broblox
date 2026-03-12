# Dashboard: Tech Stack

This page documents technology choices and deployment for the operations dashboard.

## Overview

The dashboard is the **multi-game control plane** for:

- **Game registry** - Register Roblox experiences with per-environment universe IDs and place IDs
- **Feature flags** - Global and per-game flag toggles across dev / stage / prod environments
- **Moderation** - Cross-game bans, mutes, evidence, and appeals workflow
- **Audit logging** - Complete history of privileged actions (with game scope)
- **Role-based access** - VIEWER, SUPPORT, MODERATOR, ENGINEER, ADMIN roles
- **Configuration API** - REST endpoint consumed by game servers, scoped by game or universe ID

**Live Dashboard**: https://dashboard.broblox-games.com

## Tech Stack

### Frontend

| Component  | Technology                     |
| ---------- | ------------------------------ |
| Framework  | Next.js 16 (App Router)        |
| Language   | TypeScript                     |
| Styling    | Tailwind CSS 4                 |
| Components | Custom (inspired by shadcn/ui) |
| Build      | Turbopack                      |

### Backend

| Component | Technology                          |
| --------- | ----------------------------------- |
| API       | Next.js API Routes + Server Actions |
| Database  | MySQL/MariaDB                       |
| ORM       | Prisma 7 with MariaDB adapter       |
| Auth      | NextAuth.js v5 (Auth.js)            |

### Infrastructure

| Component | Provider         |
| --------- | ---------------- |
| Hosting   | Vercel           |
| Database  | lima-city MySQL  |
| OAuth     | GitHub OAuth App |

## Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(VIEWER)
  accounts      Account[]
  sessions      Session[]
  auditLogs     AuditLog[]
}

enum Role {
  VIEWER
  SUPPORT
  MODERATOR
  ENGINEER
  ADMIN
}

model Game {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  description      String?
  iconUrl          String?
  // Per-environment Roblox identifiers
  universeIdDev    BigInt?
  universeIdStage  BigInt?
  universeIdProd   BigInt?
  placeIdDev       BigInt?
  placeIdStage     BigInt?
  placeIdProd      BigInt?
  isActive         Boolean  @default(true)
  createdById      String
  createdBy        User     @relation(fields: [createdById], references: [id])
  flags            FeatureFlag[]
  bans             Ban[]
  matches          Match[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model FeatureFlag {
  id           String   @id @default(cuid())
  key          String
  description  String?
  gameId       String?  // null = global flag
  game         Game?    @relation(fields: [gameId], references: [id])
  enabledDev   Boolean  @default(false)
  enabledStage Boolean  @default(false)
  enabledProd  Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@unique([key, gameId]) // global flags: (key, null); game flags: (key, gameId)
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  gameId    String?  // null = platform-level action, set = game-scoped action
  action    String   // e.g., "flag.toggle.prod", "game.create"
  target    String?  // e.g., flag key, game slug
  before    Json?    // previous state
  after     Json?    // new state
  reason    String?
  timestamp DateTime @default(now())
  ipHash    String?
  userAgent String?
}
```

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Dashboard  │────▶│   GitHub    │
│             │◀────│  (NextAuth) │◀────│   OAuth     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Database  │
                    │   (MySQL)   │
                    └─────────────┘
```

1. User clicks "Sign in with GitHub"
2. NextAuth redirects to GitHub OAuth
3. User authorizes the application
4. GitHub redirects back with auth code
5. Dashboard exchanges code for tokens
6. User record created/updated in database
7. Session cookie set in browser

## API Endpoints

### GET /api/flags/:environment

Fetch feature flags for a specific environment. Optionally scope to a registered game.
Global flags are always included; game-specific flags shadow global flags on key conflict.

**Request (global flags):**

```http
GET /api/flags/prod HTTP/1.1
Host: dashboard.broblox-games.com
x-api-key: optional-api-key
```

**Request (game-scoped flags by universe ID):**

```http
GET /api/flags/prod?universeId=123456789 HTTP/1.1
Host: dashboard.broblox-games.com
x-api-key: optional-api-key
```

**Request (game-scoped flags by dashboard game ID):**

```http
GET /api/flags/prod?gameId=cld123abc HTTP/1.1
```

**Response:**

```json
{
  "environment": "prod",
  "flags": {
    "new-lobby-ui": true,
    "double-xp-event": false,
    "maintenance-mode": false
  },
  "fetchedAt": "2026-01-24T12:00:00.000Z"
}
```

### Roblox Integration Example

Pass your universe ID to get game-scoped flags merged with globals:

```lua
local HttpService = game:GetService("HttpService")

local function fetchFlags(environment: string)
    local universeId = game.GameId -- Roblox universe ID
    local response = HttpService:RequestAsync({
        Url = "https://dashboard.broblox-games.com/api/flags/"
              .. environment
              .. "?universeId=" .. tostring(universeId),
        Method = "GET",
        Headers = {
            ["x-api-key"] = "your-api-key" -- optional
        }
    })

    if response.Success then
        return HttpService:JSONDecode(response.Body)
    end
end
```

## Deployment

### Environment Variables

| Variable                | Required  | Description                                                                                    |
| ----------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | ✅        | MySQL connection string                                                                        |
| `AUTH_SECRET`           | ✅        | NextAuth secret (32+ chars)                                                                    |
| `AUTH_URL`              | ✅ (prod) | Production URL for OAuth callbacks                                                             |
| `GITHUB_ID`             | ✅        | GitHub OAuth App client ID                                                                     |
| `GITHUB_SECRET`         | ✅        | GitHub OAuth App client secret                                                                 |
| `ALLOWED_GITHUB_USERS`  | ❌        | Optional login allowlist (comma-separated GitHub usernames)                                    |
| `ADMIN_GITHUB_USERS`    | ❌        | Optional admin bootstrap (comma-separated GitHub usernames)                                    |
| `DASHBOARD_ALLOWED_IPS` | ❌        | Optional IP allowlist for operator routes (comma-separated; exact IPs and IPv4 CIDR supported) |
| `FLAGS_API_KEY`         | ❌        | Optional API key for flag endpoint (recommended in production)                                 |

### Vercel Setup

1. Import repository from GitHub
2. Set **Root Directory** to `apps/dashboard`
3. Set **Framework Preset** to `Next.js`
4. Add environment variables
5. Deploy

### Build Commands

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build",
    "dev": "next dev",
    "start": "next start"
  }
}
```

## Security Considerations

- All routes require authentication (except health check and flags API)
- RBAC enforced server-side (never trust client)
- Audit logs are append-only (no UPDATE/DELETE in application code)
- Sensitive actions require elevated roles
- Distributed rate limiting protects against abuse (persists across cold starts via database-backed state)
- CSRF protection via double-submit cookie pattern (see below)

### CSRF Protection

The dashboard is designed to use an explicit double-submit cookie for CSRF protection on mutating browser-facing API routes.

- **Token generation**: `ensureCsrfCookie(request, response)` runs in Edge middleware using the Web Crypto API (`crypto.getRandomValues`) for Edge runtime compatibility.
- **Cookie scope**: Set on browser page requests only — API routes (`/api/*`) are skipped to avoid unnecessary `Set-Cookie` headers on high-QPS game-server endpoints.
- **Validation**: Mutating API routes called from the browser should call `validateCsrf(request)` to compare the cookie value against the `x-csrf-token` header using constant-time XOR comparison.
- **Not in layout**: Cookies cannot be set during React Server Component render (Next.js restriction). The CSRF cookie is set exclusively in `middleware.ts`.

### BigInt Serialization

Prisma returns Roblox universe IDs, place IDs, and player IDs as `BigInt`. Next.js RSC protocol cannot JSON-serialize `BigInt` values — this causes `TypeError: Do not know how to serialize a BigInt` at runtime.

Patterns used:

- **Select + convert**: Use Prisma `select` to fetch only needed fields, then convert BigInt IDs to `string`, `boolean`, or `Number()` before passing to components.
- **DB-side aggregation**: Use `$queryRaw` with `COUNT(DISTINCT ...)` instead of `findMany` + `distinct` + `.length` for counting unique values.

### Rate Limiting

Distributed rate limiting is implemented in `middleware.ts` and the rate‑limit library. Unlike the previous in-memory limiter, state persists across cold starts and is shared across Vercel serverless instances via the database.

## Observability Integration

The dashboard ingests telemetry events from game servers via the `/api/telemetry` endpoint. Events are sent by the `@broblox/observability` HTTP sink in configurable batches.

The `/telemetry` dashboard page displays:

- **KPI cards**: Active Players (1h), Active Servers (1h), Events (24h), Errors (24h)
- **Category breakdown**: event counts grouped by category
- **Recent events stream**: filterable by environment, category, and level

## Future Enhancements

- [ ] Roblox OAuth (in addition to GitHub)
- [ ] Configuration profiles (groups of flags)
- [ ] Scheduled flag changes
- [ ] Flag targeting (% rollout, user segments)
- [ ] Webhook notifications for changes
- [ ] Game-scoped filter UI for matches, audit, and moderation pages
