# Reference: Input System

The `@broblox/input` package provides a unified input abstraction for keyboard, gamepad, and touch controls.

## Installation

```bash
pnpm add @broblox/input
```

## Quick Start

```typescript
import { initInputManager, getMovementState, isActionActive, registerAction } from "@broblox/input";

// Initialize on client
initInputManager();

// Check movement every frame
RunService.Heartbeat.Connect(() => {
  const movement = getMovementState();

  if (movement.isMoving) {
    character.move(movement.direction);
  }

  if (isActionActive("jump")) {
    character.jump();
  }
});
```

## Device Detection

Automatically detect and respond to input device changes.

```typescript
import { getCurrentDevice, onDeviceChange, getPlatformInfo } from "@broblox/input";

// Get current device type
const device = getCurrentDevice(); // "keyboard" | "gamepad" | "touch"

// React to device changes
onDeviceChange((newDevice) => {
  if (newDevice === "gamepad") {
    showGamepadPrompts();
  } else if (newDevice === "touch") {
    showTouchControls();
  } else {
    showKeyboardPrompts();
  }
});

// Get detailed platform info
const platform = getPlatformInfo();
// { platform: "Windows", isMobile: false, hasGamepad: true, hasTouchScreen: false }
```

### Device Types

| Type       | Description                        |
| ---------- | ---------------------------------- |
| `keyboard` | Keyboard and mouse input (desktop) |
| `gamepad`  | Xbox/PlayStation controller        |
| `touch`    | Touch screen (mobile/tablet)       |

## Action System

Define named actions that can be triggered by various inputs.

### Registering Actions

```typescript
import { registerAction, registerCommonActions } from "@broblox/input";

// Register a single action
registerAction({
  name: "attack",
  displayName: "Attack",
  category: "combat",
});

registerAction({
  name: "interact",
  displayName: "Interact",
  category: "gameplay",
  cooldown: 0.5, // 500ms cooldown
});

// Register common actions (jump, sprint, crouch, interact)
registerCommonActions();
```

### Querying Action State

```typescript
import {
  isActionActive,
  isActionJustPressed,
  getActionValue,
  getActionState,
} from "@broblox/input";

// Check if action is currently held
if (isActionActive("sprint")) {
  player.setSprinting(true);
}

// Check if action was just pressed this frame
if (isActionJustPressed("jump")) {
  player.jump();
}

// Get analog value (0-1 for triggers, buttons)
const throttle = getActionValue("accelerate");
car.setThrottle(throttle);

// Get full action state
const state = getActionState("attack");
// { active: true, lastTriggered: 123.456, value: 1, delta: 0 }
```

### Action Callbacks

```typescript
import { onAction, offAction } from "@broblox/input";

// Subscribe to action events
const unsubscribe = onAction("jump", (actionName, state) => {
  if (state.active) {
    print("Jump pressed!");
  } else {
    print("Jump released!");
  }
});

// Later: unsubscribe
unsubscribe();

// Or manually
offAction("jump", callback);
```

## Input Bindings

Map physical inputs to actions.

### Default Bindings

```typescript
import { initDefaultBindings } from "@broblox/input";

// Set up default bindings for common actions
initDefaultBindings();

// Default keyboard bindings:
// - WASD / Arrow keys → movement
// - Space → jump
// - Shift → sprint
// - E → interact
// - Escape → pause

// Default gamepad bindings:
// - Left stick → movement
// - A button → jump
// - Left trigger → sprint
// - X button → interact
// - Start → pause
```

### Custom Bindings

```typescript
import { addBinding, removeBinding, clearBindings, getBindingsForAction } from "@broblox/input";

// Add a keyboard binding
addBinding({
  action: "attack",
  primary: { type: "mouse", button: "MouseButton1" },
  secondary: { type: "key", key: "F" },
  priority: 1,
});

// Add a gamepad binding
addBinding({
  action: "attack",
  primary: { type: "gamepad", button: "ButtonR2" },
  priority: 1,
});

// Get all bindings for an action
const bindings = getBindingsForAction("attack");

// Remove specific binding
removeBinding("attack", { type: "key", key: "F" });

// Clear all custom bindings
clearBindings();
```

### Input Sources

