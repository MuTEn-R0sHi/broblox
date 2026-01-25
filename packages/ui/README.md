# @rbx/ui

UI component library for Roblox games.

## Purpose

This package provides reusable UI components:

- **Device-aware layouts** — Adapts to screen size and input device
- **Common components** — Buttons, panels, lists, modals
- **Theming** — Consistent visual style across games
- **Accessibility** — Touch-friendly sizing, readable text

## Features

### Device-Aware Layout

```typescript
import { ScreenUtil, DeviceLayout } from "@rbx/ui";

// Get safe area insets (notch, home indicator)
const insets = ScreenUtil.getSafeAreaInsets();

// Responsive sizing
const buttonSize = DeviceLayout.getButtonSize();
// Returns larger buttons on touch devices
```

### Common Components

```typescript
import { Button, Panel, Modal, List } from "@rbx/ui";

// Styled button with device-appropriate sizing
const confirmButton = Button.create({
  text: "Confirm",
  style: "primary",
  onClick: () => { ... },
});

// Modal dialog
Modal.show({
  title: "Are you sure?",
  content: "This action cannot be undone.",
  buttons: [
    { text: "Cancel", style: "secondary" },
    { text: "Delete", style: "danger", onClick: handleDelete },
  ],
});
```

### Theming

```typescript
import { Theme } from "@rbx/ui";

// Set game theme
Theme.set({
  primary: Color3.fromRGB(99, 102, 241),
  secondary: Color3.fromRGB(75, 85, 99),
  background: Color3.fromRGB(17, 24, 39),
  text: Color3.fromRGB(255, 255, 255),

  fontFamily: "GothamBold",
  cornerRadius: 8,
});
```

### Touch Support

```typescript
import { TouchControls } from "@rbx/ui";

// Virtual joystick for mobile
const joystick = TouchControls.createJoystick({
  position: UDim2.fromScale(0.15, 0.7),
  size: 120,
});

// Touch button
const jumpButton = TouchControls.createButton({
  position: UDim2.fromScale(0.85, 0.7),
  icon: "jump",
});
```

## Related Docs

- [Device Matrix & Controls](../../docs/architecture/device-matrix-and-controls.md)
- [UI Reference](../../docs/reference/ui.md)
