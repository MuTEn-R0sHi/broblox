/**
 * UI Components
 *
 * Higher-level reusable UI components.
 */

import { ColorSpec, ButtonProps, TweenConfig, Cleanup } from "./types";
import {
  createFrame,
  createLabel,
  createButton,
  createScrollFrame,
  addCorner,
  addPadding,
  addListLayout,
  addStroke,
  px,
  scale,
  centerAnchor,
  centerPosition,
} from "./create";
import { getTheme, toColor3, darken, lighten } from "./theme";

// Declare TweenService
declare const game: {
  GetService(name: "TweenService"): {
    Create(instance: Instance, tweenInfo: TweenInfo, properties: Record<string, unknown>): Tween;
  };
};

// ============================================================================
// Dialog Component
// ============================================================================

export interface DialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Create a modal dialog.
 */
export function createDialog(
  parent: Instance,
  options: DialogOptions
): { frame: Frame; cleanup: Cleanup } {
  const theme = getTheme();

  // Backdrop
  const backdrop = createFrame({
    name: "DialogBackdrop",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });

  // Dialog frame
  const dialog = createFrame({
    name: "Dialog",
    size: px(300, 180),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(dialog, theme.borders.radius.radius);
  addPadding(dialog, { top: 16, bottom: 16, left: 16, right: 16 });

  // Title
  createLabel({
    text: options.title,
    name: "Title",
    size: new UDim2(1, 0, 0, 30),
    textColor: theme.colors.text,
    textSize: theme.typography.heading.fontSize ?? 20,
    textXAlignment: Enum.TextXAlignment.Center,
    parent: dialog,
  });

  // Message
  if (options.message) {
    createLabel({
      text: options.message,
      name: "Message",
      size: new UDim2(1, 0, 0, 60),
      position: new UDim2(0, 0, 0, 40),
      textColor: theme.colors.textMuted,
      textSize: theme.typography.body.fontSize ?? 14,
      textXAlignment: Enum.TextXAlignment.Center,
      textWrapped: true,
      parent: dialog,
    });
  }

  // Button container
  const buttonContainer = createFrame({
    name: "Buttons",
    size: new UDim2(1, 0, 0, 40),
    position: new UDim2(0, 0, 1, -40),
    backgroundTransparency: 1,
    parent: dialog,
  });
  addListLayout(buttonContainer, {
    direction: "Horizontal",
    padding: 12,
    horizontalAlignment: "Center",
  });

  // Cancel button
  if (options.cancelText) {
    const cancelBtn = createButton({
      text: options.cancelText,
      name: "CancelButton",
      size: px(100, 36),
      backgroundColor: theme.colors.surface,
      textColor: theme.colors.text,
      onClick: () => {
        options.onCancel?.();
        backdrop.Destroy();
      },
      parent: buttonContainer,
    });
    addCorner(cancelBtn, 6);
    addStroke(cancelBtn, { color: theme.colors.textMuted, thickness: 1 });
  }

  // Confirm button
  const confirmBtn = createButton({
    text: options.confirmText ?? "OK",
    name: "ConfirmButton",
    size: px(100, 36),
    backgroundColor: theme.colors.primary,
    textColor: { r: 1, g: 1, b: 1 },
    onClick: () => {
      options.onConfirm?.();
      backdrop.Destroy();
    },
    parent: buttonContainer,
  });
  addCorner(confirmBtn, 6);

  const cleanup = () => {
    backdrop.Destroy();
  };

  return { frame: backdrop, cleanup };
}

// ============================================================================
// Toast Notification
// ============================================================================

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Show a toast notification.
 */
export function showToast(parent: Instance, options: ToastOptions): Cleanup {
  const theme = getTheme();
  const toastType = options.type ?? "info";

  const colorMap: Record<ToastType, ColorSpec> = {
    info: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  };

  const toast = createFrame({
    name: "Toast",
    size: new UDim2(0, 280, 0, 50),
    position: new UDim2(0.5, 0, 0, -60),
    anchorPoint: new Vector2(0.5, 0),
    backgroundColor: colorMap[toastType],
    parent,
  });
  addCorner(toast, 8);
  addPadding(toast, { left: 16, right: 16 });

  createLabel({
    text: options.message,
    name: "Message",
    size: scale(1, 1),
    textColor: { r: 1, g: 1, b: 1 },
    textSize: 14,
    textXAlignment: Enum.TextXAlignment.Center,
    textYAlignment: Enum.TextYAlignment.Center,
    parent: toast,
  });

  // Animate in
  const TweenService = game.GetService("TweenService");
  const slideIn = TweenService.Create(
    toast,
    new TweenInfo(0.3, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    { Position: new UDim2(0.5, 0, 0, 20) }
  );
  slideIn.Play();

  // Auto dismiss
  const duration = options.duration ?? 3;
  task.delay(duration, () => {
    const slideOut = TweenService.Create(
      toast,
      new TweenInfo(0.3, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
      { Position: new UDim2(0.5, 0, 0, -60) }
    );
    slideOut.Play();
    slideOut.Completed.Connect(() => toast.Destroy());
  });

  return () => toast.Destroy();
}

// ============================================================================
// List View
// ============================================================================

export interface ListItem {
  id: string;
  text: string;
  subtext?: string;
  icon?: string;
}

export interface ListViewOptions {
  items: ListItem[];
  itemHeight?: number;
  onSelect?: (item: ListItem) => void;
}

/**
 * Create a scrollable list view.
 */
export function createListView(
  parent: Instance,
  options: ListViewOptions
): { frame: ScrollingFrame; cleanup: Cleanup } {
  const theme = getTheme();
  const itemHeight = options.itemHeight ?? 50;

  const scroll = createScrollFrame({
    name: "ListView",
    size: scale(1, 1),
    backgroundColor: theme.colors.background,
    backgroundTransparency: 0,
    parent,
  });
  addListLayout(scroll, { direction: "Vertical", padding: 2 });

  const connections: RBXScriptConnection[] = [];

  for (const item of options.items) {
    const itemFrame = createFrame({
      name: `Item_${item.id}`,
      size: new UDim2(1, 0, 0, itemHeight),
      backgroundColor: theme.colors.surface,
      parent: scroll,
    });
    addCorner(itemFrame, 4);
    addPadding(itemFrame, { left: 12, right: 12 });

    // Text
    createLabel({
      text: item.text,
      name: "Title",
      size: new UDim2(1, 0, 0, item.subtext ? 24 : itemHeight),
      position: new UDim2(0, 0, 0, item.subtext ? 8 : 0),
      textColor: theme.colors.text,
      textSize: 16,
      textXAlignment: Enum.TextXAlignment.Left,
      textYAlignment: Enum.TextYAlignment.Top,
      parent: itemFrame,
    });

    // Subtext
    if (item.subtext) {
      createLabel({
        text: item.subtext,
        name: "Subtext",
        size: new UDim2(1, 0, 0, 18),
        position: new UDim2(0, 0, 0, 28),
        textColor: theme.colors.textMuted,
        textSize: 12,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: itemFrame,
      });
    }

    // Make clickable
    const clickBtn = new Instance("TextButton");
    clickBtn.Name = "ClickArea";
    clickBtn.Size = scale(1, 1);
    clickBtn.BackgroundTransparency = 1;
    clickBtn.Text = "";
    clickBtn.Parent = itemFrame;

    const conn = clickBtn.MouseButton1Click.Connect(() => {
      options.onSelect?.(item);
    });
    connections.push(conn);
  }

  const cleanup = () => {
    for (const conn of connections) {
      conn.Disconnect();
    }
    scroll.Destroy();
  };

  return { frame: scroll, cleanup };
}

// ============================================================================
// Progress Bar
// ============================================================================

export interface ProgressBarOptions {
  value: number; // 0-1
  showLabel?: boolean;
  color?: ColorSpec;
  height?: number;
}

/**
 * Create a progress bar.
 */
export function createProgressBar(
  parent: Instance,
  options: ProgressBarOptions
): { frame: Frame; setValue: (value: number) => void } {
  const theme = getTheme();
  const progressColor = options.color ?? theme.colors.primary;
  const barHeight = options.height ?? 8;

  const container = createFrame({
    name: "ProgressBar",
    size: new UDim2(1, 0, 0, barHeight),
    backgroundColor: theme.colors.surface,
    parent,
  });
  addCorner(container, barHeight / 2);

  const fill = createFrame({
    name: "Fill",
    size: new UDim2(math.clamp(options.value, 0, 1), 0, 1, 0),
    backgroundColor: progressColor,
    parent: container,
  });
  addCorner(fill, barHeight / 2);

  let labelInstance: TextLabel | undefined;
  if (options.showLabel) {
    labelInstance = createLabel({
      text: `${math.floor(options.value * 100)}%`,
      name: "Label",
      size: scale(1, 1),
      textColor: { r: 1, g: 1, b: 1 },
      textSize: barHeight > 16 ? 12 : 10,
      textXAlignment: Enum.TextXAlignment.Center,
      textYAlignment: Enum.TextYAlignment.Center,
      parent: container,
    });
  }

  const setValue = (value: number) => {
    const clamped = math.clamp(value, 0, 1);
    fill.Size = new UDim2(clamped, 0, 1, 0);
    if (labelInstance) {
      labelInstance.Text = `${math.floor(clamped * 100)}%`;
    }
  };

  return { frame: container, setValue };
}

// ============================================================================
// Loading Spinner
// ============================================================================

/**
 * Create a loading spinner.
 */
export function createSpinner(parent: Instance, size = 32): { frame: Frame; cleanup: Cleanup } {
  const theme = getTheme();

  const container = createFrame({
    name: "Spinner",
    size: px(size, size),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundTransparency: 1,
    parent,
  });

  const spinner = new Instance("ImageLabel");
  spinner.Name = "SpinnerImage";
  spinner.Size = scale(1, 1);
  spinner.BackgroundTransparency = 1;
  spinner.Image = "rbxassetid://6031302931"; // Default spinner asset
  spinner.ImageColor3 = toColor3(theme.colors.primary);
  spinner.Parent = container;

  // Animate rotation
  let running = true;
  task.spawn(() => {
    while (running) {
      const TweenService = game.GetService("TweenService");
      const tween = TweenService.Create(spinner, new TweenInfo(1, Enum.EasingStyle.Linear), {
        Rotation: spinner.Rotation + 360,
      });
      tween.Play();
      tween.Completed.Wait();
    }
  });

  const cleanup = () => {
    running = false;
    container.Destroy();
  };

  return { frame: container, cleanup };
}