```typescript
// Keyboard keys
{ type: "key", key: "W" }
{ type: "key", key: "Space" }
{ type: "key", key: "LeftShift" }

// Mouse buttons
{ type: "mouse", button: "MouseButton1" }  // Left click
{ type: "mouse", button: "MouseButton2" }  // Right click

// Gamepad buttons
{ type: "gamepad", button: "ButtonA" }
{ type: "gamepad", button: "ButtonX" }
{ type: "gamepad", button: "ButtonR1" }    // Right bumper
{ type: "gamepad", button: "ButtonR2" }    // Right trigger

// Gamepad axes
{ type: "gamepad", axis: "Thumbstick1" }   // Left stick
{ type: "gamepad", axis: "Thumbstick2" }   // Right stick
```

## Movement State

Get unified movement input regardless of device.

```typescript
import { getMovementState } from "@broblox/input";

RunService.Heartbeat.Connect(() => {
  const movement = getMovementState();

  // movement.direction: { x: number, y: number } - normalized
  // movement.magnitude: number (0-1)
  // movement.isMoving: boolean
  // movement.raw: { x: number, y: number } - unnormalized

  if (movement.isMoving) {
    const moveVector = new Vector3(movement.direction.x, 0, movement.direction.y);
    humanoid: Move(moveVector.mul(movement.magnitude));
  }
});
```

### Movement Sources

The movement state automatically combines input from:

- **Keyboard**: WASD and arrow keys
- **Gamepad**: Left thumbstick
- **Touch**: Virtual joystick (when implemented)

## Lifecycle

```typescript
import { initInputManager, shutdownInputManager, initDeviceDetection } from "@broblox/input";

// Initialize (call once on client startup)
initInputManager();

// Or initialize components separately
initDeviceDetection();
initDefaultBindings();
registerCommonActions();

// Cleanup (call on client shutdown)
shutdownInputManager();
```

## Display Names

Get device-appropriate display names for bindings.

```typescript
import { getBindingDisplayName, getActionDisplayHint } from "@broblox/input";

// Get display name for current device
const hint = getActionDisplayHint("jump");
// Keyboard: "Space"
// Gamepad: "A"
// Touch: "Jump"

// Use in UI
promptLabel.Text = `Press ${hint} to jump`;
```

## Common Actions

Pre-defined actions for typical game controls:

```typescript
import { CommonActions } from "@broblox/input";

// CommonActions includes:
// - moveForward, moveBackward, moveLeft, moveRight
// - jump, sprint, crouch
// - interact, attack, secondary
// - pause, inventory
```

## Best Practices

### 1. Initialize Early

```typescript
// In your client entry point
import { initInputManager } from "@broblox/input";

initInputManager();
```

### 2. Use Actions, Not Raw Input

```typescript
// Good - device agnostic
if (isActionActive("jump")) {
  player.jump();
}

// Avoid - device specific
if (UserInputService.IsKeyDown(Enum.KeyCode.Space)) {
  player.jump();
}
```

### 3. Handle Device Changes

```typescript
onDeviceChange((device) => {
  // Update UI prompts
  updateButtonPrompts(device);

  // Show/hide touch controls
  touchControls.Visible = device === "touch";
});
```

### 4. Support Rebinding

```typescript
// Let players customize bindings
function rebindAction(action: string, newInput: InputSource) {
  removeBinding(action, getCurrentBinding(action).primary);
  addBinding({ action, primary: newInput, priority: 10 });
  saveBindingsToDataStore();
}
```

## Integration Example

```typescript
import {
  initInputManager,
  getMovementState,
  isActionActive,
  isActionJustPressed,
  onDeviceChange,
  registerAction,
} from "@broblox/input";

// Initialize
initInputManager();

// Register game-specific actions
registerAction({ name: "ability1", displayName: "Primary Ability", category: "combat" });
registerAction({ name: "ability2", displayName: "Secondary Ability", category: "combat" });
registerAction({ name: "ultimate", displayName: "Ultimate", category: "combat", cooldown: 1 });

// Handle device changes
onDeviceChange((device) => {
  gui.updatePrompts(device);
  touchControls.Visible = device === "touch";
});

// Game loop
RunService.Heartbeat.Connect((dt) => {
  // Movement
  const movement = getMovementState();
  if (movement.isMoving) {
    character.move(movement.direction, movement.magnitude);
  }

  // Actions
  if (isActionJustPressed("jump") && character.canJump()) {
    character.jump();
  }

  if (isActionActive("sprint") && character.canSprint()) {
    character.sprint();
  }

  if (isActionJustPressed("ability1")) {
    character.useAbility(1);
  }

  if (isActionJustPressed("ultimate") && character.hasUltimate()) {
    character.useUltimate();
  }
});
```
