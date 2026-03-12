# Error Code Reference

This document is **auto-generated** from the `ErrorCode` enum in `@broblox/shared-types`.

## Error Code Ranges

- **0xxx**: General errors (unknown, unspecified)
- **1xxx**: Validation errors (schema, bounds, types)
- **2xxx**: Business logic errors (cooldowns, state, resources)
- **3xxx**: Protocol errors (version mismatch, compatibility)
- **4xxx**: Authorization errors (permissions, sessions)
- **5xxx**: Internal errors (server issues, timeouts)

## General Errors (0xxx)

| Code | Name      | Description               |
| ---- | --------- | ------------------------- |
| 0    | `Unknown` | An unknown error occurred |

## Validation Errors (1xxx)

| Code | Name              | Description                             |
| ---- | ----------------- | --------------------------------------- |
| 1001 | `InvalidPayload`  | The request payload is invalid          |
| 1002 | `PayloadTooLarge` | The request payload exceeds size limits |
| 1003 | `MissingField`    | A required field is missing             |
| 1004 | `InvalidType`     | A field has an invalid type             |
| 1005 | `OutOfBounds`     | A value is outside acceptable bounds    |

## Business Logic Errors (2xxx)

| Code | Name                    | Description                               |
| ---- | ----------------------- | ----------------------------------------- |
| 2001 | `RateLimited`           | Too many requests, please slow down       |
| 2002 | `Cooldown`              | Action is on cooldown                     |
| 2003 | `InvalidState`          | Invalid state for this operation          |
| 2004 | `NotFound`              | The requested resource was not found      |
| 2005 | `AlreadyExists`         | The resource already exists               |
| 2006 | `InsufficientResources` | Insufficient resources for this operation |
| 2007 | `FeatureDisabled`       | This feature is currently disabled        |

## Protocol Errors (3xxx)

| Code | Name               | Description                                          |
| ---- | ------------------ | ---------------------------------------------------- |
| 3001 | `ProtocolMismatch` | Client and server protocol versions are incompatible |
| 3002 | `ClientOutdated`   | Client version is too old                            |
| 3003 | `ServerOutdated`   | Server version is too old                            |

## Authorization Errors (4xxx)

| Code | Name             | Description                          |
| ---- | ---------------- | ------------------------------------ |
| 4001 | `Unauthorized`   | Authentication required              |
| 4002 | `Forbidden`      | Insufficient permissions             |
| 4003 | `SessionExpired` | Session has expired, rejoin required |

## Internal Errors (5xxx)

| Code | Name                 | Description                            |
| ---- | -------------------- | -------------------------------------- |
| 5001 | `InternalError`      | An internal server error occurred      |
| 5002 | `ServiceUnavailable` | The service is temporarily unavailable |
| 5003 | `Timeout`            | The operation timed out                |
| 5004 | `DataStoreFailed`    | DataStore operation failed             |

## Adding New Error Codes

1. Add the error code to the `ErrorCode` enum in `packages/shared-types/src/index.ts`
2. Follow the range conventions above
3. Never reuse or change existing codes (breaking change)
4. Regenerate this document:

```bash
node tools/generate-error-catalog.mjs > docs/reference/error-codes.md
```

---

_Last updated: 2026-03-12_
