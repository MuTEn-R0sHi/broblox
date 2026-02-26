# Modules: Constants

Centralized numeric constants, timeouts, limits, and validation helpers for the platform (`@broblox/constants`). **Status: Implemented**.

## Purpose

- Single source of truth for magic numbers used across packages and games.
- Zero-dependency package (pure constants, safe for both Roblox and Node.js).
- Roblox-specific validation helpers that compile to Luau.

## Public API

### Limits

Numeric constants for payload sizes, string lengths, and entity counts used in validation and bounds checking.

### Timeouts

Timeout values (in milliseconds/seconds) for rate limiting windows, session expiry, cache TTLs, and retry intervals.

### Build Metadata

```typescript
import { isDevelopment, isStaging, isProduction, isDebugEnabled } from "@broblox/constants";

if (isDevelopment()) {
  /* dev-only logic */
}
```

### Validation Helpers

```typescript
import {
  isValidStringLength,
  isValidNumberRange,
  isValidActionId,
  isValidTimestamp,
  clamp,
} from "@broblox/constants";

isValidStringLength("test", 1, 100); // true
clamp(150, 0, 100); // 100
```

## Dependencies

None — this is a leaf package with no imports.

## Testing

- `constants.test.ts` — verifies all limit/timeout constants are positive numbers, tests all validation helper functions at boundaries.
