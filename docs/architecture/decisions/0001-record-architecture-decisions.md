# ADR-0001: Record architecture decisions

## Status

Accepted

## Context

This platform is intended to be reused across multiple Roblox games, with competitive PvP constraints, a web dashboard, and CI-driven releases. Many decisions (network protocol, data model, security posture) are expensive to undo later.

Without a lightweight decision log, we risk:

- inconsistent patterns across games
- security regressions (unvalidated remotes, client authority creep)
- operational drift (ad-hoc releases)

## Decision

We will use Architecture Decision Records (ADRs) in `docs/architecture/decisions/`.

- ADRs are numbered (`0001-...`) and immutable.
- New decisions that supersede old ones create a new ADR.
- PRs that change protocol/security/data/CI must link the relevant ADR.

## Alternatives considered

- Put decisions only in PR descriptions
  - Rejected: hard to search over time.

- Put decisions only in long-form architecture docs
  - Rejected: difficult to track changes and decision history.

## Consequences

- Slightly more process, but much higher clarity and consistency.
- Decisions become reviewable and auditable.

## Rollout plan

- Start writing ADRs immediately for protocol, storage strategy, and deployment decisions.
- Add a PR checklist later to enforce ADR creation where needed.
