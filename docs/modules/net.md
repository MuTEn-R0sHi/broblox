# Modules: Net

Networking layer — remote events, rate limiting, and serialization (`@rbx/net`). **Status: Implemented** (~106 tests).

## Purpose

- Secure client-server communication with validation and rate limiting.
- Centralize all remote definitions in a single registry (`REMOTES`).
- Provide protocol negotiation via handshake before gameplay remotes are accepted.
- Reusable across games — each game extends the base remote registry.

## Public API

### Validation

- `validate(schema, value)` — runtime type assertion via `@rbxts/t`.
- `bounded(min, max)` — numeric range guard.

### Rate limiting

- `RateLimiter` — per-player token bucket with configurable capacity and refill rate.

### Remote registry

- `REMOTES` — single source of truth for remote definitions (`Handshake`, `DoAction`).
- Server/client remote types derived from the registry for full type safety.

### Service factories

- `createRemoteService(config)` — wires up remote endpoints with validation and rate limiting.

### Protocol

- `PROTOCOL_VERSION` / `MIN_PROTOCOL_VERSION` — version constants for client-server compat.
- Version negotiation: clients send their version, server accepts or rejects.

### Client utilities

- Timeout and retry helpers for remote calls.

## Dependencies

- `@rbx/core` (service lifecycle, logging).
- `@rbx/shared-types` (Result type, error codes, protocol constants).
- `@rbx/constants` (timeout and validation constants).
- `@rbxts/t` (runtime type checking).

## Data ownership

Net owns no persistent data. Session state is in-memory per server.

## Trust & security

- All remote payloads are validated server-side before processing.
- Rate limiter drops excess requests per player per endpoint.
- Handshake must complete before any gameplay remotes are accepted.
- Untrusted payloads never reach game logic.

## Configuration

- `net.rateLimitCapacity` — token bucket size per endpoint.
- `net.rateLimitRefill` — tokens per second.
- `net.handshakeTimeout` — max time to complete handshake.

## Observability

- `net.remote_received` — payload received (sampled).
- `net.rate_limit_hit` — player exceeded rate limit.
- `net.handshake_completed` / `net.handshake_failed`.
- `net.validation_error` — payload failed schema check.

## Testing

~106 unit tests covering validation helpers, rate limiter token math, remote service factory, handshake protocol, and client retry logic.
