# Error Code Reference

This document is **auto-generated** from the `ErrorCode` enum in `@rbx/shared-types`.

Error codes are used with the [Result type](./result-types.md) for explicit error handling across the platform.

## Error Code Ranges

- **0xxx**: General errors (unknown, unspecified)
- **1xxx**: Validation errors (schema, bounds, types)
- **2xxx**: Business logic errors (cooldowns, state, resources)
- **3xxx**: Protocol errors (version mismatch, compatibility)
- **4xxx**: Authorization errors (permissions, sessions)
- **5xxx**: Internal errors (server issues, timeouts)

## General Errors (0xxx)

| Code | Name      | Description      |
| ---- | --------- | ---------------- |
| 0    | `Unknown` | _No description_ |

## Validation Errors (1xxx)

| Code | Name              | Description      |
| ---- | ----------------- | ---------------- |
| 1001 | `InvalidPayload`  | _No description_ |
| 1002 | `PayloadTooLarge` | _No description_ |
| 1003 | `MissingField`    | _No description_ |
| 1004 | `InvalidType`     | _No description_ |
| 1005 | `OutOfBounds`     | _No description_ |

## Business Logic Errors (2xxx)

| Code | Name                    | Description      |
| ---- | ----------------------- | ---------------- |
| 2001 | `RateLimited`           | _No description_ |
| 2002 | `Cooldown`              | _No description_ |
| 2003 | `InvalidState`          | _No description_ |
| 2004 | `NotFound`              | _No description_ |
| 2005 | `AlreadyExists`         | _No description_ |
| 2006 | `InsufficientResources` | _No description_ |
| 2007 | `FeatureDisabled`       | _No description_ |

## Protocol Errors (3xxx)

| Code | Name               | Description      |
| ---- | ------------------ | ---------------- |
| 3001 | `ProtocolMismatch` | _No description_ |
| 3002 | `ClientOutdated`   | _No description_ |
| 3003 | `ServerOutdated`   | _No description_ |

## Authorization Errors (4xxx)

| Code | Name             | Description      |
| ---- | ---------------- | ---------------- |
| 4001 | `Unauthorized`   | _No description_ |
| 4002 | `Forbidden`      | _No description_ |
| 4003 | `SessionExpired` | _No description_ |

## Internal Errors (5xxx)

| Code | Name                 | Description      |
| ---- | -------------------- | ---------------- |
| 5001 | `InternalError`      | _No description_ |
| 5002 | `ServiceUnavailable` | _No description_ |
| 5003 | `Timeout`            | _No description_ |

## Adding New Error Codes

1. Add the error code to the `ErrorCode` enum in `packages/shared-types/src/index.ts`
2. Follow the range conventions above
3. Never reuse or change existing codes (breaking change)
4. Regenerate this document:

```bash
node tools/generate-error-catalog.mjs > docs/reference/error-codes.md
```

---

_Last updated: 2026-01-23_
