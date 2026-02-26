# @broblox/shared-types

Core type definitions shared across the entire platform.

## Purpose

This package provides:

- **Branded types** for type-safe IDs (PlayerId, MatchId, RequestId, etc.)
- **Stable error codes** for network responses with predefined ranges
- **Result type** for functional error handling
- **Protocol version** constant for client-server compatibility

## Key Features

### Zero Dependencies

This package has **no dependencies** and must remain pure. It cannot import:

- Roblox services
- Other platform packages
- External libraries

### Branded Types

Type-safe wrappers around primitives that prevent accidental misuse:

```typescript
import { createPlayerId, createMatchId } from "@broblox/shared-types";

const playerId = createPlayerId(12345);
const matchId = createMatchId("match-abc-123");

// TypeScript prevents this:
// function foo(id: MatchId) {}
// foo(playerId); // Error: PlayerId is not assignable to MatchId
```

### Error Code Ranges

- `1xxx`: Validation errors (schema, bounds, types)
- `2xxx`: Business logic errors (cooldowns, state, resources)
- `3xxx`: Protocol errors (version mismatch, compatibility)
- `4xxx`: Authorization errors (permissions, sessions)
- `5xxx`: Internal errors (server issues, timeouts)

### Result Type

Functional error handling without exceptions:

```typescript
import { ok, err, ErrorCode, type Result } from "@broblox/shared-types";

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return err(ErrorCode.InvalidPayload, "Division by zero");
  }
  return ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  print(`Result: ${result.value}`);
} else {
  warn(`Error ${result.code}: ${result.message}`);
}
```

## API Reference

### Branded Types

- `PlayerId` - Unique player identifier (Roblox UserId)
- `MatchId` - Unique match/game session identifier
- `RequestId` - Request identifier for idempotency
- `ServerId` - Server/job identifier
- `SessionId` - Session identifier

### Constants

- `PROTOCOL_VERSION` - Current protocol version (increment on breaking changes)

### Enums

- `ErrorCode` - Stable error code enumeration

### Types

- `Result<T>` - Either `Ok<T>` or `Err`
- `Ok<T>` - Success result with value
- `Err` - Error result with code and optional message

### Functions

- `ok<T>(value: T): Ok<T>` - Create success result
- `err(code: ErrorCode, message?: string): Err` - Create error result
- `createPlayerId(id: number): PlayerId`
- `createMatchId(id: string): MatchId`
- `createRequestId(id: string): RequestId`
- `createServerId(id: string): ServerId`
- `createSessionId(id: string): SessionId`

## Architecture Notes

This package is at the **bottom of the dependency graph**. All other packages may import from here, but this package cannot import from anywhere else.

See [docs/architecture/folders-and-packages.md](../../docs/architecture/folders-and-packages.md) for more details.
