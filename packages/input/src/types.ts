/**
 * Input Types
 *
 * Type definitions for the input system.
 */

// ============================================================================
// Device Types
// ============================================================================

/** Input device categories */
export type DeviceType = "keyboard" | "gamepad" | "touch";

/**
 * Device class for wire-protocol handshakes.
 *
 * Maps Roblox UserInputService capabilities to a simple classification:
 * - `"kbm"` — keyboard / mouse (desktop)
 * - `"gamepad"` — gamepad / controller
 * - `"touch"` — mobile / tablet touchscreen
 */
export type DeviceClass = "kbm" | "gamepad" | "touch";

/** Platform detection result */
export interface PlatformInfo {
  deviceType: DeviceType;
  isConsole: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  hasGamepad: boolean;
  hasTouch: boolean;
}

// ============================================================================
// Input Keys & Buttons
// ============================================================================

/** Keyboard keys (subset of common ones) */
export type KeyboardKey =
  | "W"
  | "A"
  | "S"
  | "D"
  | "Q"
  | "E"
  | "R"
  | "F"
  | "Space"
  | "LeftShift"
  | "LeftControl"
  | "LeftAlt"
  | "Tab"
  | "Escape"
  | "Return"
  | "One"
  | "Two"
  | "Three"
  | "Four"
  | "Five"
  | "Six"
  | "Seven"
  | "Eight"
  | "Nine"
  | "Zero";

/** Gamepad buttons */
export type GamepadButton =
  | "ButtonA"
  | "ButtonB"
  | "ButtonX"
  | "ButtonY"
  | "ButtonL1"
  | "ButtonR1"
  | "ButtonL2"
  | "ButtonR2"
  | "ButtonL3"
  | "ButtonR3"
  | "DPadUp"
  | "DPadDown"
  | "DPadLeft"
  | "DPadRight"
  | "ButtonStart"
  | "ButtonSelect";

/** Gamepad axes */
export type GamepadAxis = "Thumbstick1" | "Thumbstick2";

/** Mouse buttons */
export type MouseButton = "MouseButton1" | "MouseButton2" | "MouseButton3";

/** Touch gestures */
export type TouchGesture = "Tap" | "DoubleTap" | "Hold" | "Swipe" | "Pinch" | "Rotate";

// ============================================================================
// Input Source
// ============================================================================

/** A specific input source */
export type InputSource =
  | { type: "key"; key: KeyboardKey }
  | { type: "mouse"; button: MouseButton }
  | { type: "gamepad"; button: GamepadButton }
  | { type: "axis"; axis: GamepadAxis; direction?: "positive" | "negative" }
  | { type: "touch"; gesture: TouchGesture };

// ============================================================================
// Actions
// ============================================================================

/** An action that can be triggered by input */
export interface InputAction {
  /** Unique action name */
  name: string;
  /** Display name for UI */
  displayName?: string;
  /** Action category for organization */
  category?: string;
  /** Whether action can be rebound */
  rebindable?: boolean;
}

/** Action trigger types */
export type ActionTrigger = "pressed" | "released" | "held";

/** Action state */
export interface ActionState {
  /** Is the action currently active? */
  active: boolean;
  /** When was it last triggered? */
  lastTriggered: number;
  /** Analog value (0-1 for axes/triggers) */
  value: number;
  /** Delta since last frame (for axes) */
  delta: number;
}

// ============================================================================
// Bindings
// ============================================================================

/** A binding maps an input source to an action */
export interface InputBinding {
  /** The action this binding triggers */
  action: string;
  /** Primary input source */
  primary: InputSource;
  /** Alternative input source */
  secondary?: InputSource;
  /** Trigger type */
  trigger?: ActionTrigger;
  /** Modifier keys required */
  modifiers?: KeyboardKey[];
  /** Priority (higher = checked first) */
  priority?: number;
}

/** Complete binding configuration */
export interface BindingConfig {
  /** Default bindings */
  defaults: InputBinding[];
  /** Player-customized bindings (overrides defaults) */
  custom?: InputBinding[];
}

// ============================================================================
// Movement Input
// ============================================================================

/** 2D movement vector */
export interface MoveVector {
  x: number;
  y: number;
}

/** Camera look input */
export interface LookInput {
  x: number;
  y: number;
  sensitivity: number;
}

/** Complete movement state */
export interface MovementState {
  /** Movement direction (normalized) */
  move: MoveVector;
  /** Camera look delta */
  look: LookInput;
  /** Is jumping? */
  jump: boolean;
  /** Is sprinting? */
  sprint: boolean;
  /** Is crouching? */
  crouch: boolean;
}

// ============================================================================
// Callbacks
// ============================================================================

/** Callback for action events */
export type ActionCallback = (action: string, state: ActionState) => void;

/** Callback for device changes */
export type DeviceChangeCallback = (device: DeviceType) => void;

// ============================================================================
// Touch Zones
// ============================================================================

/** A touch zone on screen */
export interface TouchZone {
  id: string;
  /** Position (0-1 relative to screen) */
  position: { x: number; y: number };
  /** Size (0-1 relative to screen) */
  size: { width: number; height: number };
  /** Action triggered by this zone */
  action?: string;
  /** Is this a virtual joystick? */
  isJoystick?: boolean;
}
