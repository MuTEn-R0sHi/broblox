```markdown
# ADR-0005: Schema validation library choice

## Status

Accepted

## Context

Every inbound remote payload must be runtime-validated on the server. We need a schema validation approach that:

- Works with roblox-ts (compiles to Luau)
- Provides type inference for TypeScript
- Supports bounds checking (clamped numbers, max array lengths)
- Has minimal runtime overhead
- Produces stable error codes (not exceptions)

Options evaluated:

| Library | Pros | Cons |
|---------|------|------|
| `@rbxts/t` | Lightweight, battle-tested in Roblox ecosystem, composable guards | Manual type inference, no built-in error messages |
| `@rbxts/zod` | Familiar Zod-like API, good error messages | Larger bundle, heavier runtime |
| Flamework guards | Auto-generated from TypeScript types, minimal boilerplate | Requires full Flamework buy-in |
| Custom | Full control, tailored to our error code system | More maintenance, no community support |

## Decision

We will use **`@rbxts/t`** as the foundation, with a thin custom wrapper for:

- Consistent error code mapping (not string messages)
- Bounds validation helpers (clamp, max length)
- Integration with our `Result<T>` type

Rationale:

- `@rbxts/t` is the most widely used validation library in the roblox-ts ecosystem
- It compiles to efficient Luau with minimal overhead
- Custom wrapper gives us control over error semantics without reinventing guards
- Avoids Flamework lock-in while remaining compatible if we adopt it later

## Implementation

### Wrapper interface

```typescript
// packages/net/src/validation.ts
import t from "@rbxts/t";
import { ErrorCode, Result } from "@rbx/shared-types";

export interface ValidationResult<T> {
  ok: true;
  value: T;
} | {
  ok: false;
  code: ErrorCode;
  field?: string;
}

export function validate<T>(
  guard: t.check<T>,
  value: unknown,
  options?: { maxDepth?: number }
): ValidationResult<T>;

// Bound helpers
export const bounded = {
  number: (min: number, max: number) => ...,
  string: (maxLength: number) => ...,
  array: <T>(itemGuard: t.check<T>, maxLength: number) => ...,
  vector3: (maxMagnitude: number) => ...,
};
```

### Error code mapping

Validation failures map to `ErrorCode.InvalidPayload` with optional field path.

Bounds violations map to `ErrorCode.InvalidPayload` (we do not distinguish—exploiters should not get detailed feedback).

## Alternatives considered

### Flamework networking

Flamework's networking module auto-generates type guards from TypeScript types, which is convenient. However:

- It couples us to the full Flamework framework
- We want explicit control over error codes and rate limiting
- We may adopt Flamework later; this decision doesn't preclude it

### Pure custom validation

We could write all guards from scratch, but this would be significant maintenance burden with no benefit over wrapping `@rbxts/t`.

## Consequences

- Must add `@rbxts/t` as a dependency to `packages/net`
- Must implement and test the wrapper before Phase 1 is complete
- All remote handlers must use the validation wrapper, never raw type checks

## Rollout plan

1. Add `@rbxts/t` to `packages/net/package.json`
2. Implement `validation.ts` with wrapper and bounded helpers
3. Add unit tests for validation edge cases
4. Update `networking.md` to reference this wrapper
5. Phase 1 starter game uses the wrapper for all remotes
```
