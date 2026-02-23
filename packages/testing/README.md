# @rbx/testing

Shared test utilities, mocks, and helpers for the BroBlox monorepo.

## Purpose

This package provides:

1. **Error codes and Result types** that mirror the Roblox runtime types for use in Node.js/Vitest tests
2. **Roblox API mocks** for testing code that uses Roblox-specific globals
3. **Test factories** for creating consistent test data

## Usage

```typescript
import { ErrorCode, ok, err, mockRobloxGlobals, createMockRateLimiter } from "@rbx/testing";

describe("my test", () => {
  beforeAll(() => {
    mockRobloxGlobals();
  });

  it("works", () => {
    const result = ok({ value: 42 });
    expect(result.ok).toBe(true);
  });
});
```

## Why this exists

The actual `@rbx/shared-types` and other packages use roblox-ts and Roblox globals (`os.clock()`, `typeOf()`, etc.) that don't exist in Node.js. This package provides compatible implementations for testing.

## Guidelines

- Keep mocks minimal and focused
- Match the actual API signatures exactly
- Document any behavioral differences from real Roblox APIs
