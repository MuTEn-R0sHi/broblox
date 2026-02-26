# Modules: Input

Unified input abstraction for Roblox games supporting keyboard/mouse, gamepad, and touch controls (`@broblox/input`). **Status: Implemented**.

## Purpose

- Abstract platform-specific input APIs behind a unified action-binding system.
- Support all three Roblox device classes (keyboard/mouse, gamepad, touch).
- Enable rebindable controls for accessibility.
- Prevent device-specific competitive advantages unless explicitly designed.

## Public API

### Device Detection

Detect the player's active input device class at runtime.

### Action Bindings

Define named actions (e.g. `"jump"`, `"attack"`, `"interact"`) and bind them to device-specific inputs. Supports default bindings per device class with player-overridable rebinding.

### Input Manager

Central manager that processes raw input events, resolves bindings, and dispatches action callbacks.

```typescript
import { InputManager } from "@broblox/input";
```

## Dependencies

- `@broblox/core` — Logger, lifecycle

## Testing

- Test suite covering device detection, action binding/unbinding, and input manager dispatch.

## See Also

- [Device matrix & controls](../architecture/device-matrix-and-controls.md) — architecture-level device support rules
- [Reference: Input system](../reference/input.md) — detailed API reference
