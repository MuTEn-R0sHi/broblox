# Reference: Configuration

## Types of configuration

- **Build-time constants**: Numeric values compiled into the client/server via `@rbx/constants`
- **Runtime config**: Fetched/replicated config snapshots
- **Feature flags**: Kill-switches and rollouts via `@rbx/config-featureflags`

## Constants Package (`@rbx/constants`)

The constants package provides centralized, type-safe constants:

```typescript
import {
  REMOTE_INVOKE_TIMEOUT_MS,
  HANDSHAKE_MAX_RETRIES,
  MAX_PAYLOAD_SIZE_BYTES,
  BUILD_ID,
} from "@rbx/constants";
```

### Timeout Constants

| Constant                       | Value | Description             |
| ------------------------------ | ----- | ----------------------- |
| `REMOTES_WAIT_TIMEOUT_SECONDS` | 30    | Wait for remotes folder |
| `REMOTE_INVOKE_TIMEOUT_MS`     | 10000 | Remote call timeout     |
| `HANDSHAKE_RETRY_DELAY_MS`     | 2000  | Delay between retries   |
| `HANDSHAKE_MAX_RETRIES`        | 3     | Max retry attempts      |
| `SESSION_EXPIRY_SECONDS`       | 300   | Session timeout         |
| `SHUTDOWN_TIMEOUT_SECONDS`     | 30    | BindToClose timeout     |

### Limit Constants

| Constant                 | Value | Description         |
| ------------------------ | ----- | ------------------- |
| `MAX_PAYLOAD_SIZE_BYTES` | 1024  | Max remote payload  |
| `TIMESTAMP_TOLERANCE_MS` | 5000  | Allowed clock drift |
| `TIMESTAMP_MAX_AGE_MS`   | 30000 | Max timestamp age   |
| `MAX_POSITION_MAGNITUDE` | 10000 | Max position vector |
| `MAX_VELOCITY_MAGNITUDE` | 1000  | Max velocity vector |

## Feature Flags (`@rbx/config-featureflags`)

Feature flags provide runtime toggles with type safety:

```typescript
import { FeatureFlags, validateFeatureFlags } from "@rbx/config-featureflags";

const config: FeatureFlags = {
  newMatchmaking: true,
  maxPlayersPerServer: 50,
  betaFeatures: false,
};

const result = validateFeatureFlags(config);
if (!result.valid) {
  console.error("Invalid config:", result.errors);
}
```

## Environment separation

Recommended environments:

- `dev` - Local development
- `stage` - Testing/QA
- `prod` - Production

Rules:

- Never share credentials across environments.
- Prefer separate universes for hard isolation.

## Config validation

- Every config file has a schema.
- Invalid configs fail CI and cannot be promoted.
- Use `validateFeatureFlags()` for runtime validation.

## Sensitive data

- Secrets do not live in the repo.
- The game client never receives secrets.
- Server-only secrets are stored via secure mechanisms (Open Cloud secrets store / backend).

## Build configuration

### TypeScript path mappings (`tsconfig.roblox.json`)

All `@rbx/*` packages are mapped in `tsconfig.roblox.json` so the roblox-ts compiler can resolve cross-package imports:

```json
"paths": {
  "@rbx/shared-types": ["./packages/shared-types/src/index.ts"],
  "@rbx/constants": ["./packages/constants/src/index.ts"],
  "@rbx/core": ["./packages/core/src/index.ts"],
  ...
}
```

**When adding a new package**, add its path mapping here.

### Vitest aliases (`vitest.config.ts`)

Packages compile to `.luau` in `out/`, which Node.js/Vitest can’t import. The root `vitest.config.ts` maps all `@rbx/*` packages to their TypeScript source:

```typescript
alias: {
  "@rbx/shared-types": resolve(__dirname, "packages/shared-types/src/index.ts"),
  "@rbx/core": resolve(__dirname, "packages/core/src/index.ts"),
  ...
}
```

Some packages also have their own `vitest.config.ts` (combat, net, matchmaking) which override the root config. **When adding cross-package dependencies**, ensure the consuming package’s local vitest config includes aliases for all imported packages.

**When adding a new package**, add its alias to both the root config and any package-level configs that import it.
