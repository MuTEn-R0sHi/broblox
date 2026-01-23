# Roblox-TS: Patterns

## Platform lifecycle pattern

Our custom framework uses explicit lifecycle methods via the `Application` bootstrapper.

### Service interface

```typescript
// packages/core/src/application.ts
export interface Service {
  /**
   * Called synchronously during boot.
   * Order-independent between services.
   * Use for: setting up events, signal connections.
   * DO NOT YIELD here.
   */
  onInit?(): void;

  /**
   * Called asynchronously after all services have initialized.
   * Safe to call other services.
   * Use for: starting game loops, data loading.
   */
  onStart?(): void;
}
```

### Boot sequence (server)

```typescript
// games/starter/src/server/main.server.ts
import { Application } from "@rbx/core";

// Import services to ensure side-effects run (loading into Application)
import "./services/ActionService";
import "./services/HandshakeService";

Application.boot();
```

### Controller interface (client)

```typescript
// Similar pattern for client-side controllers
export interface Controller {
  onInit?(): void;
  onStart?(): void;
}
```

### Example service

We prefer **Singletons** defined as objects over classes for simpler dependency management in Roblox-TS.

```typescript
// games/starter/src/server/services/ActionService.ts
import { Service, createLogger } from "@rbx/core";

const logger = createLogger("ActionService");

export const ActionService: Service = {
  onInit() {
    logger.info("Initializing");
    // Register type-safe event listeners here
  },

  onStart() {
    logger.info("Starting");
    // Start main logic loops here
  },
};
```

## Networking pattern

- All remotes are defined in `packages/net/src/remotes.ts`.
- `RemoteService` (Server) and `RemoteController` (Client) act as the gateways.
- Validation is explicit and typed using `@rbxts/t`.

### Remote registration

```typescript
// Server Service
import { RemoteService } from "./RemoteService";
import { validateMyPayload, ok, err } from "@rbx/net";

RemoteService.Remotes.MyRemote.OnServerInvoke = (player, payload) => {
  const result = validateMyPayload(payload);
  if (!result.ok) {
    return err(ErrorCode.InvalidPayload); // Fast fail
  }

  // Safe to use result.value
  return ok(logic(result.value));
};
```

### Client calling

```typescript
// Client Controller
import { RemoteController } from "./RemoteController";
import { ok } from "@rbx/net";

const result = RemoteController.Remotes.MyRemote.InvokeServer(payload);
if (result.ok) {
  print("Success:", result.value);
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
    this.janitor.addConnection(Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player)));
  }

  destroy() {
    this.janitor.destroy();
  }
}
```
