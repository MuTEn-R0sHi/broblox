/**
 * Device Detection
 *
 * Detects current input device and platform.
 */

import { DeviceType, PlatformInfo } from "./types";

// Declare Roblox services
declare const game: {
  GetService(name: "UserInputService"): {
    TouchEnabled: boolean;
    KeyboardEnabled: boolean;
    GamepadEnabled: boolean;
    MouseEnabled: boolean;
    GetLastInputType(): Enum.UserInputType;
    LastInputTypeChanged: RBXScriptSignal<(inputType: Enum.UserInputType) => void>;
  };
  GetService(name: "GuiService"): {
    IsTenFootInterface(): boolean;
  };
};

// ============================================================================
// Device Detection
// ============================================================================

let currentDevice: DeviceType = "keyboard";
const deviceChangeCallbacks: Array<(device: DeviceType) => void> = [];

/**
 * Get current input device type.
 */
export function getCurrentDevice(): DeviceType {
  return currentDevice;
}

/**
 * Detect platform capabilities.
 */
export function getPlatformInfo(): PlatformInfo {
  const UserInputService = game.GetService("UserInputService");
  const GuiService = game.GetService("GuiService");

  const hasTouch = UserInputService.TouchEnabled;
  const hasKeyboard = UserInputService.KeyboardEnabled;
  const hasGamepad = UserInputService.GamepadEnabled;
  const isConsole = GuiService.IsTenFootInterface();

  return {
    deviceType: currentDevice,
    isConsole,
    isMobile: hasTouch && !hasKeyboard,
    isDesktop: hasKeyboard && !isConsole,
    hasGamepad,
    hasTouch,
  };
}

/**
 * Convert Roblox input type to our device type.
 */
function inputTypeToDevice(inputType: Enum.UserInputType): DeviceType | undefined {
  const name = inputType.Name;

  if (
    name === "Keyboard" ||
    name === "MouseButton1" ||
    name === "MouseButton2" ||
    name === "MouseButton3" ||
    name === "MouseMovement" ||
    name === "MouseWheel"
  ) {
    return "keyboard";
  }

  if (name === "Gamepad1" || name === "Gamepad2" || name === "Gamepad3" || name === "Gamepad4") {
    return "gamepad";
  }

  if (name === "Touch") {
    return "touch";
  }

  return undefined;
}

/**
 * Initialize device detection.
 */
export function initDeviceDetection(): () => void {
  const UserInputService = game.GetService("UserInputService");

  // Set initial device
  const initialInput = UserInputService.GetLastInputType();
  const initialDevice = inputTypeToDevice(initialInput);
  if (initialDevice) {
    currentDevice = initialDevice;
  }

  // Listen for changes
  const connection = UserInputService.LastInputTypeChanged.Connect((inputType) => {
    const newDevice = inputTypeToDevice(inputType);
    if (newDevice && newDevice !== currentDevice) {
      currentDevice = newDevice;
      for (const callback of deviceChangeCallbacks) {
        pcall(() => callback(newDevice));
      }
    }
  });

  return () => connection.Disconnect();
}

/**
 * Subscribe to device changes.
 */
export function onDeviceChange(callback: (device: DeviceType) => void): () => void {
  deviceChangeCallbacks.push(callback);

  // Immediately call with current device
  callback(currentDevice);

  return () => {
    const index = deviceChangeCallbacks.indexOf(callback);
    if (index >= 0) {
      deviceChangeCallbacks.remove(index);
    }
  };
}

/**
 * Check if using keyboard/mouse.
 */
export function isUsingKeyboard(): boolean {
  return currentDevice === "keyboard";
}

/**
 * Check if using gamepad.
 */
export function isUsingGamepad(): boolean {
  return currentDevice === "gamepad";
}

/**
 * Check if using touch.
 */
export function isUsingTouch(): boolean {
  return currentDevice === "touch";
}

// ============================================================================
// Device Class (wire-protocol)
// ============================================================================

import type { DeviceClass } from "./types";

/**
 * Detect the device class for use in handshake / protocol messages.
 *
 * Returns `"touch"` for mobile/tablet, `"gamepad"` for controllers,
 * or `"kbm"` (keyboard + mouse) as default.
 *
 * This uses `UserInputService` capability flags — call on the client only.
 */
export function detectDeviceClass(): DeviceClass {
  const UserInputService = game.GetService("UserInputService");
  if (UserInputService.TouchEnabled && !UserInputService.KeyboardEnabled) {
    return "touch";
  }
  if (UserInputService.GamepadEnabled) {
    return "gamepad";
  }
  return "kbm";
}
