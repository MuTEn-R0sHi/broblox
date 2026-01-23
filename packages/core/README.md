# @rbx/core

Core utilities and primitives for the platform runtime.

## Purpose

This package provides fundamental building blocks used across all games:

- **Logging** with structured output
- **Resource cleanup** (Janitor pattern)
- **Clock/time utilities**

## Dependencies

- `@rbx/shared-types` - For branded types and error codes

This package must NOT depend on:

- Roblox services directly (use adapters in game code)
- `@rbx/net`
- `@rbx/config-featureflags`

## API Reference

### Application

Lifecycle management for Services (Server) and Controllers (Client).

```typescript
import { Application, Service } from "@rbx/core";

const MyService: Service = {
  onInit() {
    print("Init");
  },
  onStart() {
    print("Start");
  },
};

Application.register(MyService);
Application.boot();
```

### Logger

Structured logging with severity levels:

```typescript
import { createLogger } from "@rbx/core";

const logger = createLogger("MySystem");

logger.debug("Detailed debug information");
logger.info("General information");
logger.warn("Warning message");
logger.error("Error occurred");
```

**Output format**: `[Name] [LEVEL] message`

### Janitor

Resource cleanup utility for managing connections, instances, and callbacks:

```typescript
import { Janitor } from "@rbx/core";

const janitor = new Janitor();

// Add cleanup tasks
janitor.add(() => print("Cleanup!"));

// Track connections
const connection = workspace.ChildAdded.Connect(() => {});
janitor.addConnection(connection);

// Track instances
const part = new Instance("Part");
janitor.addInstance(part);

// Cleanup everything
janitor.cleanup(); // or janitor.destroy()
```

**Methods:**

- `add(task: () => void): void` - Add cleanup callback
- `addConnection(connection: RBXScriptConnection): void` - Track connection
- `addInstance(instance: Instance): void` - Track instance
- `cleanup(): void` - Execute all cleanup tasks
- `destroy(): void` - Alias for cleanup

### Clock

Time utilities:

```typescript
import { Clock } from "@rbx/core";

const elapsed = Clock.now(); // os.clock() - high precision
const timestamp = Clock.timestamp(); // os.time() - unix timestamp
```

## Architecture Notes

This package contains **pure domain utilities** that are engine-agnostic where possible. When Roblox-specific APIs are needed (like RBXScriptConnection), they're used minimally.

For dependency injection, lifecycle management, and service orchestration, see the game-level bootstrap code in `games/*/src/server/` or `games/*/src/client/`.

See [docs/architecture/clean-architecture.md](../../docs/architecture/clean-architecture.md) for principles.
