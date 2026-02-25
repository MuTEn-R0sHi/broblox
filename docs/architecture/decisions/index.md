# Architecture Decisions (ADRs)

Architecture Decision Records (ADRs) capture hard-to-reverse decisions.

## Rules

- Any change that affects protocol/security/data/CI/release flow requires an ADR.
- ADRs are short, factual, and include consequences.
- New ADRs are numbered and never rewritten (superseded by a new ADR).

## When an ADR is required

Create an ADR when you:

- change networking protocol/versioning rules
- change persistence schema or migration approach
- change anti-abuse enforcement policy
- change CI/CD promotion strategy
- introduce a new shared package that affects many games

## Template

Each ADR should include:

- Context
- Decision
- Alternatives considered
- Consequences
- Rollout plan (if applicable)

## Index

- ADR-0001: Record architecture decisions
- ADR-0002: Network protocol versioning
- ADR-0003: Persistence, idempotency, and ledgers
- ADR-0004: CI publish/promote via Open Cloud
- ADR-0005: Schema validation library choice
- ADR-0006: Framework choice — custom vs Flamework
- ADR-0007: Multi-game dashboard design
- ADR-0008: Marketplace / MonetizationService wrapper
