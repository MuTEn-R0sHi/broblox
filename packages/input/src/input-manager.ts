/**
 * Input Manager
 *
 * Central input processing and movement state calculation.
 */

import { MovementState, MoveVector, InputSource } from "./types";
import { getCurrentDevice, initDeviceDetection } from "./device";
import { registerCommonActions, updateActionState, isActionActive } from "./actions";
import { getBindingsForAction, initDefaultBindings } from "./bindings";

// Declare Roblox services
declare const game: {
  GetService(name: "UserInputService"): {
    IsKeyDown(keyCode: Enum.KeyCode): boolean;
    IsMouseButtonPressed(button: Enum.UserInputType): boolean;
    GetGamepadState(
      gamepad: Enum.UserInputType
    ): Array<{ KeyCode: Enum.KeyCode; Position: Vector3 }>;
    InputBegan: RBXScriptSignal<(input: InputObject, gameProcessed: boolean) => void>;
    InputEnded: RBXScriptSignal<(input: InputObject, gameProcessed: boolean) => void>;
    InputChanged: RBXScriptSignal<(input: InputObject, gameProcessed: boolean) => void>;
  };
  GetService(name: "RunService"): {
    Heartbeat: RBXScriptSignal<(dt: number) => void>;
  };
};

// ============================================================================
// Input State
// ============================================================================

const keyStates = new Map<string, boolean>();
const buttonStates = new Map<string, boolean>();
let leftStick = new Vector3(0, 0, 0);
let rightStick = new Vector3(0, 0, 0);
let isInitialized = false;
const cleanupFunctions: Array<() => void> = [];

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the input system.
 */
export function initInput(): () => void {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  // Register common actions
  registerCommonActions();

  // Initialize default bindings
  initDefaultBindings();

  // Initialize device detection
  cleanupFunctions.push(initDeviceDetection());

  // Set up input listeners
  setupInputListeners();

  // Start update loop
  const RunService = game.GetService("RunService");
  const heartbeatConnection = RunService.Heartbeat.Connect(() => {
    updateInput();
  });
  cleanupFunctions.push(() => heartbeatConnection.Disconnect());

  return () => {
    for (const cleanup of cleanupFunctions) {
      cleanup();
    }
    cleanupFunctions.clear();
    isInitialized = false;
  };
}

/**
 * Set up input listeners.
 */
function setupInputListeners(): void {
  const UserInputService = game.GetService("UserInputService");

  // Input began
  const beganConnection = UserInputService.InputBegan.Connect((input, gameProcessed) => {
    if (gameProcessed) return;

    const keyCode = input.KeyCode.Name;
    const inputType = input.UserInputType.Name;

    if (inputType === "Keyboard") {
      keyStates.set(keyCode, true);
    } else if (
      inputType === "MouseButton1" ||
      inputType === "MouseButton2" ||
      inputType === "MouseButton3"
    ) {
      keyStates.set(inputType, true);
    } else if (inputType.find("Gamepad")[0] !== undefined) {
      buttonStates.set(keyCode, true);
    }
  });
  cleanupFunctions.push(() => beganConnection.Disconnect());

  // Input ended
  const endedConnection = UserInputService.InputEnded.Connect((input, _gameProcessed) => {
    const keyCode = input.KeyCode.Name;
    const inputType = input.UserInputType.Name;

    if (inputType === "Keyboard") {
      keyStates.set(keyCode, false);
    } else if (
      inputType === "MouseButton1" ||
      inputType === "MouseButton2" ||
      inputType === "MouseButton3"
    ) {
      keyStates.set(inputType, false);
    } else if (inputType.find("Gamepad")[0] !== undefined) {
      buttonStates.set(keyCode, false);
    }
  });
  cleanupFunctions.push(() => endedConnection.Disconnect());

  // Input changed (for thumbsticks)
  const changedConnection = UserInputService.InputChanged.Connect((input, _gameProcessed) => {
    const keyCode = input.KeyCode.Name;

    if (keyCode === "Thumbstick1") {
      leftStick = input.Position;
    } else if (keyCode === "Thumbstick2") {
      rightStick = input.Position;
    }
  });
  cleanupFunctions.push(() => changedConnection.Disconnect());
}

// ============================================================================
// Input Checking
// ============================================================================

/**
 * Check if an input source is active.
 */
