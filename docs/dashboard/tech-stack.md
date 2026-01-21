```markdown
# Dashboard: Tech stack

This page documents technology choices and deployment strategy for the operations dashboard.

## Purpose

The dashboard is the control plane for:

- Configuration management (feature flags, gameplay tuning)
- Release management (publish/promote visibility)
- Moderation workflows (bans, mutes, reports)
- Observability (security signals, match health, economy metrics)
- Audit logs (all privileged actions)

## Tech stack

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix primitives)
- **State**: React Server Components + minimal client state (Zustand if needed)

### Backend

- **API**: Next.js API routes (or separate tRPC layer if needed)
- **Database**: PostgreSQL (via Prisma ORM)
- **Auth**: Roblox OAuth 2.0 (see below)
- **Background jobs**: Vercel Cron or separate worker (Phase 3+)

### Infrastructure

- **Hosting**: Vercel (primary) or self-hosted (Docker)
- **Database hosting**: Supabase / Neon / Railway / self-managed Postgres
- **Secrets**: Environment variables via hosting platform
- **Docs site**: Static MkDocs on lima-city (separate from dashboard)

## Authentication

### Roblox OAuth 2.0

Users authenticate via Roblox OAuth:

1. User clicks "Sign in with Roblox"
2. Redirect to Roblox OAuth consent screen
3. Roblox returns authorization code
4. Dashboard exchanges code for access token
5. Dashboard fetches user profile (userId, username)
6. Dashboard creates or updates internal operator record

### Identity mapping

```typescript
// Operator record
interface Operator {
  id: string;                // internal UUID
  robloxUserId: number;      // from OAuth
  robloxUsername: string;    // display only
  roles: Role[];             // RBAC roles
  createdAt: Date;
  lastLoginAt: Date;
}
```

### Allowlist enforcement

Not all Roblox users can access the dashboard:

- **Phase 1-2**: Manual allowlist (robloxUserId in database)
- **Phase 3+**: Optional group membership check via Roblox API

Unauthorized users see "Access denied" after OAuth completes.

## Authorization (RBAC)

Roles are defined in `docs/dashboard/rbac-and-audit.md`. Implementation:

- Roles stored in database per operator
- Middleware checks role before each protected route
- Frontend hides UI for unauthorized actions (defense in depth)

## Database schema (initial)

```sql
-- Operators
CREATE TABLE operators (
  id UUID PRIMARY KEY,
  roblox_user_id BIGINT UNIQUE NOT NULL,
  roblox_username TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Audit logs (append-only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  operator_id UUID REFERENCES operators(id),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  request_id TEXT,
  ip_hash TEXT,
  payload JSONB,
  CONSTRAINT audit_logs_append_only CHECK (TRUE) -- enforced via RLS/triggers
);

-- Config versions (immutable)
CREATE TABLE config_versions (
  id UUID PRIMARY KEY,
  version_tag TEXT UNIQUE NOT NULL,
  environment TEXT NOT NULL,
  config_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES operators(id),
  approval_status TEXT DEFAULT 'pending',
  approved_by UUID[]
);
```

## Open Cloud integration

The dashboard interacts with Roblox via Open Cloud APIs:

### Required capabilities

- **DataStore API**: Read/write player data (for support tooling)
- **MessagingService API**: Broadcast invalidations
- **Place Management**: View publish history
- **Universe Settings**: Read game configuration

### Credential management

- Separate API keys per environment (dev/stage/prod)
- Keys stored in environment variables (never in code)
- Least-privilege scopes per key
- Key rotation process documented

### API key scopes (example)

```
dev-dashboard-key:
  - universe:read
  - datastore:read
  - messaging:publish

prod-dashboard-key:
  - universe:read
  - datastore:read
  - datastore:write (restricted to moderation keys)
  - messaging:publish
```

## Deployment strategy

### Phase 1-2

- Deploy to Vercel (free tier sufficient)
- PostgreSQL on Supabase or Neon (free tier)
- Single environment (dev-only dashboard)

### Phase 3+

- Separate dashboard environments (staging, production)
- Database migrations via Prisma Migrate
- CI/CD: GitHub Actions → Vercel

### Local development

```bash
cd apps/dashboard
cp .env.example .env.local
# Fill in Roblox OAuth credentials and database URL
pnpm install
pnpm dev
```

## Security considerations

- All routes require authentication (except health check)
- RBAC enforced server-side (never trust client)
- Audit logs are append-only (no UPDATE/DELETE)
- Sensitive data (player inventories) shown as IDs only
- Rate limiting on API routes
- CSRF protection via Next.js defaults

## Monitoring (Phase 3+)

- Error tracking: Sentry
- Uptime monitoring: external ping
- Audit log alerts: anomaly detection on privileged actions

## Open questions (to resolve)

- [ ] Exact OAuth scope requirements from Roblox
- [ ] Database hosting choice (Supabase vs Neon vs Railway)
- [ ] Background job strategy (Vercel Cron vs dedicated worker)
- [ ] Multi-tenant support (if platform serves multiple studios)
```
