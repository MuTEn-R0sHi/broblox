# Architecture: Config schema & validation

This page defines how configuration is authored, validated, rolled out, and audited.

## Goals

- Prevent bad configs from reaching prod.
- Make every config change attributable (who/why/when).
- Make rollbacks fast (config versions are immutable).

## Config types

- **Feature flags**: booleans and rollouts (kill-switches, experiments)
- **Gameplay tuning**: weapon stats, cooldowns, movement envelopes
- **Matchmaking tuning**: MMR windows, region constraints, party limits
- **Economy rules**: rewards, prices, battle pass tiers (high risk)

## Authoring model

- Config is represented as strongly typed DTOs in `shared-types`.
- Runtime configs are loaded from:
  - safe defaults in code
  - overridden by an approved config snapshot

## Validation rules (must be enforced)

- Schema validation:
  - required keys exist
  - enums are valid
  - unknown keys are rejected

- Bounds validation:
  - cooldowns >= 0
  - damage values bounded
  - probabilities in [0, 1]
  - arrays length bounded

- Cross-field validation:
  - weapon fire rate consistent with ammo and reload
  - matchmaking MMR windows expand safely

## Versioning and immutability

- Every config publish produces a new `configVersion`.
- Config versions are immutable.
- Rollback means selecting a previous `configVersion`.

## Promotion & approval

- dev: auto-publish allowed
- stage: approval required for high-risk keys
- prod: approval required for all changes; additional approver for economy/ranked/trading

## Audit requirements

Every config change must record:

- actor (operator)
- reason
- diff summary (before/after, redacted)
- approval status and approvers
- rollout plan (segment/percentage)

## Runtime behavior

- Servers periodically refresh configs (with caching + backoff).
- Servers treat config fetch failures as non-fatal:
  - keep last known-good
  - fall back to defaults if necessary

## Kill-switches

All high-risk modules must have kill-switches:

- ranked matchmaking
- trading
- economy grants
- specific weapons/abilities

## Definition of done

- Invalid configs cannot be merged or deployed.
- High-risk keys require approval.
- Rollback procedure is documented and tested.