function isInputSourceActive(source: InputSource): boolean {
  switch (source.type) {
    case "key":
      return keyStates.get(source.key) ?? false;

    case "mouse":
      return keyStates.get(source.button) ?? false;

    case "gamepad":
      return buttonStates.get(source.button) ?? false;

    case "axis": {
      const stick = source.axis === "Thumbstick1" ? leftStick : rightStick;
      const value = source.direction === "negative" ? -stick.X : stick.X;
      return value > 0.5;
    }

    case "touch":
      // Touch handled separately
      return false;

    default:
      return false;
  }
}

/**
 * Get analog value for an input source (0-1).
 */
function getInputSourceValue(source: InputSource): number {
  switch (source.type) {
    case "key":
    case "mouse":
    case "gamepad":
      return isInputSourceActive(source) ? 1 : 0;

    case "axis": {
      const stick = source.axis === "Thumbstick1" ? leftStick : rightStick;
      if (source.direction === "positive") {
        return math.max(0, stick.X);
      } else if (source.direction === "negative") {
        return math.max(0, -stick.X);
      }
      return stick.Magnitude;
    }

    default:
      return 0;
  }
}

/**
 * Check if any binding for an action is active.
 */
function isActionBindingActive(action: string): [boolean, number] {
  const bindings = getBindingsForAction(action);

  for (const binding of bindings) {
    if (isInputSourceActive(binding.primary)) {
      return [true, getInputSourceValue(binding.primary)];
    }
    if (binding.secondary && isInputSourceActive(binding.secondary)) {
      return [true, getInputSourceValue(binding.secondary)];
    }
  }

  return [false, 0];
}

// ============================================================================
// Update Loop
// ============================================================================

/**
 * Update all action states.
 */
function updateInput(): void {
  // Update common movement actions
  const movementActions = [
    "move_forward",
    "move_backward",
    "move_left",
    "move_right",
    "jump",
    "sprint",
    "crouch",
    "primary_action",
    "secondary_action",
    "reload",
    "aim",
    "interact",
    "inventory",
    "menu",
    "cancel",
  ];

  for (const actionName of movementActions) {
    const [active, value] = isActionBindingActive(actionName);
    updateActionState(actionName, active, value);
  }
}

// ============================================================================
// Movement State
// ============================================================================

/**
 * Get the current movement state.
 * This combines all movement-related inputs into a unified state.
 */
export function getMovementState(): MovementState {
  const device = getCurrentDevice();

  let move: MoveVector;

  if (device === "gamepad") {
    // Use left stick for movement
    move = {
      x: leftStick.X,
      y: -leftStick.Y, // Invert Y for standard controls
    };
  } else {
    // Combine WASD keys
    const forward = isActionActive("move_forward") ? 1 : 0;
    const backward = isActionActive("move_backward") ? 1 : 0;
    const left = isActionActive("move_left") ? 1 : 0;
    const right = isActionActive("move_right") ? 1 : 0;

    move = {
      x: right - left,
      y: forward - backward,
    };
  }

  // Normalize if magnitude > 1
  const magnitude = math.sqrt(move.x * move.x + move.y * move.y);
  if (magnitude > 1) {
    move.x /= magnitude;
    move.y /= magnitude;
  }

  return {
    move,
    look: {
      x: device === "gamepad" ? rightStick.X : 0,
      y: device === "gamepad" ? -rightStick.Y : 0,
      sensitivity: 1,
    },
    jump: isActionActive("jump"),
    sprint: isActionActive("sprint"),
    crouch: isActionActive("crouch"),
  };
}

/**
 * Get raw movement vector.
 */
export function getMoveVector(): MoveVector {
  return getMovementState().move;
}

/**
 * Check if any movement input is active.
 */
export function isMoving(): boolean {
  const move = getMoveVector();
  return math.abs(move.x) > 0.1 || math.abs(move.y) > 0.1;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  getCurrentDevice,
  onDeviceChange,
  isUsingKeyboard,
  isUsingGamepad,
  isUsingTouch,
} from "./device";

export {
  registerAction,
  registerActions,
  onAction,
  isActionActive,
  isActionJustPressed,
  getActionValue,
  CommonActions,
} from "./actions";

export {
  addDefaultBinding,
  addDefaultBindings,
  setCustomBinding,
  removeCustomBinding,
  key,
  mouse,
  button,
  axis,
  touch,
  bind,
  getBindingDisplayName,
} from "./bindings";
