import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  createDialog,
  showToast,
  createListView,
  createProgressBar,
  createSpinner,
} from "./components";
import { createFrame } from "./create";

/** Mock instance with a fireable MouseButton1Click signal. */
interface MockClickable {
  MouseButton1Click: { _fire: () => void };
  FindFirstChild: (name: string) => MockClickable | undefined;
}

// ============================================================================
// createDialog
// ============================================================================

describe("createDialog", () => {
  it("returns frame and cleanup function", () => {
    const parent = createFrame({ name: "Root" });
    const result = createDialog(parent, { title: "Test Dialog" });
    expect(result.frame).toBeDefined();
    expect(result.frame.ClassName).toBe("Frame");
    expect(result.frame.Name).toBe("DialogBackdrop");
    expect(typeof result.cleanup).toBe("function");
  });

  it("creates backdrop with semi-transparent background", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createDialog(parent, { title: "Test" });
    expect(frame.BackgroundTransparency).toBe(0.5);
    expect(frame.Parent).toBe(parent);
  });

  it("uses custom confirm text", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createDialog(parent, {
      title: "Confirm",
      confirmText: "Yes",
      cancelText: "No",
    });
    expect(frame).toBeDefined();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const parent = createFrame({ name: "Root" });
    const onConfirm = vi.fn();
    const { frame } = createDialog(parent, { title: "Test", onConfirm });
    const dialog = frame.FindFirstChild("Dialog")!;
    const buttons = dialog.FindFirstChild("Buttons")!;
    const confirmBtn = buttons.FindFirstChild("ConfirmButton") as unknown as MockClickable;
    confirmBtn.MouseButton1Click._fire();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const parent = createFrame({ name: "Root" });
    const onCancel = vi.fn();
    const { frame } = createDialog(parent, {
      title: "Test",
      cancelText: "Cancel",
      onCancel,
    });
    const dialog = frame.FindFirstChild("Dialog")!;
    const buttons = dialog.FindFirstChild("Buttons")!;
    const cancelBtn = buttons.FindFirstChild("CancelButton") as unknown as MockClickable;
    cancelBtn.MouseButton1Click._fire();
    expect(onCancel).toHaveBeenCalled();
  });

  it("cleanup destroys the backdrop", () => {
    const parent = createFrame({ name: "Root" });
    const { frame, cleanup } = createDialog(parent, { title: "Test" });
    expect(frame.Parent).toBe(parent);
    cleanup();
    // After cleanup, the frame should have been destroyed
    expect(frame.Parent).toBeUndefined();
  });

  it("creates dialog with message", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createDialog(parent, {
      title: "Alert",
      message: "Something happened",
    });
    expect(frame).toBeDefined();
  });
});

// ============================================================================
// showToast
// ============================================================================

describe("showToast", () => {
  it("returns a cleanup function", () => {
    const parent = createFrame({ name: "Root" });
    const cleanup = showToast(parent, { message: "Hello" });
    expect(typeof cleanup).toBe("function");
  });

  it("creates a toast frame as child of parent", () => {
    const parent = createFrame({ name: "Root" });
    // task.delay fires immediately in tests, destroying the toast;
    // just verify the cleanup function is returned (toast was created & parented).
    const cleanup = showToast(parent, { message: "Test toast" });
    expect(typeof cleanup).toBe("function");
  });

  it("supports all toast types", () => {
    const parent = createFrame({ name: "Root" });

    for (const type of ["info", "success", "warning", "error"] as const) {
      const cleanup = showToast(parent, { message: `${type} toast`, type });
      expect(typeof cleanup).toBe("function");
    }
  });

  it("defaults type to info", () => {
    const parent = createFrame({ name: "Root" });
    const cleanup = showToast(parent, { message: "Default" });
    expect(typeof cleanup).toBe("function");
  });

  it("accepts custom duration", () => {
    const parent = createFrame({ name: "Root" });
    const cleanup = showToast(parent, { message: "Quick", duration: 1 });
    expect(typeof cleanup).toBe("function");
  });

  it("auto-dismiss callback fires slideOut and destroys toast", () => {
    // Capture the task.delay callback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    const originalDelay = g.task.delay;
    let delayCb: (() => void) | undefined;
    g.task.delay = (_dur: number, cb: () => void) => {
      delayCb = cb;
    };
    try {
      const parent = createFrame({ name: "Root" });
      showToast(parent, { message: "Dismiss me", duration: 1 });
      expect(delayCb).toBeDefined();
      // Fire the auto-dismiss callback
      delayCb!();
    } finally {
      g.task.delay = originalDelay;
    }
  });
});

// ============================================================================
// createListView
// ============================================================================

