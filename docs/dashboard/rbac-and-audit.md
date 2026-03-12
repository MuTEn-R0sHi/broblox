# Dashboard: RBAC and Audit Logging

The dashboard is the operations control plane. It must be safe by default.

## Goals

- Only authorized operators can perform privileged actions
- Every privileged action is recorded in an immutable audit log
- High-risk actions (production changes) require elevated roles

## Authentication

- **Provider**: GitHub OAuth via NextAuth.js v5
- **Session**: Database-backed sessions with secure cookies
- **Identity**: GitHub user ID mapped to internal User record

## Authorization (RBAC)

Roles are additive; permissions are enforced server-side.

The source of truth for the permission matrix is the dashboard RBAC module: `apps/dashboard/src/lib/rbac.ts`.

### Role: VIEWER (default)

- View dashboard
- View matches
- View players
- View feature flags (read-only)

### Role: SUPPORT

All VIEWER permissions, plus:

- View audit logs
- View moderation pages (read-only)

### Role: MODERATOR

All SUPPORT permissions, plus:

- Issue moderation actions (ban/mute)
- Review appeals
- Perform bulk moderation

### Role: ENGINEER

All MODERATOR permissions, plus:

- Toggle feature flags in dev/stage
- Create feature flags
- View settings (read-only)
- View, create, and manage games (register/edit Roblox experiences)

### Role: ADMIN

All ENGINEER permissions, plus:

- Toggle feature flags in production
- Delete/kill feature flags
- Manage user roles
- Edit settings
- Delete registered games

## Bootstrapping an admin (local/dev)

New users default to `VIEWER`, which hides privileged navigation items and blocks privileged routes.
For local/dev bootstrapping, you can promote specific GitHub usernames to `ADMIN` on sign-in.

Set the environment variable `ADMIN_GITHUB_USERS` (comma-separated GitHub usernames) for the dashboard server:

```bash
ADMIN_GITHUB_USERS="your-github-handle"
```

Notes:

- This is checked during GitHub sign-in; you may need to sign out/in after setting it.
- Recommended usage: keep this enabled during solo development as a safety net, then remove or tighten it once roles are managed in the database.

## Managing roles

Admins can manage roles from `/users`:

- Select a role from the dropdown on a user row
- Click **Save** to apply
- The app prevents changing your own role from the UI to avoid lockouts
- Role changes are written to the audit log

For safety, role changes require:

- A human-readable **reason** (min 5 characters)
- A typed **confirmation phrase** that must exactly match:
  - `set role <userId> <role>`

## Permission Matrix

| Action             | VIEWER | SUPPORT | MODERATOR | ENGINEER | ADMIN |
| ------------------ | ------ | ------- | --------- | -------- | ----- |
| View dashboard     | ✅     | ✅      | ✅        | ✅       | ✅    |
| View matches       | ✅     | ✅      | ✅        | ✅       | ✅    |
| View players       | ✅     | ✅      | ✅        | ✅       | ✅    |
| View flags         | ✅     | ✅      | ✅        | ✅       | ✅    |
| View audit logs    | ❌     | ✅      | ✅        | ✅       | ✅    |
| View moderation    | ❌     | ✅      | ✅        | ✅       | ✅    |
| Moderation actions | ❌     | ❌      | ✅        | ✅       | ✅    |
| Toggle DEV flags   | ❌     | ❌      | ❌        | ✅       | ✅    |
| Toggle STAGE flags | ❌     | ❌      | ❌        | ✅       | ✅    |
| Toggle PROD flags  | ❌     | ❌      | ❌        | ❌       | ✅    |
| Create flags       | ❌     | ❌      | ❌        | ✅       | ✅    |
| Delete/kill flags  | ❌     | ❌      | ❌        | ❌       | ✅    |
| View games         | ❌     | ❌      | ❌        | ✅       | ✅    |
| Create games       | ❌     | ❌      | ❌        | ✅       | ✅    |
| Manage games       | ❌     | ❌      | ❌        | ✅       | ✅    |
| Delete games       | ❌     | ❌      | ❌        | ❌       | ✅    |
| Manage roles       | ❌     | ❌      | ❌        | ❌       | ✅    |

## Implementation

### Server-side enforcement

Use permission checks (not client-side role checks) in server components and server actions.

Examples:

- Server pages: `requirePermission("view:flags")`
- Server actions: `checkPermission("flags:create")`
- API routes: `requireApiPermission("view:matches")`

