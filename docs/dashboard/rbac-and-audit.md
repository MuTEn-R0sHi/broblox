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

### Role: VIEWER (default)

- View feature flags (all environments)
- View audit logs
- View own profile

### Role: MODERATOR

All VIEWER permissions, plus:

- Toggle dev environment flags
- Toggle stage environment flags

### Role: ENGINEER

All MODERATOR permissions, plus:

- Toggle production flags
- Create new feature flags
- Update flag descriptions
- Delete feature flags

### Role: ADMIN

All ENGINEER permissions, plus:

- Manage user roles
- Access all administrative functions

## Permission Matrix

| Action             | VIEWER | MODERATOR | ENGINEER | ADMIN |
| ------------------ | ------ | --------- | -------- | ----- |
| View flags         | ✅     | ✅        | ✅       | ✅    |
| View audit logs    | ✅     | ✅        | ✅       | ✅    |
| Toggle DEV flags   | ❌     | ✅        | ✅       | ✅    |
| Toggle STAGE flags | ❌     | ✅        | ✅       | ✅    |
| Toggle PROD flags  | ❌     | ❌        | ✅       | ✅    |
| Create flags       | ❌     | ❌        | ✅       | ✅    |
| Delete flags       | ❌     | ❌        | ✅       | ✅    |
| Manage users       | ❌     | ❌        | ❌       | ✅    |

## Implementation

### Server-side enforcement

```typescript
// In server actions (apps/dashboard/src/app/dashboard/flags/actions.ts)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 0,
  MODERATOR: 1,
  ENGINEER: 2,
  ADMIN: 3,
};

function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Permission checks per environment
const ENV_PERMISSIONS: Record<string, UserRole> = {
  dev: "MODERATOR",
  stage: "MODERATOR",
  prod: "ENGINEER",
};
```

### Client-side UI

Frontend hides controls for unauthorized actions (defense in depth):

```tsx
{
  hasRole(user.role, "ENGINEER") && <Button onClick={handleCreateFlag}>Create Flag</Button>;
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
