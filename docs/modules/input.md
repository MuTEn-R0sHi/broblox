# Modules: Input

Unified input abstraction for Roblox games supporting keyboard/mouse, gamepad, and touch controls (`@broblox/input`). **Status: Implemented**.

## Purpose

- Abstract platform-specific input APIs behind a unified action-binding system.
- Support all three Roblox device classes (keyboard/mouse, gamepad, touch).
- Enable rebindable controls for accessibility.
- Prevent device-specific competitive advantages unless explicitly designed.

## Public API

### createInputController()

Factory function that returns a `Controller`-compatible handle for the input system, following the same factory pattern as server-side packages (`createCombatService`, `createQuestService`, etc.).

```typescript
import { createInputController } from "@broblox/input";

const input = createInputController();
// input.Controller — register with lifecycle system
// input.getMovementState() — current movement state
// input.getMoveVector() — normalized movement vector
// input.isMoving() — whether player is moving
// input.isActionActive(name) — check if action is pressed
// input.onAction(name, callback) — subscribe to action events
// input.getCurrentDevice() — "keyboard" | "gamepad" | "touch"
// input.detectDeviceClass() — "kbm" | "gamepad" | "touch"
```

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
