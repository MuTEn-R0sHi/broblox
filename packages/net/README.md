# @rbx/net

Networking utilities for secure client-server communication.

## Purpose

This package provides:

- **Schema validation** for incoming payloads
- **Rate limiting** with token bucket algorithm
- **Remote registry** as single source of truth
- **Protocol handshake** support

## Dependencies

- `@rbx/shared-types` - For Result type and ErrorCode enum
- `@rbxts/t` - For runtime type checking

## Key Features

### Runtime Validation

Never trust client input. Validate all incoming payloads using `@rbxts/t` schemas and the `validate` helper:

```typescript
import { validate, bounded } from "@rbx/net";
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

Prevent abuse with per-player token bucket rate limiting:

```typescript
import { RateLimiter } from "@rbx/net";

const limiter = new RateLimiter({
  windowMs: 1000, // 1 second window
  maxRequests: 5, // 5 requests per second
  burstAllowance: 2, // optional burst
});

// Check rate limit
const result = limiter.check(player.UserId);
if (!result.ok) {
  return result; // Client rate limited (includes retryAfterMs)
}

print(`Remaining: ${result.value.remaining}`);

// Optional: reset limit for player
limiter.reset(player.UserId);
```

### Remote Registry

Single source of truth for all remote endpoints:

```typescript
import { REMOTES } from "@rbx/net";

// Server: create remotes from registry
const remote = new Instance("RemoteFunction");
remote.Name = REMOTES.Handshake.name;

// Client: reference remotes from registry
const remote = folder.WaitForChild(REMOTES.Handshake.name);

// Rate limit config attached to each remote
const rateLimitConfig = REMOTES.Handshake.rateLimit;
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

**RateLimiter class:**

- `constructor(config: RateLimitConfig)`
- `check(playerId: number): Result<{ remaining: number }>`
- `reset(playerId: number): void`

**RateLimitConfig:**

```typescript
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  burstAllowance?: number; // Optional burst tokens
}
```

### Types

- `DoActionPayload` - Generic action payload
- `HandshakePayload` - Protocol handshake payload
- `REMOTES` - Remote endpoint registry (readonly)

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

This package sits between `@rbx/core` and game code. It provides the secure networking layer but doesn't handle game-specific logic.

See [docs/architecture/networking.md](../../docs/architecture/networking.md) for design details.
