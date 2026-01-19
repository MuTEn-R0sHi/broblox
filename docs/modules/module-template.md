# Modules: Template

Use this template for every reusable feature module (battle pass, trading, cosmetics, etc.).

## Purpose

- What problem does this module solve?
- Why is it reusable across multiple games?

## Scope

- In scope
- Out of scope

## Public API

- Server service API (methods, events)
- Client controller API (if any)
- Networking endpoints (remote names, directions)

## Data ownership

- What data does the module own in the player profile?
- What keys/collections does it write to?
- What invariants must hold?

## Trust & security

- What does the client send (intent only)?
- What must be server authoritative?
- Abuse cases + mitigations
- Rate limits (per endpoint)

## Configuration

- Config keys
- Feature flags / kill-switches
- Rollout strategy (dev → stage → prod)

## Observability

- Events emitted (names + fields)
- Metrics and alerts
- Audit log requirements (if dashboard actions exist)

## Performance

- Replication costs (instances/attributes)
- Networking budgets
- Hot path constraints

## Testing

- Unit tests required
- Integration/simulation tests required
- Abuse/edge-case tests

## Rollback plan

- Kill-switch behavior
- Data migration rollback (if any)
- Safe defaults
