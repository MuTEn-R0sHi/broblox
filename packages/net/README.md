# @broblox/net

Networking utilities for secure client-server communication.

## Purpose

This package provides:

- **Schema validation** for incoming payloads
- **Rate limiting** with token bucket algorithm
- **Remote registry** as single source of truth
- **Protocol handshake** support

## Dependencies

- `@broblox/shared-types` - For Result type and ErrorCode enum
- `@rbxts/t` - For runtime type checking

## Key Features

### Runtime Validation

Never trust client input. Validate all incoming payloads using `@rbxts/t` schemas and the `validate` helper:

```typescript
import { validate, bounded } from "@broblox/net";
import { t } from "@rbxts/t";

const handshakeSchema = t.strictInterface({
  protocolVersion: t.number,
  buildId: bounded.string(64, 1),
  deviceClass: t.union(t.literal("kbm"), t.literal("gamepad"), t.literal("touch")),
});

const result = validate(handshakeSchema, payload);
if (!result.ok) {
  return result; // Return error to client
}

// Safe to use validated data
const { protocolVersion, buildId, deviceClass } = result.value;
```

### Rate Limiting

Rate limiting is built into the registry and enforced automatically per endpoint. Configure `rateLimit` on each remote definition; the registry creates a token-bucket limiter per endpoint and fires the `onRateLimited` callback on every hit.

The `RateLimiter` class is available for advanced manual use outside the registry:

```typescript
const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5, burstAllowance: 2 });
const result = limiter.check(player.UserId);
if (!result.ok) return result; // includes retryAfterMs
```

### Remote Registry

`createServerRegistry` is the server entry point. Pass an optional options object to configure folder name and the security/telemetry hook:

```typescript
import { createServerRegistry } from "@broblox/net";
import { reportViolation } from "@broblox/security";

const registry = createServerRegistry(MyRemotes, {
  folderName: "MyGameRemotes", // optional, default: "Remotes"
  onRateLimited: (player, endpoint, retryAfterMs) => {
    // Route every rate-limit hit into the security violation pipeline
    reportViolation(player, "rate-abuse", "medium", `Rate-limited on '${endpoint}'`, {
      endpoint,
      retryAfterMs,
    });
  },
});

registry.initialize(); // call in onInit()
```

**Current remotes:**

- `Handshake` - Protocol version negotiation (3 req/min)
- `DoAction` - Generic player action intent (5 req/sec)

## API Reference

### Validation Functions

- `validate<T>(guard: t.check<T>, value: unknown): Result<T>`
- `bounded` helpers: `number`, `string`, `array`, `vector3`
- `validateDoActionPayload(value: unknown): Result<DoActionPayload>`
- `validateHandshakePayload(value: unknown): Result<HandshakePayload>`

### Rate Limiting

**`RateLimiter` class (for advanced manual use):**

- `constructor(config: RateLimitConfig)`
- `check(playerId: number): Result<{ remaining: number }>`
- `reset(playerId: number): void`

**`RateLimitConfig`:**

```typescript
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  burstAllowance?: number; // Optional burst tokens
}
```

### `createServerRegistry` Options

```typescript
createServerRegistry<T>(registry: T, options?: {
  folderName?: string;    // ReplicatedStorage folder (default: "Remotes")
  onRateLimited?: (player: Player, endpoint: string, retryAfterMs: number) => void;
}): ServerRemoteRegistry<T>
```

`onRateLimited` is the bridge between the network layer and `@broblox/security`. Every rate-limit drop fires this callback, letting you call `reportViolation` to feed the enforcer pipeline:

```
Client request → rate limit hit → onRateLimited → reportViolation → Enforcer → kick/ban
```

### Types

- `DoActionPayload` - Generic action payload (with optional `payload: unknown`)
- `HandshakePayload` - Protocol handshake payload
- `RemoteRegistry` - Base type for remote definition maps

## Security Principles

1. **Validate everything** - Use validation functions for all incoming data
2. **Rate limit everything** - Every remote must have rate limiting
3. **Return stable error codes** - Use ErrorCode enum, never throw
4. **Clamp numeric inputs** - Always check bounds
5. **Limit string sizes** - Prevent memory exhaustion

See [docs/security/threat-model.md](../../docs/security/threat-model.md) for full security model.

## Adding New Endpoints

1. Add entry to `REMOTES` registry with rate limit config
2. Define payload interface
3. Write validation function with tests
4. Update [docs/architecture/networking-schema-catalog.md](../../docs/architecture/networking-schema-catalog.md)

## Architecture Notes

This package sits between `@broblox/core` and game code. It provides the secure networking layer but doesn't handle game-specific logic.

See [docs/architecture/networking.md](../../docs/architecture/networking.md) for design details.
