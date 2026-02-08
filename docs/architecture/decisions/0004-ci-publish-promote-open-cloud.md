# ADR-0004: CI publish/promote via Open Cloud

## Status

Accepted (partially implemented)

## Context

We want automated, repeatable releases for multiple games with clear environment separation (dev/staging/production), and we need a safe approval gate for production.

Manual publishing from Studio does not scale and is error-prone.

## Decision

We will use GitHub Actions for CI/CD and Roblox Open Cloud for publishing.

Release model:

- Build once, promote the same artifact.
- `dev` publishes automatically from `main`.
- `staging` promotion requires manual approval.
- `production` promotion requires a version tag and approval.

Implementation note:

- The current GitHub Actions workflows rebuild from a pinned git ref (commit SHA or tag) during promotion.
  Persisted build artifacts for true "build once, promote" can be added later.

Credentials:

- Use least-privilege Open Cloud credentials.
- Separate credentials per environment.
- Store credentials in GitHub Environments with required reviewers.

Audit:

- Every publish/promote emits an ops audit event (stored by the dashboard).

## Alternatives considered

- Studio-only manual publishing
  - Rejected: not scalable, hard to audit.

- Single environment with flags only
  - Rejected: insufficient isolation and safety.

## Consequences

- CI becomes the primary release mechanism.
- Requires initial Open Cloud setup and key rotation process.
- Forces discipline: releases are traceable and reproducible.

## Rollout plan

1. Implement CI build and artifact generation.
2. Implement dev publish.
3. Add staging environment with approval.
4. Add production tag-based promotion with rollback procedure.
