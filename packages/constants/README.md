# @rbx/constants

Centralized configuration constants for the BroBlox platform.

## Purpose

This package provides a single source of truth for:

- **Timeouts**: Network, session, and cooldown durations
- **Limits**: Payload sizes, array bounds, rate limits
- **Build Info**: Version, environment, feature flags
- **Validation**: Helper functions for common validation patterns

## Usage

```typescript
import {
  REMOTES_WAIT_TIMEOUT_SECONDS,
  TIMESTAMP_TOLERANCE_MS,
  BUILD_ID,
  isValidActionId,
} from "@rbx/constants";

// Use constants instead of magic numbers
const folder = ReplicatedStorage.WaitForChild("Remotes", REMOTES_WAIT_TIMEOUT_SECONDS);

// Validate with provided helpers
if (!isValidActionId(payload.actionId)) {
  return err(ErrorCode.InvalidPayload);
}
```

## Categories

### Timeouts (`timeouts.ts`)

- Client-side timeouts (remote waits, retries)
- Server-side timeouts (sessions, saves)
- Cooldowns

### Limits (`limits.ts`)

- Payload size limits
- Timestamp validation bounds
- Vector magnitude limits
- Rate limits
- Collection size limits

### Build (`build.ts`)

- Version information
- Environment detection
- Feature flags

### Validation (`validation.ts`)

- String/number range checks
- Timestamp validation
- Device class validation
- Clamping utilities

## Dependencies

This package has **no dependencies** and must remain pure.
