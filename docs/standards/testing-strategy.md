# Standards: Testing strategy

Testing is part of the security posture.

## Goals

- Prevent regressions in validation and authority rules.
- Keep gameplay logic testable (domain stays pure).
- Make releases safe (CI gates).

## Test layers

### Unit tests (required)

Target: pure logic.

Examples:

- schema validators
- MMR calculations
- reward eligibility
- cooldown rules
- idempotency/dedupe helpers

### Integration tests (recommended)

Target: Roblox adapters and orchestration.

Examples:

- persistence gateway behavior (retry, merge)
- matchmaking queue formation
- remote middleware chain

### Simulation tests (recommended for PvP)

Target: match flows under time.

Examples:

- input stream + snapshot reconciliation at fixed tick rate
- hit validation edge cases
- disconnect handling

## Security testing requirements

- Every inbound remote must have tests for:
  - invalid payload shape
  - out-of-bounds values
  - rate limit behavior
- Every economy mutation must have tests for idempotency.

## CI quality gates (initial)

- Typecheck passes
- Lint passes
- Unit tests pass

Later gates:

- protocol compatibility tests (N-1)
- performance budget checks (payload size, input frequency)

## Definition of done for new features

A feature is not “done” unless:

- its module doc exists (purpose, threats, rollout, kill-switch)
- it has unit tests for domain rules
- it emits observability events
- it includes rollback behavior
