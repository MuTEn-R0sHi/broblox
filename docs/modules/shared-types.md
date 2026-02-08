# Modules: Shared types

Shared TypeScript types and interfaces across all packages (`@rbx/shared-types`). **Status: Implemented** (~92 tests).

## Purpose

- Provide the zero-dependency type foundation for the entire monorepo.
- Define branded IDs, error codes, the `Result` monad, and protocol constants.
- Ensure type safety at package boundaries without runtime cost.

## Public API

### Branded types

- `PlayerId`, `MatchId`, `RequestId`, `ServerId`, `SessionId` — nominal IDs that prevent accidental mixing.
- Constructor helpers: `playerId(n)`, `matchId(s)`, etc.

### Result type

- `Result<T>` — discriminated union of `Ok<T>` and `Err`.
- `ok(value)` / `err(code, message)` — constructors.
- `isOk(result)` / `isErr(result)` — type guards.

### Error codes

- `ErrorCode` enum — ranges by category:
  - **1xxx** — validation errors.
  - **2xxx** — business logic errors.
  - **3xxx** — protocol errors.
  - **4xxx** — auth/permission errors.
  - **5xxx** — internal/server errors.

### Protocol constants

- `PROTOCOL_VERSION` / `MIN_PROTOCOL_VERSION` — client-server compatibility.

### DTOs

- `HandshakePayload`, `HandshakeResponse` — handshake wire types.
- `BaseRequest`, `BaseResponse` — common request/response envelopes.
- `Vector3DTO`, `DeviceClass` — shared data shapes.

### Utility types

- `DeepPartial<T>`, `DeepReadonly<T>`, `RequireFields<T,K>`, `OptionalFields<T,K>`.

### Constants

- Timeout values, rate limits, build info, validation rules.

## Dependencies

**None.** This package must remain dependency-free.

## Data ownership

Shared-types owns no data. It defines the shapes other packages use.

## Trust & security

Pure type definitions — no runtime behavior. Error code ranges are enforced by convention.

## Testing

~92 unit tests covering branded type constructors, Result helpers, error code ranges, DTO shape validation, and utility type behavior.
