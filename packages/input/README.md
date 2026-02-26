# @broblox/input

Input abstraction for Roblox games — unified keyboard, gamepad, and touch controls.

## Purpose

This package provides a device-agnostic input system:

- **Unified actions** — Same code handles all input devices
- **Rebindable controls** — Players can customize bindings
- **Device detection** — Automatic UI adaptation
- **Touch support** — Virtual joysticks and buttons

## Features

### Action System

Define actions once, bind to multiple inputs:

```typescript
import { InputAction, InputManager } from "@broblox/input";

// Actions are device-agnostic
const actions = {
  MoveForward: { name: "move_forward", category: "movement" },
  Jump: { name: "jump", category: "movement" },
  Fire: { name: "fire", category: "combat" },
};

// Bindings map actions to device inputs
const bindings = {
  keyboard: {
    MoveForward: [Enum.KeyCode.W],
    Jump: [Enum.KeyCode.Space],
    Fire: [Enum.UserInputType.MouseButton1],
  },
  gamepad: {
    MoveForward: [Enum.KeyCode.Thumbstick1],
    Jump: [Enum.KeyCode.ButtonA],
    Fire: [Enum.KeyCode.ButtonR2],
  },
};
```

### Device Detection

```typescript
import { DeviceManager } from "@broblox/input";

// Get current input device
const device = DeviceManager.getCurrentDevice();
// Returns: "keyboard" | "gamepad" | "touch"

// React to device changes
DeviceManager.onDeviceChanged.Connect((newDevice) => {
  // Update UI prompts, etc.
});
```

### Movement State

```typescript
import { InputManager } from "@broblox/input";

// Get normalized movement vector
const movement = InputManager.getMovementState();
// { direction: Vector2, magnitude: number, isRunning: boolean }
```

## Related Docs

- [Device Matrix & Controls](../../docs/architecture/device-matrix-and-controls.md)
- [Input Reference](../../docs/reference/input.md)
