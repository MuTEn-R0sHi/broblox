# ADR-0004: CI publish/promote via Open Cloud

## Status

Accepted

## Context

We want automated, repeatable releases for multiple games with clear environment separation (dev/stage/prod), and we need a safe approval gate for production.

Manual publishing from Studio does not scale and is error-prone.

## Decision

We will use GitHub Actions for CI/CD and Roblox Open Cloud for publishing.

Release model:

- Build once, promote the same artifact.
- `dev` publishes automatically from `main`.
- `stage` promotion requires manual approval.
- `prod` promotion requires a version tag and approval.

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
3. Add stage environment with approval.
4. Add prod tag-based promotion with rollback procedure.
