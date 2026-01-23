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

## Test tooling

### Unit tests (vitest)

Pure TypeScript logic runs in Node.js via vitest:

```bash
pnpm test              # all packages
pnpm --filter @rbx/net test  # single package
pnpm test -- --coverage      # with coverage report
```

Coverage target: 80%+ for domain logic, 100% for security-critical validators.

### @rbx/testing package

The `@rbx/testing` package provides shared test utilities:

- **ErrorCode enum** - Mirrors `@rbx/shared-types` for Node.js tests
- **Result utilities** - `ok()`, `err()`, `isOk()`, `isErr()`
- **Roblox mocks** - `mockRobloxGlobals()` for `os.clock()`, `typeOf()`, etc.
- **Factories** - `MockRateLimiter`, `createMockPlayer()`, payload factories

```typescript
import { ErrorCode, ok, err, mockRobloxGlobals } from "@rbx/testing";

beforeAll(() => mockRobloxGlobals());
```

### Roblox runtime tests

For code that requires Roblox APIs, we have two options:

**Option A: TestEZ (in-Studio)**

- Run tests inside Roblox Studio or via `run-in-roblox`
- Best for integration tests that need real Roblox services
- Slower iteration cycle

**Option B: Lune (headless Luau)**

- Run compiled Luau outside Roblox
- Faster iteration, CI-friendly
- Limited to code that doesn't use Roblox-specific APIs

Recommendation: Use vitest for as much as possible (domain logic, validation, utilities). Use Lune or TestEZ only for tests that truly need Roblox APIs.

### Mock strategy

- Mock Roblox services at the adapter boundary
- Never mock domain logic
- Use dependency injection to swap real adapters for test doubles

Example:

```typescript
// Real code injects adapter
const service = new RewardService(dataStoreAdapter);

// Test injects mock
const service = new RewardService(mockDataStoreAdapter);
```

## Phase 1 minimum test requirements

Before Phase 1 is complete, these tests must exist:

### packages/shared-types ✅

- [x] `Result` type helper tests
- [x] `ErrorCode` enum tests
- [x] Branded type tests (24 tests)

### packages/core ✅

- [x] Logger tests
- [x] Janitor tests
- [x] Clock tests (20 tests)

### packages/config-featureflags ✅

- [x] Flag operations tests (20 tests)

### packages/net ✅

- [x] Schema validation wrapper tests:
  - valid payload passes
  - invalid type rejected
  - out-of-bounds number rejected
  - oversized array rejected
- [x] Rate limiter tests:
  - under budget: allowed
  - over budget: rejected with correct code
  - budget refills over time
- [x] 42 tests total

### apps/dashboard ✅

- [x] React component tests (5 tests)

### games/starter

- [ ] At least one E2E remote test (can be manual initially):
  - valid intent accepted
  - invalid intent rejected
  - rate limit enforced

## Definition of done for new features

A feature is not “done” unless:

- its module doc exists (purpose, threats, rollout, kill-switch)
- it has unit tests for domain rules
- it emits observability events
- it includes rollback behavior
