# Dashboard: Tech Stack

This page documents technology choices and deployment for the operations dashboard.

## Overview

The dashboard is the control plane for:

- **Feature flags** - Per-environment toggles for game features
- **Audit logging** - Complete history of privileged actions
- **Role-based access** - VIEWER, SUPPORT, MODERATOR, ENGINEER, ADMIN roles
- **Configuration API** - REST endpoint for game servers

**Live Dashboard**: https://rbx-dashboard.vercel.app

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

model FeatureFlag {
  id           String   @id @default(cuid())
  name         String   @unique
  description  String?
  enabledDev   Boolean  @default(false)
  enabledStage Boolean  @default(false)
  enabledProd  Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String   // e.g., "flag.toggle.prod", "flag.create"
  target    String?  // e.g., flag name
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

Fetch feature flags for a specific environment.

**Request:**

```http
GET /api/flags/prod HTTP/1.1
Host: rbx-dashboard.vercel.app
x-api-key: optional-api-key
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

```lua
local HttpService = game:GetService("HttpService")

local function fetchFlags(environment: string)
    local response = HttpService:RequestAsync({
        Url = "https://rbx-dashboard.vercel.app/api/flags/" .. environment,
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

| Variable               | Required  | Description                                                    |
| ---------------------- | --------- | -------------------------------------------------------------- |
| `DATABASE_URL`         | ✅        | MySQL connection string                                        |
| `AUTH_SECRET`          | ✅        | NextAuth secret (32+ chars)                                    |
| `AUTH_URL`             | ✅ (prod) | Production URL for OAuth callbacks                             |
| `GITHUB_ID`            | ✅        | GitHub OAuth App client ID                                     |
| `GITHUB_SECRET`        | ✅        | GitHub OAuth App client secret                                 |
| `ALLOWED_GITHUB_USERS` | ❌        | Optional login allowlist (comma-separated GitHub usernames)    |
| `ADMIN_GITHUB_USERS`   | ❌        | Optional admin bootstrap (comma-separated GitHub usernames)    |
| `FLAGS_API_KEY`        | ❌        | Optional API key for flag endpoint (recommended in production) |

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
- Rate limiting recommended for production

## Future Enhancements

- [ ] Roblox OAuth (in addition to GitHub)
- [ ] Configuration profiles (groups of flags)
- [ ] Scheduled flag changes
- [ ] Flag targeting (% rollout, user segments)
- [ ] Webhook notifications for changes
- [ ] Multi-game support
