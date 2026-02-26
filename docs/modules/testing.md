# Modules: Testing

Shared test utilities, Roblox API mocks, and factory helpers for vitest (`@broblox/testing`). **Status: Implemented**.

## Purpose

- Provide `mockRobloxGlobals()` so packages can be unit-tested in Node.js/vitest without Roblox Studio.
- Mirror Roblox runtime types (`os.clock`, `math.*`, `Vector3`, `Color3`, `pcall`, `task.*`, etc.) as JavaScript stubs.
- Offer factory functions for constructing test fixtures (players, payloads, results).
- Ship synchronized copies of `ErrorCode` and `Result<T>` that work in Node.js (the roblox-ts compiled originals require Luau).

## Public API

### Roblox Mocks

```typescript
import { mockRobloxGlobals, unmockRobloxGlobals } from "@broblox/testing";

beforeAll(() => mockRobloxGlobals());
afterAll(() => unmockRobloxGlobals());
```

Mocks include: `os.clock`, `os.time`, `math.*`, `string.*`, `pcall`, `task.spawn/wait/delay/defer`, `typeIs`, `typeOf`, `game`, `tostring`, `tonumber`, `print`, `warn`, `select`, `pairs`, `ipairs`, `Array.prototype.size`, `String.prototype.size`.

### Factories

```typescript
import {
  createMockPlayer,
  createDoActionPayload,
  createHandshakePayload,
  createActionResult,
  createErrorResult,
  MockRateLimiter,
} from "@broblox/testing";

const player = createMockPlayer({ UserId: 42 });
const limiter = new MockRateLimiter({ maxRequests: 5 });
```

### Result & ErrorCode

```typescript
import { isOk, isErr, ErrorCode } from "@broblox/testing";
```

## Dependencies

None at runtime — this is a dev-only package.

## Testing

- `testing.test.ts` (671 lines) — comprehensive coverage of all mocks, factories, rate limiter scenarios.

## Sync Warning

`error-codes.ts` and `result.ts` are intentional copies of `@broblox/shared-types`. Run `pnpm check:sync` to verify they stay in sync.