### Client-side UI

Frontend hides controls for unauthorized actions (defense in depth):

```tsx
{
  /* UI can hide controls, but server is the authority */
}
```

## Audit Logging

Every privileged action is recorded with:

| Field       | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| `id`        | Unique audit log ID                                                 |
| `userId`    | User who performed the action                                       |
| `gameId`    | Game the action was scoped to (null for platform-level actions)     |
| `action`    | Action type (e.g., `flag.toggle.prod`, `game.create`)               |
| `target`    | Target resource (e.g., flag key, game slug)                         |
| `reason`    | Human-readable reason/context (required for some high-risk actions) |
| `before`    | Previous state (JSON)                                               |
| `after`     | New state (JSON)                                                    |
| `timestamp` | When the action occurred                                            |
| `ipHash`    | Hashed IP address (optional)                                        |
| `userAgent` | Browser user agent (optional)                                       |

### Action Types

| Action                | Description                    |
| --------------------- | ------------------------------ |
| `game.create`         | New game registered            |
| `game.update`         | Game metadata updated          |
| `game.delete`         | Game deleted                   |
| `flag.create`         | New feature flag created       |
| `flag.update`         | Flag metadata updated          |
| `flag.delete`         | Feature flag deleted           |
| `flag.toggle.dev`     | Dev environment toggled        |
| `flag.toggle.stage`   | Stage environment toggled      |
| `flag.toggle.prod`    | Production environment toggled |
| `flag.kill`           | Kill switch activated          |
| `flag.unkill`         | Kill switch deactivated        |
| `flag.rollout.update` | Flag rollout updated           |
| `evidence.create`     | Evidence attached to a ban     |
| `mute.create`         | New mute issued                |
| `mute.revoke`         | Mute revoked/deactivated       |
| `ban.create`          | New ban issued                 |
| `ban.revoke`          | Ban revoked                    |
| `appeal.approved`     | Appeal approved                |
| `appeal.denied`       | Appeal denied                  |
| `user.role.change`    | User role changed              |
| `auth.login`          | User signed in                 |

### High-risk confirmations

Some actions require both a **reason** (min 5 characters) and a typed confirmation phrase.
This is enforced server-side and the reason is stored in the audit log `reason` field.

- Toggle PROD flag: `toggle prod <flagKey> on` / `toggle prod <flagKey> off`
- Kill switch: `kill <flagKey>`
- Un-kill flag: `unkill <flagKey>`
- Change user role: `set role <userId> <role>`

### Viewing Audit Logs

Users with `SUPPORT` (or higher) can view audit logs at `/audit`:

- Chronological list of all actions
- User attribution with avatar
- Before/after state comparison
- Relative timestamps

Filters:

- **Action**: Filter by action category (e.g., `flag.*`, `ban.*`, `mute.*`, `evidence.*`, `auth.*`)
- **Target contains**: Substring match over the `target` field (useful for player IDs, flag names, or record IDs)
- **Reason contains**: Substring match over `reason` (useful for moderation reasons, revoke reasons, and appeal resolutions)
- **Details contains**: Substring match over serialized `before` / `after` JSON (useful for finding specific changed fields)
- **User**: Filter to actions performed by a specific operator

UX:

- **Copy target**: Quickly copy the `target` value to your clipboard from the results list.

Exports:

- Use **Export CSV** / **Export JSON** to download the currently filtered view.

## Security Considerations

1. **Server-side only**: All permission checks happen on the server
2. **Audit immutability**: Application code never updates or deletes audit logs
3. **Session security**: Database-backed sessions with secure, httpOnly cookies
4. **CSRF protection**: Double-submit cookie minted via Edge middleware (`ensureCsrfCookie`) for browser dashboard routes. Uses the Web Crypto API for token generation. The middleware skips setting the CSRF cookie on `/api/*` routes so game-server traffic authenticated with API keys is unaffected; a `validateCsrf` helper is available to wire CSRF checks into mutating browser-facing routes as needed.
5. **Input validation**: All user input validated before processing (Zod schemas on all server actions)
6. **Rate limiting**: Distributed rate limiting across serverless instances (database-backed, survives cold starts)

## Future Enhancements

- [ ] Approval workflows for high-risk actions
- [ ] Anomaly detection alerts
- [ ] More granular access restrictions (e.g., per-route allowlists)
- [ ] Two-factor authentication
