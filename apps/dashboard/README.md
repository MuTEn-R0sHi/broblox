# BroBlox Dashboard

Operations control plane for the BroBlox game studio.

**Live**: https://dashboard.broblox-games.com

## Features

- **GitHub OAuth** authentication
- **Feature flags** with per-environment toggles (dev/stage/prod)
- **Audit logging** for all privileged actions
- **Role-based permissions** (VIEWER, MODERATOR, ENGINEER, ADMIN)
- **REST API** for game servers to fetch flags

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: MySQL/MariaDB via Prisma 7
- **Auth**: NextAuth.js v5 with GitHub OAuth
- **Styling**: Tailwind CSS 4
- **Hosting**: Vercel

## Local Development

### Prerequisites

- Node.js 20+
- pnpm (via corepack)
- MySQL/MariaDB database

### Setup

1. Copy environment template:

   ```bash
   cp .env.example .env
   ```

2. Configure `.env`:

   ```bash
   DATABASE_URL="mysql://user:pass@host:3306/database"
   AUTH_SECRET="$(openssl rand -base64 32)"
   GITHUB_ID="your-oauth-app-client-id"
   GITHUB_SECRET="your-oauth-app-client-secret"
   ```

3. Create a GitHub OAuth App at https://github.com/settings/developers:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`

4. Install dependencies and setup database:

   ```bash
   pnpm install
   cd apps/dashboard
   pnpm prisma db push
   ```

5. Start development server:

   ```bash
   pnpm dev
   ```

6. Open http://localhost:3000

## Database Schema

```prisma
model User {
  id       String   @id @default(cuid())
  name     String?
  email    String?  @unique
  image    String?
  role     UserRole @default(VIEWER)
  // ... auth fields
}

model FeatureFlag {
  id          String  @id @default(cuid())
  name        String  @unique
  description String?
  enabledDev   Boolean @default(false)
  enabledStage Boolean @default(false)
  enabledProd  Boolean @default(false)
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // e.g., "flag.toggle.prod"
  target    String?  // e.g., "my-feature-flag"
  before    Json?
  after     Json?
  timestamp DateTime @default(now())
}
```

## API Endpoints

### GET /api/flags/:environment

Fetch feature flags for a specific environment.

**Parameters:**

- `environment`: `dev`, `stage`, or `prod`

> Note: the dashboard API uses `stage`/`prod` labels; GitHub Environments use `staging`/`production`.

**Headers (optional):**

- `x-api-key`: API key for authentication (if `FLAGS_API_KEY` is set)

**Response:**

```json
{
  "environment": "dev",
  "flags": {
    "new-lobby-ui": true,
    "double-xp-event": false
  },
  "fetchedAt": "2026-01-24T12:00:00.000Z"
}
```

**Example:**

```bash
curl https://dashboard.broblox-games.com/api/flags/dev
```

## Role Permissions

| Action              | VIEWER | MODERATOR | ENGINEER | ADMIN |
| ------------------- | ------ | --------- | -------- | ----- |
| View flags          | ✅     | ✅        | ✅       | ✅    |
| Toggle dev flags    | ❌     | ✅        | ✅       | ✅    |
| Toggle stage flags  | ❌     | ✅        | ✅       | ✅    |
| Toggle prod flags   | ❌     | ❌        | ✅       | ✅    |
| Create/delete flags | ❌     | ❌        | ✅       | ✅    |
| View audit logs     | ✅     | ✅        | ✅       | ✅    |
| Manage users        | ❌     | ❌        | ❌       | ✅    |

## Deployment

### Vercel (Recommended)

1. Import the GitHub repository to Vercel
2. Set **Root Directory** to `apps/dashboard`
3. Set **Framework Preset** to `Next.js`
4. Configure environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (your Vercel domain, e.g., `https://your-app.vercel.app`)
   - `GITHUB_ID`
   - `GITHUB_SECRET`
5. Update GitHub OAuth App callback URL to production domain

### Vercel Build Settings

The `package.json` includes:

- `postinstall`: Runs `prisma generate`
- `build`: Runs `prisma generate && next build`

## Integration with Roblox Game

```lua
-- In your Roblox game (via roblox-ts)
local HttpService = game:GetService("HttpService")

local function fetchFlags(environment: string)
    local response = HttpService:RequestAsync({
        Url = "https://dashboard.broblox-games.com/api/flags/" .. environment,
        Method = "GET",
        Headers = {
            ["x-api-key"] = "your-api-key" -- optional
        }
    })

    if response.Success then
        return HttpService:JSONDecode(response.Body)
    end
end

local flags = fetchFlags("prod")
if flags.flags["new-lobby-ui"] then
    -- Enable new lobby UI
end
```

## License

MIT - See [LICENSE](../../LICENSE)
