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

### Role: ADMIN

All ENGINEER permissions, plus:

- Toggle feature flags in production
- Delete/kill feature flags
- Manage user roles
- Edit settings

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

Admins can manage roles from `/dashboard/users`:

- Select a role from the dropdown on a user row
- Click **Save** to apply
- The app prevents changing your own role from the UI to avoid lockouts
- Role changes are written to the audit log

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

| Field       | Description                            |
| ----------- | -------------------------------------- |
| `id`        | Unique audit log ID                    |
| `userId`    | User who performed the action          |
| `action`    | Action type (e.g., `flag.toggle.prod`) |
| `target`    | Target resource (e.g., flag name)      |
| `before`    | Previous state (JSON)                  |
| `after`     | New state (JSON)                       |
| `timestamp` | When the action occurred               |
| `ipHash`    | Hashed IP address (optional)           |
| `userAgent` | Browser user agent (optional)          |

### Action Types

| Action              | Description                    |
| ------------------- | ------------------------------ |
| `flag.create`       | New feature flag created       |
| `flag.update`       | Flag metadata updated          |
| `flag.delete`       | Feature flag deleted           |
| `flag.toggle.dev`   | Dev environment toggled        |
| `flag.toggle.stage` | Stage environment toggled      |
| `flag.toggle.prod`  | Production environment toggled |
| `evidence.create`   | Evidence attached to a ban     |
| `mute.create`       | New mute issued                |
| `mute.revoke`       | Mute revoked/deactivated       |
| `ban.create`        | New ban issued                 |
| `ban.revoke`        | Ban revoked                    |
| `appeal.approved`   | Appeal approved                |
| `appeal.denied`     | Appeal denied                  |

### Viewing Audit Logs

All authenticated users can view audit logs at `/dashboard/audit`:

- Chronological list of all actions
- User attribution with avatar
- Before/after state comparison
- Relative timestamps

## Security Considerations

1. **Server-side only**: All permission checks happen on the server
2. **Audit immutability**: Application code never updates or deletes audit logs
3. **Session security**: Database-backed sessions with secure, httpOnly cookies
4. **Input validation**: All user input validated before processing

## Future Enhancements

- [ ] Approval workflows for high-risk actions
- [ ] Audit log export (CSV/JSON)
- [ ] Anomaly detection alerts
- [ ] IP-based access restrictions
- [ ] Two-factor authentication