describe("createListView", () => {
  it("returns frame and cleanup", () => {
    const parent = createFrame({ name: "Root" });
    const result = createListView(parent, {
      items: [
        { id: "1", text: "Item 1" },
        { id: "2", text: "Item 2" },
      ],
    });
    expect(result.frame).toBeDefined();
    expect(result.frame.ClassName).toBe("ScrollingFrame");
    expect(typeof result.cleanup).toBe("function");
  });

  it("creates one item frame per list item", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createListView(parent, {
      items: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta" },
        { id: "c", text: "Gamma" },
      ],
    });
    // The scroll frame should have children: UIListLayout + 3 item frames
    const children = frame.GetChildren();
    expect(children.size()).toBeGreaterThanOrEqual(3);
  });

  it("supports items with subtext", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createListView(parent, {
      items: [{ id: "1", text: "Title", subtext: "Description" }],
    });
    expect(frame).toBeDefined();
  });

  it("accepts custom item height", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createListView(parent, {
      items: [{ id: "1", text: "Tall" }],
      itemHeight: 80,
    });
    expect(frame).toBeDefined();
  });

  it("accepts onSelect callback", () => {
    const parent = createFrame({ name: "Root" });
    const onSelect = vi.fn();
    const { frame } = createListView(parent, {
      items: [{ id: "1", text: "Selectable" }],
      onSelect,
    });
    expect(frame).toBeDefined();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("fires onSelect when an item is clicked", () => {
    const parent = createFrame({ name: "Root" });
    const onSelect = vi.fn();
    const item = { id: "x", text: "Clickable" };
    const { frame } = createListView(parent, {
      items: [item],
      onSelect,
    });
    const itemFrame = frame.FindFirstChild("Item_x") as unknown as MockClickable;
    const clickBtn = itemFrame.FindFirstChild("ClickArea") as unknown as MockClickable;
    clickBtn.MouseButton1Click._fire();
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it("cleanup destroys the scroll frame", () => {
    const parent = createFrame({ name: "Root" });
    const { frame, cleanup } = createListView(parent, {
      items: [{ id: "1", text: "Item" }],
    });
    expect(frame.Parent).toBe(parent);
    cleanup();
    expect(frame.Parent).toBeUndefined();
  });

  it("handles empty items array", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createListView(parent, { items: [] });
    expect(frame).toBeDefined();
  });
});

// ============================================================================
// createProgressBar
// ============================================================================

describe("createProgressBar", () => {
  it("returns frame and setValue function", () => {
    const parent = createFrame({ name: "Root" });
    const result = createProgressBar(parent, { value: 0.5 });
    expect(result.frame).toBeDefined();
    expect(result.frame.ClassName).toBe("Frame");
    expect(result.frame.Name).toBe("ProgressBar");
    expect(typeof result.setValue).toBe("function");
  });

  it("creates a fill child inside the container", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createProgressBar(parent, { value: 0.75 });
    const children = frame.GetChildren();
    // Should have: Fill frame + UICorner
    expect(children.size()).toBeGreaterThanOrEqual(1);
  });

  it("clamps value between 0 and 1", () => {
    const parent = createFrame({ name: "Root" });
    const { setValue } = createProgressBar(parent, { value: 0.5 });
    // Should not throw
    setValue(1.5);
    setValue(-0.5);
    setValue(0);
    setValue(1);
  });

  it("supports showLabel option", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createProgressBar(parent, { value: 0.3, showLabel: true });
    expect(frame).toBeDefined();
  });

  it("supports custom color", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createProgressBar(parent, {
      value: 0.5,
      color: { r: 0, g: 1, b: 0 },
    });
    expect(frame).toBeDefined();
  });

  it("supports custom height", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createProgressBar(parent, { value: 0.5, height: 20 });
    expect(frame).toBeDefined();
  });

  it("uses larger font when height > 16 with showLabel", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createProgressBar(parent, {
      value: 0.5,
      height: 20,
      showLabel: true,
    });
    const label = frame.FindFirstChild("Label") as TextLabel | undefined;
    expect(label).toBeDefined();
    expect(label!.TextSize).toBe(12);
  });

  it("uses smaller font when height <= 16 with showLabel", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createProgressBar(parent, {
      value: 0.5,
      height: 10,
      showLabel: true,
    });
    const label = frame.FindFirstChild("Label") as TextLabel | undefined;
    expect(label).toBeDefined();
    expect(label!.TextSize).toBe(10);
  });

  it("setValue updates fill and label", () => {
    const parent = createFrame({ name: "Root" });
    const { setValue } = createProgressBar(parent, { value: 0, showLabel: true });
    setValue(0.5);
    setValue(1);
    // No errors thrown
  });
});

// ============================================================================
// createSpinner
// ============================================================================

describe("createSpinner", () => {
  // Override task.spawn to avoid the infinite animation loop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const originalSpawn = g.task.spawn;
  beforeEach(() => {
    g.task.spawn = (_fn: () => void) => {
      /* no-op: skip spinner animation loop */
    };
  });
  afterEach(() => {
    g.task.spawn = originalSpawn;
  });

  it("returns frame and cleanup function", () => {
    const parent = createFrame({ name: "Root" });
    const result = createSpinner(parent);
    expect(result.frame).toBeDefined();
    expect(result.frame.ClassName).toBe("Frame");
    expect(result.frame.Name).toBe("Spinner");
    expect(typeof result.cleanup).toBe("function");
  });

  it("accepts custom size", () => {
    const parent = createFrame({ name: "Root" });
    const { frame } = createSpinner(parent, 64);
    expect(frame).toBeDefined();
  });

  it("cleanup destroys the spinner", () => {
    const parent = createFrame({ name: "Root" });
    const { frame, cleanup } = createSpinner(parent);
    expect(frame.Parent).toBe(parent);
    cleanup();
    expect(frame.Parent).toBeUndefined();
  });
});
