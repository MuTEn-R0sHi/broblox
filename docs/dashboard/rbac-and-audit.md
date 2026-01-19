# Dashboard: RBAC and audit logging

The dashboard is the operations control plane. It must be safe by default.

## Goals

- Only authorized operators can perform privileged actions.
- Every privileged action is recorded in an immutable audit log.
- High-risk actions require approvals.

## Authentication

- Use Roblox OAuth for operator login.
- Map Roblox identity (user id) to an internal operator record.
- Maintain an allowlist (and/or group membership requirement).

## Authorization (RBAC)

Roles are additive; permissions are enforced server-side.

### Role: Viewer

- View match history
- View aggregated metrics
- View audit logs

### Role: Support

- View player profile snapshot (safe fields only)
- Add internal notes to player cases
- Initiate ban appeal workflows

### Role: Moderator

- Create/modify mutes and temporary bans
- Review player reports and evidence
- Trigger quarantine (unranked-only)

### Role: Engineer

- Edit configs and feature flags (stage only by default)
- Trigger dev publishes
- View deploy pipeline status

### Role: Admin

- Promote to prod (requires approval)
- Grant permanent bans/unbans
- Edit economy-critical configs
- Manage RBAC assignments

## Approval workflow (high risk)

Require at least one additional approver for:

- prod promotion
- enabling ranked matchmaking
- changing core anti-cheat thresholds
- changing economy grant rules
- enabling trading

## Audit logging (immutable)

### Audit event schema (minimal)

- `auditId` (unique)
- `timestamp`
- `actor`
  - `robloxUserId`
  - `operatorId`
  - `roleAtTime`
- `action`
  - `type` (e.g., `config.update`, `ban.create`, `release.promote`)
  - `target` (player id, config key, release id)
- `request`
  - `requestId`
  - `ipHash` (privacy-safe)
  - `userAgent` (optional)
- `before` / `after` snapshots (redacted)
- `reason` (required for bans and prod actions)
- `approval`
  - `required: boolean`
  - `status: pending|approved|rejected`
  - `approvers[]`

### Rules

- Audit logs are append-only (no edits/deletes).
- Redact secrets and private player fields.
- Every Open Cloud publish/promote action must generate an audit event.

## Safe data exposure

The dashboard must not display sensitive data unnecessarily.

- No secrets, keys, or internal tokens.
- Player inventory shown as IDs/names only.
- Evidence links should be stored as references; access controlled.

## Operational definition of done

- Every privileged endpoint requires a permission check.
- Every privileged endpoint emits an audit event.
- Prod promotion and economy changes require approval.
