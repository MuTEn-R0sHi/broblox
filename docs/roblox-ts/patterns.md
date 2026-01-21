# Roblox-TS: Patterns

## Platform lifecycle pattern

Our custom framework (see ADR-0006) uses explicit lifecycle methods.

### Service interface

```typescript
// packages/core/src/lifecycle.ts
export interface Service {
  /** 
   * Called during boot, before any player joins.
   * Order-independent between services.
   * Use for: setting up data structures, registering listeners.
   */
  init?(container: Container): void;
  
  /**
   * Called after all services have initialized.
   * Safe to call other services.
   * Use for: starting loops, initial state loading.
   */
  start?(): void;
  
  /**
   * Called on server shutdown or when service is destroyed.
   * Use for: cleanup, saving state, disconnecting listeners.
   */
  destroy?(): void;
}
```

### Boot sequence (server)

```typescript
// games/starter/src/server/main.server.ts
import { createContainer } from "@rbx/core";
import { services } from "./services";

const container = createContainer();

// Phase 1: Initialize all services (order-independent)
for (const service of services) {
  service.init?.(container);
}

// Phase 2: Start all services (can now safely interact)
for (const service of services) {
  service.start?.();
}

// Handle shutdown
game.BindToClose(() => {
  for (const service of services) {
    service.destroy?.();
  }
});
```

### Controller interface (client)

```typescript
// Similar pattern for client-side controllers
export interface Controller {
  init?(container: Container): void;
  start?(): void;
  destroy?(): void;
}
```

### Example service

```typescript
// games/starter/src/server/services/ActionService.ts
import { Service } from "@rbx/core";
import { registerHandler } from "@rbx/net";
import { REMOTES } from "@rbx/net/registry";

export class ActionService implements Service {
  private playerCounts = new Map<number, number>();
  
  init(container: Container) {
    // Register remote handler
    registerHandler(REMOTES.Intent_DoAction, (player, payload) => {
      return this.handleDoAction(player, payload);
    });
  }
  
  start() {
    // Service is ready, can interact with other services
  }
  
  destroy() {
    // Cleanup
    this.playerCounts.clear();
  }
  
  private handleDoAction(player: Player, payload: unknown) {
    // ... implementation
  }
}
```

## Networking pattern

- All remotes are defined in `net` registry.
- Game code uses typed stubs, not raw `RemoteEvent` access.
- See `docs/architecture/networking-schema-catalog.md` for the golden path example.

### Remote registration

```typescript
// packages/net/src/server.ts
export function registerHandler<T extends keyof RemoteRegistry>(
  remote: T,
  handler: RemoteHandler<T>
) {
  // 1. Get or create RemoteEvent
  // 2. Apply rate limiting middleware
  // 3. Apply validation middleware
  // 4. Connect handler
}
```

### Client calling

```typescript
// packages/net/src/client.ts
export function callRemote<T extends keyof RemoteRegistry>(
  remote: T,
  payload: RemotePayload<T>
): Promise<RemoteResponse<T>> {
  // 1. Get RemoteEvent/RemoteFunction
  // 2. Send payload
  // 3. Await response (for request/response pattern)
}
```

## Security-by-default

- Default deny: if a remote is not in the registry, it does not exist.
- Validation and rate limiting are middleware, not ad-hoc checks.
- Never trust client-sent values without validation and bounds checking.

### Validation pattern

```typescript
// Always validate at the boundary
function handleRemote(player: Player, rawPayload: unknown) {
  // Step 1: Schema validation
  const validation = validate(schema, rawPayload);
  if (!validation.ok) {
    return { ok: false, code: ErrorCode.InvalidPayload };
  }
  
  // Step 2: Bounds validation
  const payload = validation.value;
  if (payload.someNumber < 0 || payload.someNumber > 100) {
    return { ok: false, code: ErrorCode.InvalidPayload };
  }
  
  // Step 3: State validation
  if (!canPlayerDoThis(player)) {
    return { ok: false, code: ErrorCode.InvalidState };
  }
  
  // Step 4: Execute
  return executeAction(player, payload);
}
```

## UI kit usage

- Central design tokens (spacing, typography, color).
- Device-safe layout rules:
  - safe areas
  - scalable text
  - controller navigation

## Competitive PvP patterns

- Client prediction for feel.
- Server arbitration for outcomes.
- Limited lag compensation (bounded rewind window, simplified hitboxes).
- See `docs/architecture/hit-validation.md` for details.

## Error handling pattern

Never throw across trust boundaries. Always return `Result<T>`:

```typescript
// Good
function processIntent(payload: unknown): Result<Output> {
  if (!isValid(payload)) {
    return { ok: false, code: ErrorCode.InvalidPayload };
  }
  return { ok: true, value: doThing(payload) };
}

// Bad - never do this
function processIntent(payload: unknown): Output {
  if (!isValid(payload)) {
    throw new Error("Invalid payload"); // Exploiter sees this!
  }
  return doThing(payload);
}
```

## Cleanup pattern

Always clean up connections and listeners:

```typescript
// packages/core/src/cleanup.ts
export class Janitor {
  private items: (() => void)[] = [];
  
  add(cleanup: () => void) {
    this.items.push(cleanup);
  }
  
  addConnection(connection: RBXScriptConnection) {
    this.items.push(() => connection.Disconnect());
  }
  
  destroy() {
    for (const cleanup of this.items) {
      cleanup();
    }
    this.items = [];
  }
}

// Usage in a service
class MyService implements Service {
  private janitor = new Janitor();
  
  init() {
    this.janitor.addConnection(
      Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player))
    );
  }
  
  destroy() {
    this.janitor.destroy();
  }
}
```
