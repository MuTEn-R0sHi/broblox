# ADR-0006: Framework choice — custom vs Flamework

## Status

Accepted

## Context

The roblox-ts ecosystem has several framework options for structuring game code:

| Framework     | Description                                                                |
| ------------- | -------------------------------------------------------------------------- |
| **Flamework** | Decorator-based DI, lifecycle management, auto-generated networking guards |
| **Knit**      | Service/controller pattern, simpler than Flamework                         |
| **Custom**    | Roll our own lifecycle, DI, and patterns                                   |

We need to decide whether to adopt an existing framework or build a minimal custom layer.

## Decision

We will use a **custom minimal framework** for Phase 1-2, with architecture compatible with potential Flamework adoption later.

### Custom layer scope

- `packages/core`: lifecycle primitives (`init`, `start`), cleanup helpers, logging interface
- `packages/net`: remote registry, validation middleware, rate limiting
- Games: service/controller pattern with explicit registration

### Why not Flamework now

1. **Control over networking**: Our security requirements demand explicit control over validation, rate limiting, and error codes. Flamework's networking is convenient but abstracts away details we need to audit.

2. **Learning curve**: Flamework's decorator-based approach requires understanding TypeScript transformers and Flamework-specific patterns. A simpler explicit approach is easier to onboard contributors.

3. **Flexibility**: Phase 1 scope is small. We can evaluate Flamework for Phase 3+ when we have more games and clearer patterns.

4. **Not precluded**: Our patterns (services with `init`/`start`, typed remotes) are compatible with Flamework migration if we choose it later.

### Why not Knit

Knit is simpler but less actively maintained in the roblox-ts ecosystem. Flamework is the more likely future choice if we adopt a framework.

## Implementation

### Lifecycle pattern

```typescript
// Service definition
export interface Service {
  /** Called during boot, before any player joins. Order-independent. */
  init?(container: Container): void;
  /** Called after all services init. Safe to call other services. */
  start?(): void;
  /** Called on shutdown or when service is destroyed. */
  destroy?(): void;
}

// Boot sequence (server)
for (const service of services) service.init?.(container);
for (const service of services) service.start?.();
```

### Compatibility path

If we adopt Flamework later:

- Services become `@Service()` decorated classes
- `init` maps to `onInit`
- `start` maps to `onStart`
- Networking migrates to Flamework's module with custom middleware

## Alternatives considered

### Full Flamework from day one

Pros: Rich ecosystem, auto guards, mature patterns.
Cons: Steeper learning curve, less control over networking internals, harder to audit.

Rejected for Phase 1; may reconsider for Phase 3+.

### No framework (ad-hoc)

Rejected: leads to inconsistent patterns across games.

## Consequences

- More boilerplate than Flamework (explicit registration, manual guards)
- Full control over security-critical paths
- Easier to understand and audit
- Migration cost if we adopt Flamework later (estimated 1-2 weeks for platform packages)

## Rollout plan

1. Implement lifecycle primitives in `packages/core`
2. Document service/controller pattern in `docs/roblox-ts/patterns.md`
3. Evaluate Flamework adoption at Phase 3 retrospective
