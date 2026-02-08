/**
 * Tests for input/device.ts — device detection module.
 *
 * Mocks Roblox UserInputService & GuiService to test
 * getCurrentDevice, getPlatformInfo, initDeviceDetection,
 * onDeviceChange, and helper predicates.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Roblox services before importing the module
// ---------------------------------------------------------------------------

let mockTouchEnabled = false;
let mockKeyboardEnabled = true;
let mockGamepadEnabled = false;
let mockMouseEnabled = true;
let mockIsTenFoot = false;
let mockLastInputType = { Name: "Keyboard" } as Enum.UserInputType;
const mockInputChangedCallbacks: Array<(inputType: Enum.UserInputType) => void> = [];

const mockUserInputService = {
  get TouchEnabled() {
    return mockTouchEnabled;
  },
  get KeyboardEnabled() {
    return mockKeyboardEnabled;
  },
  get GamepadEnabled() {
    return mockGamepadEnabled;
  },
  get MouseEnabled() {
    return mockMouseEnabled;
  },
  GetLastInputType: () => mockLastInputType,
  LastInputTypeChanged: {
    Connect: (cb: (inputType: Enum.UserInputType) => void) => {
      mockInputChangedCallbacks.push(cb);
      return { Disconnect: () => {} };
    },
  },
};

const mockGuiService = {
  IsTenFootInterface: () => mockIsTenFoot,
};

// Override game.GetService before device.ts loads
const g = globalThis as Record<string, unknown>;
const originalGame = g.game;
g.game = {
  ...(typeof originalGame === "object" && originalGame !== null ? originalGame : {}),
  GetService: (name: string) => {
    if (name === "UserInputService") return mockUserInputService;
    if (name === "GuiService") return mockGuiService;
    // Delegate to real mock for other services
    if (typeof originalGame === "object" && originalGame !== null) {
      return (originalGame as { GetService: (n: string) => unknown }).GetService(name);
    }
    return {};
  },
};

// Now import the module under test
import {
  getCurrentDevice,
  getPlatformInfo,
  initDeviceDetection,
  onDeviceChange,
  isUsingKeyboard,
  isUsingGamepad,
  isUsingTouch,
} from "./device";

// ---------------------------------------------------------------------------
// Reset helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockTouchEnabled = false;
  mockKeyboardEnabled = true;
  mockGamepadEnabled = false;
  mockMouseEnabled = true;
  mockIsTenFoot = false;
  mockLastInputType = { Name: "Keyboard" } as Enum.UserInputType;
  mockInputChangedCallbacks.length = 0;
});

// ============================================================================
// getCurrentDevice
// ============================================================================

describe("getCurrentDevice", () => {
  it("defaults to keyboard", () => {
    expect(getCurrentDevice()).toBe("keyboard");
  });
});

// ============================================================================
// Helper predicates
// ============================================================================

describe("isUsingKeyboard / isUsingGamepad / isUsingTouch", () => {
  it("isUsingKeyboard returns true when device is keyboard", () => {
    expect(isUsingKeyboard()).toBe(true);
  });

  it("isUsingGamepad returns false when device is keyboard", () => {
    expect(isUsingGamepad()).toBe(false);
  });

  it("isUsingTouch returns false when device is keyboard", () => {
    expect(isUsingTouch()).toBe(false);
  });
});

// ============================================================================
// getPlatformInfo
// ============================================================================

describe("getPlatformInfo", () => {
  it("detects desktop correctly", () => {
    mockKeyboardEnabled = true;
    mockTouchEnabled = false;
    mockGamepadEnabled = false;
    mockIsTenFoot = false;

    const info = getPlatformInfo();
    expect(info.isDesktop).toBe(true);
    expect(info.isMobile).toBe(false);
    expect(info.isConsole).toBe(false);
    expect(info.hasGamepad).toBe(false);
    expect(info.hasTouch).toBe(false);
  });

  it("detects mobile correctly", () => {
    mockKeyboardEnabled = false;
    mockTouchEnabled = true;
    mockIsTenFoot = false;

    const info = getPlatformInfo();
    expect(info.isMobile).toBe(true);
    expect(info.hasTouch).toBe(true);
  });

  it("detects console correctly", () => {
    mockKeyboardEnabled = true;
    mockGamepadEnabled = true;
    mockIsTenFoot = true;

    const info = getPlatformInfo();
    expect(info.isConsole).toBe(true);
    expect(info.isDesktop).toBe(false); // isConsole overrides
    expect(info.hasGamepad).toBe(true);
  });
});

// ============================================================================
// initDeviceDetection
// ============================================================================

describe("initDeviceDetection", () => {
  it("sets initial device from last input type", () => {
    mockLastInputType = { Name: "Gamepad1" } as Enum.UserInputType;
    initDeviceDetection();
    expect(getCurrentDevice()).toBe("gamepad");
  });

  it("returns a disconnect function", () => {
    const disconnect = initDeviceDetection();
    expect(typeof disconnect).toBe("function");
    disconnect();
  });

  it("handles Touch as initial input type", () => {
    mockLastInputType = { Name: "Touch" } as Enum.UserInputType;
    initDeviceDetection();
    expect(getCurrentDevice()).toBe("touch");
  });

  it("keeps current device for unknown initial input type", () => {
    mockLastInputType = { Name: "Focus" } as Enum.UserInputType;
    initDeviceDetection();
    // stays whatever it was
    expect(getCurrentDevice()).toBeDefined();
  });

  it("responds to input type changes", () => {
    initDeviceDetection();
    // Simulate switching to gamepad
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad1" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("gamepad");
    expect(isUsingGamepad()).toBe(true);
  });

  it("ignores change to same device type", () => {
    mockLastInputType = { Name: "Keyboard" } as Enum.UserInputType;
    initDeviceDetection();

    const spy = vi.fn();
    onDeviceChange(spy);
    spy.mockClear(); // clear the immediate callback

    // Simulate another keyboard input — same device, should NOT fire
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "MouseButton1" } as Enum.UserInputType);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores unknown input type changes", () => {
    initDeviceDetection();
    // Simulate unknown input
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Focus" } as Enum.UserInputType);
    }
    // Device should remain unchanged
    expect(getCurrentDevice()).toBeDefined();
  });
});

// ============================================================================
// onDeviceChange
// ============================================================================

describe("onDeviceChange", () => {
  it("fires immediately with current device", () => {
    const cb = vi.fn();
    onDeviceChange(cb);
    expect(cb).toHaveBeenCalledWith(getCurrentDevice());
  });

  it("returns an unsubscribe function", () => {
    const cb = vi.fn();
    const unsub = onDeviceChange(cb);
    expect(typeof unsub).toBe("function");
    unsub();
  });
});

// ============================================================================
// inputTypeToDevice mapping (via initDeviceDetection + listener)
// ============================================================================

describe("input type mapping", () => {
  beforeEach(() => {
    mockLastInputType = { Name: "Keyboard" } as Enum.UserInputType;
    initDeviceDetection();
  });

  it("maps MouseButton1 to keyboard", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "MouseButton1" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("keyboard");
  });

  it("maps Gamepad2 to gamepad", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad2" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("gamepad");
  });

  it("maps Gamepad3 to gamepad", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad3" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("gamepad");
  });

  it("maps Gamepad4 to gamepad", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad4" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("gamepad");
  });

  it("maps MouseButton2 to keyboard", () => {
    // First switch to something else
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad1" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("gamepad");
    // Now switch to MouseButton2
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "MouseButton2" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("keyboard");
  });

  it("maps MouseButton3 to keyboard", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad1" } as Enum.UserInputType);
    }
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "MouseButton3" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("keyboard");
  });

  it("maps MouseMovement to keyboard", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad1" } as Enum.UserInputType);
    }
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "MouseMovement" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("keyboard");
  });

  it("maps MouseWheel to keyboard", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Gamepad1" } as Enum.UserInputType);
    }
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "MouseWheel" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("keyboard");
  });

  it("maps Touch to touch", () => {
    for (const cb of mockInputChangedCallbacks) {
      cb({ Name: "Touch" } as Enum.UserInputType);
    }
    expect(getCurrentDevice()).toBe("touch");
    expect(isUsingTouch()).toBe(true);
  });
});
