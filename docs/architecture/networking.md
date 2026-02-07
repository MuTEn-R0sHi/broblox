# Architecture: Networking

Networking is the primary exploit surface. We treat it like a public API.

## Goals

- Typed, versioned, schema-validated remotes
- Rate limiting and abuse penalties
- Protocol compatibility for staged rollouts

## Remote contract rules

- Every remote has:
  - name (stable)
  - direction (client→server or server→client)
  - payload schema (runtime-validated)
  - error codes (stable)
  - rate limit budget

- Server accepts intents, not outcomes:
  - OK: "fire weapon", "activate ability", "move input"
  - NOT OK: "deal 25 damage", "set position", "grant item"

## Remote registry

Single source of truth (implemented in `@rbx/net`):

- A `net` registry defines all remotes in code.
- Registry generates server/client stubs.
- Registry ensures remotes exist under `ReplicatedStorage/Remotes`.

## Validation

Server-side validation is mandatory. We use `@rbxts/t` to define runtime schemas for strict type checking.

1.  **Schema Validation**: Checked immediately upon network receipt.
    - Type checks (string, number, boolean)
    - Constraint checks (min/max length, integer bounds)
    - Structure checks (required keys, no unknown fields)
2.  **State Validation**: Checked during logic execution.
    - Cooldowns, ammo, range checks.
    - Game phase state.

Reject unknown fields to reduce payload abuse.

### Example Schema

```typescript
const handshakeSchema = t.strictInterface({
  protocolVersion: t.number,
  buildId: t.string,
  deviceClass: t.union(t.literal("kbm"), t.literal("gamepad"), t.literal("touch")),
});
```

## Rate limiting

Token bucket per:

- player + endpoint
- global endpoint budget

### Implementation details

**State location**: Rate limit state is stored **in-memory per server instance**. This is simple, fast, and sufficient because:

- Most abuse is detectable within a single server session
- Cross-server coordination adds latency and complexity
- Persistent abusers are caught via aggregated analytics (Phase 2+)

**On teleport/server hop**: Rate limit budgets are **reset**. A player teleporting to a new server gets fresh budgets. This is acceptable because:

- Teleport itself is rate-limited
- Aggregated analytics detect hop-based abuse patterns
- Strict per-server limits still bound damage

**Token bucket parameters** (per endpoint):

```typescript
interface RateLimitConfig {
  windowMs: number; // e.g., 1000 (1 second)
  maxRequests: number; // e.g., 10
  burstAllowance?: number; // e.g., 3 (allow small bursts)
}
```

**Penalties** (configurable):

- log + score signal
- throttle (delay responses)
- kick (when clearly malicious)

## Protocol versioning

- Client embeds `PROTOCOL_VERSION`.
- Server advertises `min/max` supported.
- Handshake decides:
  - continue
  - degrade features
  - force update (incompatible)

## Client utilities

The `@rbx/net` package provides utilities for reliable remote calls:

### Retry with backoff

```typescript
import { withRetry } from "@rbx/net";

const result = await withRetry(() => Remotes.fetchInventory(), { maxAttempts: 3, backoffMs: 1000 });
```

### Timeout wrapper

```typescript
import { withTimeout } from "@rbx/net";

const result = await withTimeout(() => Remotes.slowOperation(), { timeoutMs: 5000 });
```

## PvP specifics

- Inputs are sent at a fixed rate (batched), not spammed.
- Server snapshots are applied with interpolation on client.
- Hit validation:
  - server raycasts/projectile sim
  - optional lag compensation (bounded rewind window)

## Error model

Never throw across remotes.

- Responses use the [Result type](../reference/result-types.md) with `ok: boolean` and stable numeric `code`.
- Messages may include `retryAfterMs` for rate limits.
- See [Error Codes Reference](../reference/error-codes.md) for the complete list.
