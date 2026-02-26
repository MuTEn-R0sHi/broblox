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
pnpm --filter @broblox/net test  # single package
pnpm test:coverage           # with coverage report
```

Coverage target: 80%+ for domain logic, 100% for security-critical validators.

### Enforced coverage thresholds

The root `vitest.config.ts` enforces minimum coverage on every CI run:

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 80%       |
| Functions  | 80%       |
| Branches   | 65%       |
| Statements | 80%       |

Branches has a lower threshold because several infrastructure packages (observability, core) contain Roblox-specific code paths that cannot be fully exercised in Node.js tests.

### @broblox/testing package

The `@broblox/testing` package provides shared test utilities:

- **ErrorCode enum** - Mirrors `@broblox/shared-types` for Node.js tests
- **Result utilities** - `ok()`, `err()`, `isOk()`, `isErr()`
- **Roblox mocks** - `mockRobloxGlobals()` for `os.clock()`, `typeOf()`, etc.
- **Factories** - `MockRateLimiter`, `createMockPlayer()`, payload factories

```typescript
import { ErrorCode, ok, err, mockRobloxGlobals } from "@broblox/testing";

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

### Testing service factories

Factories that create `Service` objects follow a consistent test pattern:

1. **Mock Roblox globals** (`TextChatService`, `Players`, `RunService`) before
   each test using `vi.doMock` or direct `globalThis` assignment.
2. **Dynamic import** the factory module (`await import("./create-xxx-service")`) so
   mocks are applied before the module evaluates.
3. **Call the factory** with config stubs (e.g. `onPlayerRemoving: vi.fn()`).
4. **Invoke lifecycle hooks** directly (e.g. `handle.Service.onInit()`).
5. **Assert side-effects** on the mocked globals.

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("createChatModerationService", () => {
  let capturedHook: ((msg: unknown) => unknown) | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
    }));
    (globalThis as any).TextChatService = {
      set OnIncomingMessage(fn: any) {
        capturedHook = fn;
      },
    };
  });

  afterEach(() => vi.restoreAllMocks());

  it("registers the filtering hook on init", async () => {
    const mod = await import("./create-chat-moderation-service");
    const handle = mod.createChatModerationService();
    handle.Service.onInit!();
    expect(capturedHook).toBeDefined();
  });
});
```

Key points:

- Each factory call should return **independent instances** (test with two calls
  and `expect(a.Service).not.toBe(b.Service)`).
- Test the `onDestroy` hook disconnects connections.
- Test edge cases: missing player, disabled feature flag, etc.

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
- [x] 59 tests total

### packages/data ✅

- [x] VersionedData and DataMetadata type tests
- [x] Session state machine tests
- [x] Migration chain tests
- [x] Retry configuration tests
- [x] Dirty tracking tests
- [x] Cache operations tests
- [x] 24 tests total

### packages/security ✅

- [x] Trust score calculation tests
- [x] Violation detection tests (speed, teleport, rate abuse)
- [x] Enforcement action tests
- [x] Trust cache tests
- [x] 41 tests total

### packages/observability ✅

- [x] Correlation context tests
- [x] Telemetry event tests
- [x] Metrics tests (counter, gauge, histogram)
- [x] Span lifecycle tests
- [x] Event batching tests
- [x] Level filtering tests
- [x] 44 tests total

### apps/dashboard ✅

- [x] React component tests (2 tests)

### games/starter ✅

- [x] Handshake service tests (10 tests)
- [x] Action service tests (10 tests)
- [x] Remote contract tests (12 tests)
- [x] 32 tests total

## Phase 2–5c test requirements

All Phase 2–5c packages follow the same pattern: unit tests for domain logic, factory tests for service creation.

### Phase 2 — PvP ✅

- [x] `combat`: weapon definitions, hit validation, cooldowns, damage calculation
- [x] `matchmaking`: queue management, match lifecycle, server allocation

### Phase 3 — Beta ✅

- [x] `moderation`: bans, mutes, evidence, enforcement (service + stores)
- [x] `movement`: speed, teleport, fly, jump validation, state management

### Phase 4 — Ops ✅

- [x] `codes`: promo codes, redemption, expiry, limits
- [x] `leaderboards`: leaderboard store, period support, sorted entries
- [x] `analytics`: events, funnels, sessions, retention tracking
- [x] `notifications`: notification store, announcement manager

### Phase 5a — Foundation ✅

- [x] `inventory`: item registry, per-player inventory, stacking, transfers
- [x] `progression`: XP curves, level-up, prestige/rebirth
- [x] `quests`: quest registry, objective tracking, schedules
- [x] `rewards`: daily login, streaks, achievement tracking

### Phase 5b — Collection ✅

- [x] `pets`: pet registry, store, hatching, leveling, evolution (34 tests)
- [x] `gacha`: egg registry, weighted loot, pity system (20 tests)
- [x] `cosmetics`: ownership, equip slots, validation (26 tests)
- [x] `battle-pass`: seasons, tiers, free/premium claims (29 tests)

### Phase 5c — Support ✅

- [x] `localization`: multi-locale strings, interpolation, pluralization (27 tests)
- [x] `audio`: sound registry, channels, playlists (31 tests)
- [x] `tutorial`: sequence registry, FTUE manager, prerequisites (32 tests)
- [x] `world-systems`: day/night cycle, weather, seasons (20 tests)

### Service factory tests ✅

All 25 packages have `create*Service()` factory test suites covering:

- [x] Independent instance creation
- [x] Lifecycle hook wiring (`onInit`, `onStart`, `onDestroy`)
- [x] Player init/cleanup handlers
- [x] Config propagation
- [x] Mock isolation with `vi.resetModules()` + `vi.doMock()`

**Total: 2,400+ tests across 115+ test suites.**

## Definition of done for new features

A feature is not “done” unless:

- its module doc exists (purpose, threats, rollout, kill-switch)
- it has unit tests for domain rules
- it emits observability events
- it includes rollback behavior
