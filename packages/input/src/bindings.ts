/**
 * Input Bindings
 *
 * Maps input sources to actions with device-specific defaults.
 */

import { InputBinding, InputSource, KeyboardKey, GamepadButton, DeviceType } from "./types";
import { getCurrentDevice } from "./device";

// ============================================================================
// Binding Storage
// ============================================================================

const defaultBindings: InputBinding[] = [];
const customBindings: InputBinding[] = [];
const bindingsByAction = new Map<string, InputBinding[]>();

/**
 * Add a default binding.
 */
export function addDefaultBinding(binding: InputBinding): void {
  defaultBindings.push(binding);
  rebuildBindingIndex();
}

/**
 * Add multiple default bindings.
 */
export function addDefaultBindings(bindings: InputBinding[]): void {
  for (const binding of bindings) {
    defaultBindings.push(binding);
  }
  rebuildBindingIndex();
}

/**
 * Set a custom binding (overrides default).
 */
export function setCustomBinding(binding: InputBinding): void {
  // Remove existing custom binding for this action
  for (let i = customBindings.size() - 1; i >= 0; i--) {
    if (customBindings[i].action === binding.action) {
      customBindings.remove(i);
    }
  }
  customBindings.push(binding);
  rebuildBindingIndex();
}

/**
 * Remove a custom binding (reverts to default).
 */
export function removeCustomBinding(action: string): void {
  for (let i = customBindings.size() - 1; i >= 0; i--) {
    if (customBindings[i].action === action) {
      customBindings.remove(i);
    }
  }
  rebuildBindingIndex();
}

/**
 * Clear all custom bindings.
 */
export function clearCustomBindings(): void {
  customBindings.clear();
  rebuildBindingIndex();
}

/**
 * Get all bindings for an action.
 */
export function getBindingsForAction(action: string): InputBinding[] {
  return bindingsByAction.get(action) ?? [];
}

/**
 * Rebuild the binding index.
 */
function rebuildBindingIndex(): void {
  bindingsByAction.clear();

  // Add defaults first
  for (const binding of defaultBindings) {
    let list = bindingsByAction.get(binding.action);
    if (!list) {
      list = [];
      bindingsByAction.set(binding.action, list);
    }
    list.push(binding);
  }

  // Override with custom bindings
  for (const binding of customBindings) {
    // Replace all bindings for this action
    bindingsByAction.set(binding.action, [binding]);
  }

  // Sort by priority (higher first)
  for (const [, bindings] of bindingsByAction) {
    bindings.sort((a, b) => (b.priority ?? 0) > (a.priority ?? 0));
  }
}

// ============================================================================
// Input Source Helpers
// ============================================================================

/**
 * Create a keyboard input source.
 */
export function key(keyName: KeyboardKey): InputSource {
  return { type: "key", key: keyName };
}

/**
 * Create a mouse button input source.
 */
export function mouse(button: "MouseButton1" | "MouseButton2" | "MouseButton3"): InputSource {
  return { type: "mouse", button };
}

/**
 * Create a gamepad button input source.
 */
export function button(buttonName: GamepadButton): InputSource {
  return { type: "gamepad", button: buttonName };
}

/**
 * Create a gamepad axis input source.
 */
export function axis(
  axisName: "Thumbstick1" | "Thumbstick2",
  direction?: "positive" | "negative"
): InputSource {
  return { type: "axis", axis: axisName, direction };
}

/**
 * Create a touch gesture input source.
 */
export function touch(gesture: "Tap" | "DoubleTap" | "Hold" | "Swipe"): InputSource {
  return { type: "touch", gesture };
}

// ============================================================================
// Binding Helpers
// ============================================================================

/**
 * Create a binding.
 */
export function bind(action: string, primary: InputSource, secondary?: InputSource): InputBinding {
  return { action, primary, secondary };
}

/**
 * Get device-appropriate display name for a binding.
 */
export function getBindingDisplayName(binding: InputBinding): string {
  const device = getCurrentDevice();
  const source = binding.primary;

  switch (source.type) {
    case "key":
      return source.key;
    case "mouse":
      if (source.button === "MouseButton1") return "LMB";
      if (source.button === "MouseButton2") return "RMB";
      if (source.button === "MouseButton3") return "MMB";
      return source.button;
    case "gamepad":
      return formatGamepadButton(source.button);
    case "axis":
      return source.axis;
    case "touch":
      return source.gesture;
    default:
      return "?";
  }
}

function formatGamepadButton(button: GamepadButton): string {
  switch (button) {
    case "ButtonA":
      return "A";
    case "ButtonB":
      return "B";
    case "ButtonX":
      return "X";
    case "ButtonY":
      return "Y";
    case "ButtonL1":
      return "LB";
    case "ButtonR1":
      return "RB";
    case "ButtonL2":
      return "LT";
    case "ButtonR2":
      return "RT";
    case "ButtonL3":
      return "LS";
    case "ButtonR3":
      return "RS";
    case "DPadUp":
      return "D-Up";
    case "DPadDown":
      return "D-Down";
    case "DPadLeft":
      return "D-Left";
    case "DPadRight":
      return "D-Right";
    case "ButtonStart":
      return "Start";
    case "ButtonSelect":
      return "Select";
    default:
      return button;
  }
}

// ============================================================================
// Default Bindings
// ============================================================================

/** Default keyboard/mouse bindings */
export const KeyboardDefaults: InputBinding[] = [
  // Movement
  bind("move_forward", key("W")),
  bind("move_backward", key("S")),
  bind("move_left", key("A")),
  bind("move_right", key("D")),
  bind("jump", key("Space")),
  bind("sprint", key("LeftShift")),
  bind("crouch", key("LeftControl")),

  // Combat
  bind("primary_action", mouse("MouseButton1")),
  bind("secondary_action", mouse("MouseButton2")),
  bind("reload", key("R")),
  bind("aim", mouse("MouseButton2")),

  // UI
  bind("interact", key("E")),
  bind("inventory", key("Tab")),
  bind("menu", key("Escape")),
  bind("cancel", key("Escape")),
];

/** Default gamepad bindings */
export const GamepadDefaults: InputBinding[] = [
  // Movement (left stick handled separately)
  bind("jump", button("ButtonA")),
  bind("sprint", button("ButtonL3")),
  bind("crouch", button("ButtonB")),

  // Combat
  bind("primary_action", button("ButtonR2")),
  bind("secondary_action", button("ButtonL2")),
  bind("reload", button("ButtonX")),
  bind("aim", button("ButtonL2")),

  // UI
  bind("interact", button("ButtonY")),
  bind("inventory", button("ButtonSelect")),
  bind("menu", button("ButtonStart")),
  bind("cancel", button("ButtonB")),
];

/**
 * Initialize default bindings.
 */
export function initDefaultBindings(): void {
  addDefaultBindings(KeyboardDefaults);
  addDefaultBindings(GamepadDefaults);
}
