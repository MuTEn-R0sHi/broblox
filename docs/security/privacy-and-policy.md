# Security: Privacy and policy

This page defines privacy rules, data minimization, and policy-driven feature gating.

## Goals

- Collect only what we need to operate and improve the game.
- Avoid storing or displaying sensitive data unnecessarily.
- Ensure high-risk features (trading, paid random items) are gated and kill-switchable.

## Data minimization rules

- Prefer anonymous or pseudonymous identifiers in analytics.
- Store Roblox `UserId` only where necessary (moderation, matchmaking integrity, support).
- Never store secrets/tokens in DataStores, ReplicatedStorage, or client-accessible locations.

## Telemetry privacy rules

Allowed (examples):

- device class (`kbm`/`gamepad`/`touch`)
- performance tier buckets
- match outcome and server health
- aggregate security signals

Avoid / restrict:

- freeform chat contents (treat as sensitive)
- personal data (names, emails, off-platform identifiers)

## Policy gating (feature eligibility)

Some modules require strict eligibility checks before enabling:

- Trading
- User-generated commerce-like flows
- Ranked competitive modes (optional gating)

Eligibility signals (examples):

- account age
- moderation status
- trust score (platform-defined)
- region/age-based restrictions if applicable

All policy checks must be **server-side enforced**.

## High-risk feature requirements

### Trading

- Disabled by default until controls are proven.
- Requires:
  - escrow
  - ledgered trades
  - strict rate limits
  - kill-switch
  - audit-friendly match and action context

### Paid randomization (gacha/lootboxes)

- Must be treated as policy-sensitive.
- If implemented, require:
  - explicit design review
  - clear configuration and rollback plan
  - full auditability of grants

## Dashboard privacy rules

- Show the minimum player data required for support/moderation.
- Redact sensitive fields.
- Evidence links must be access-controlled.

## Operational definition of done

- Every telemetry event has an explicit purpose.
- Every high-risk feature has kill-switch + staged rollout.
- Dashboard pages display only safe, necessary fields.
