# Reference: UI Components

The `@rbx/ui` package provides reusable UI components with theming support for Roblox games.

## Installation

```bash
pnpm add @rbx/ui
```

## Quick Start

```typescript
import { createFrame, createLabel, createButton, setTheme, DarkTheme } from "@rbx/ui";

// Set the theme
setTheme(DarkTheme);

// Create a simple panel
const panel = createFrame({
  size: { x: 300, y: 200 },
  position: { x: 0.5, y: 0.5 },
  anchor: { x: 0.5, y: 0.5 },
  backgroundColor: "surface",
  cornerRadius: 8,
});

// Add a title
const title = createLabel({
  text: "Welcome!",
  textColor: "textPrimary",
  textSize: 24,
  font: "GothamBold",
  parent: panel,
});

// Add a button
const button = createButton({
  text: "Continue",
  size: { x: 120, y: 40 },
  onClick: () => print("Clicked!"),
  parent: panel,
});
```

## Theme System

### Built-in Themes

```typescript
import { setTheme, getTheme, DarkTheme, LightTheme } from "@rbx/ui";

// Use dark theme (default)
setTheme(DarkTheme);

// Use light theme
setTheme(LightTheme);

// Get current theme
const theme = getTheme();
```

### Theme Colors

```typescript
// Semantic colors available in themes:
{
  background: Color3,     // Main background
  surface: Color3,        // Cards, panels
  surfaceAlt: Color3,     // Alternate surface
  primary: Color3,        // Primary actions
  primaryHover: Color3,   // Primary hover state
  secondary: Color3,      // Secondary actions
  accent: Color3,         // Accents, highlights
  textPrimary: Color3,    // Main text
  textSecondary: Color3,  // Secondary text
  textMuted: Color3,      // Muted/disabled text
  border: Color3,         // Borders
  error: Color3,          // Error states
  warning: Color3,        // Warning states
  success: Color3,        // Success states
  info: Color3,           // Info states
}
```

### Custom Themes

```typescript
import { setTheme, rgb, hex } from "@rbx/ui";

const CustomTheme = {
  background: rgb(15, 15, 25),
  surface: rgb(25, 25, 40),
  surfaceAlt: rgb(35, 35, 55),
  primary: hex("#6366f1"),
  primaryHover: hex("#818cf8"),
  secondary: rgb(100, 100, 120),
  accent: hex("#f59e0b"),
  textPrimary: rgb(255, 255, 255),
  textSecondary: rgb(180, 180, 200),
  textMuted: rgb(120, 120, 140),
  border: rgb(60, 60, 80),
  error: hex("#ef4444"),
  warning: hex("#f59e0b"),
  success: hex("#22c55e"),
  info: hex("#3b82f6"),
};

setTheme(CustomTheme);
```

### Color Utilities

```typescript
import { rgb, hex, toColor3, darken, lighten } from "@rbx/ui";

// Create colors
const red = rgb(255, 0, 0);
const blue = hex("#3b82f6");

// Convert to Color3
const color3 = toColor3("primary"); // Uses theme
const color3b = toColor3(rgb(100, 150, 200));

// Modify colors
const darker = darken(blue, 0.2); // 20% darker
const lighter = lighten(blue, 0.2); // 20% lighter
```

## Creation Utilities

### Frames

```typescript
import { createFrame } from "@rbx/ui";

const frame = createFrame({
  size: { x: 300, y: 200 }, // Pixels or scale (0-1)
  position: { x: 0.5, y: 0.5 }, // Position
  anchor: { x: 0.5, y: 0.5 }, // Anchor point
  backgroundColor: "surface", // Theme color or Color3
  backgroundTransparency: 0, // 0 = opaque, 1 = transparent
  cornerRadius: 8, // Corner rounding
  borderColor: "border", // Border color
  borderWidth: 1, // Border thickness
  zIndex: 1, // Layer order
  visible: true, // Visibility
  parent: screenGui, // Parent instance
  name: "MyFrame", // Instance name
});
```

### Labels

```typescript
import { createLabel } from "@rbx/ui";

const label = createLabel({
  text: "Hello World",
  textColor: "textPrimary",
  textSize: 18,
  font: "Gotham", // Enum.Font name
  textXAlignment: "Center", // Left, Center, Right
  textYAlignment: "Center", // Top, Center, Bottom
  textWrapped: true,
  richText: true, // Enable rich text
  size: { x: 200, y: 50 },
  position: { x: 0, y: 0 },
  backgroundColor: "transparent", // "transparent" for no background
  parent: frame,
});
```

### Buttons

```typescript
import { createButton } from "@rbx/ui";

const button = createButton({
  text: "Click Me",
  size: { x: 120, y: 40 },
  position: { x: 0.5, y: 0.8 },
  anchor: { x: 0.5, y: 0.5 },
  backgroundColor: "primary",
  hoverColor: "primaryHover",
  textColor: "textPrimary",
  textSize: 16,
  cornerRadius: 6,
  onClick: () => {
    print("Button clicked!");
  },
  parent: frame,
});
```

### Scroll Frames

```typescript
import { createScrollFrame } from "@rbx/ui";

const scrollFrame = createScrollFrame({
  size: { x: 300, y: 400 },
  canvasSize: { x: 0, y: 800 }, // Scrollable area
  scrollDirection: "vertical", // "vertical", "horizontal", "both"
  scrollBarThickness: 6,
  scrollBarColor: "border",
  backgroundColor: "surface",
  parent: screenGui,
});
```

## Layout Utilities

### Corner Radius

```typescript
import { addCorner } from "@rbx/ui";

// Add rounded corners
addCorner(frame, 8); // 8 pixel radius
addCorner(frame, { scale: 0.1 }); // 10% of size
```

### Padding

```typescript
import { addPadding } from "@rbx/ui";

// Uniform padding
addPadding(frame, 16);

// Different padding per side
addPadding(frame, {
  top: 20,
  bottom: 20,
  left: 16,
  right: 16,
});
```

### List Layout

```typescript
import { addListLayout } from "@rbx/ui";

// Vertical list
addListLayout(frame, {
  direction: "vertical", // "vertical" or "horizontal"
  padding: 8, // Gap between items
  horizontalAlignment: "Center", // Left, Center, Right
  verticalAlignment: "Top", // Top, Center, Bottom
  sortOrder: "LayoutOrder", // Name or LayoutOrder
});
```

### Grid Layout

```typescript
import { addGridLayout } from "@rbx/ui";

addGridLayout(frame, {
  cellSize: { x: 100, y: 100 },
  cellPadding: { x: 8, y: 8 },
  fillDirection: "horizontal", // "horizontal" or "vertical"
  horizontalAlignment: "Center",
  verticalAlignment: "Top",
  sortOrder: "LayoutOrder",
});
```

### Stroke

```typescript
import { addStroke } from "@rbx/ui";

addStroke(frame, {
  color: "border",
  thickness: 2,
  transparency: 0,
  lineJoinMode: "Round", // Round, Bevel, Miter
});
```

## Size Utilities

```typescript
import { px, scale, centerAnchor, centerPosition } from "@rbx/ui";

// Pixel sizes
const size1 = px(300, 200); // UDim2.fromOffset(300, 200)

// Scale sizes (relative to parent)
const size2 = scale(0.5, 0.5); // UDim2.fromScale(0.5, 0.5)

// Mixed sizes
const size3 = new UDim2(0.5, 10, 0, 100); // 50% + 10px, 100px

// Center helpers
frame.AnchorPoint = centerAnchor(); // Vector2(0.5, 0.5)
frame.Position = centerPosition(); // UDim2(0.5, 0, 0.5, 0)
```

## Components

### Dialog

Modal dialog with title, content, and buttons.

```typescript
import { createDialog } from "@rbx/ui";

const cleanup = createDialog({
  title: "Confirm Action",
  message: "Are you sure you want to proceed?",
  buttons: [
    {
      text: "Cancel",
      style: "secondary",
      onClick: () => cleanup(),
    },
    {
      text: "Confirm",
      style: "primary",
      onClick: () => {
        doAction();
        cleanup();
      },
    },
  ],
  parent: screenGui,
});
```

### Toast

Temporary notification message.

```typescript
import { showToast } from "@rbx/ui";

// Simple toast
showToast({
  message: "Settings saved!",
  duration: 3, // Seconds
  parent: screenGui,
});

// Toast with type
showToast({
  message: "Connection lost",
  type: "error", // "info", "success", "warning", "error"
  duration: 5,
  parent: screenGui,
});
```

### ListView

Scrollable list of items.

```typescript
import { createListView } from "@rbx/ui";

const listView = createListView({
  items: [
    { id: "1", label: "Item 1" },
    { id: "2", label: "Item 2" },
    { id: "3", label: "Item 3" },
  ],
  renderItem: (item, index) => {
    const row = createFrame({ ... });
    createLabel({ text: item.label, parent: row });
    return row;
  },
  onItemClick: (item, index) => {
    print(`Clicked ${item.label}`);
  },
  size: { x: 300, y: 400 },
  itemHeight: 50,
  parent: screenGui,
});

// Update items
listView.setItems(newItems);
```

### ProgressBar

Progress indicator.

```typescript
import { createProgressBar } from "@rbx/ui";

const progressBar = createProgressBar({
  progress: 0.5, // 0-1
  size: { x: 200, y: 20 },
  backgroundColor: "surface",
  fillColor: "primary",
  cornerRadius: 4,
  showLabel: true, // Show percentage text
  parent: frame,
});

// Update progress
progressBar.setProgress(0.75);
```

### Spinner

Loading indicator.

```typescript
import { createSpinner } from "@rbx/ui";

const spinner = createSpinner({
  size: 32, // Diameter in pixels
  color: "primary",
  thickness: 3,
  parent: frame,
});

// Start/stop animation
spinner.start();
spinner.stop();

// Cleanup
spinner.destroy();
```

## Best Practices

### 1. Use Theme Colors

```typescript
// Good - uses theme colors
createFrame({ backgroundColor: "surface" });
createLabel({ textColor: "textPrimary" });

// Avoid - hardcoded colors (won't adapt to theme changes)
createFrame({ backgroundColor: rgb(30, 30, 30) });
```

### 2. Clean Up Resources

```typescript
// Components return cleanup functions
const cleanup = createDialog({ ... });

// Call cleanup when done
cleanup();

// Or use the destroy method on components
progressBar.destroy();
spinner.destroy();
```

### 3. Use Layouts Over Manual Positioning

```typescript
// Good - uses layout
const container = createFrame({ ... });
addListLayout(container, { direction: "vertical", padding: 8 });
items.forEach((item, i) => {
  createFrame({ layoutOrder: i, parent: container });
});

// Avoid - manual positioning
items.forEach((item, i) => {
  createFrame({ position: { x: 0, y: i * 50 }, parent: container });
});
```

### 4. Responsive Sizing

```typescript
// Use scale for responsive layouts
createFrame({
  size: { x: 0.8, y: 0.6 }, // 80% width, 60% height
  position: { x: 0.5, y: 0.5 },
  anchor: { x: 0.5, y: 0.5 },
});

// Or mix scale and pixels
createFrame({
  size: new UDim2(1, -32, 0, 50), // Full width - 32px margin, 50px tall
});
```

## Integration Example

```typescript
import {
  createFrame,
  createLabel,
  createButton,
  createListView,
  showToast,
  addCorner,
  addPadding,
  addListLayout,
  setTheme,
  DarkTheme,
} from "@rbx/ui";

// Set theme
setTheme(DarkTheme);

// Create main menu
function createMainMenu(screenGui: ScreenGui) {
  // Background panel
  const panel = createFrame({
    size: { x: 400, y: 500 },
    position: { x: 0.5, y: 0.5 },
    anchor: { x: 0.5, y: 0.5 },
    backgroundColor: "surface",
    parent: screenGui,
  });
  addCorner(panel, 12);
  addPadding(panel, 24);

  // Content container
  const content = createFrame({
    size: { x: 1, y: 1 },
    backgroundColor: "transparent",
    parent: panel,
  });
  addListLayout(content, { direction: "vertical", padding: 16 });

  // Title
  createLabel({
    text: "Main Menu",
    textColor: "textPrimary",
    textSize: 28,
    font: "GothamBold",
    size: { x: 1, y: 0 },
    autoSize: "Y",
    layoutOrder: 1,
    parent: content,
  });

  // Menu buttons
  const menuItems = ["Play", "Settings", "Shop", "Quit"];
  menuItems.forEach((item, i) => {
    createButton({
      text: item,
      size: { x: 1, y: 0 },
      autoSize: "Y",
      backgroundColor: "primary",
      textSize: 18,
      cornerRadius: 8,
      layoutOrder: i + 2,
      onClick: () => handleMenuClick(item),
      parent: content,
    });
  });

  return panel;
}

function handleMenuClick(item: string) {
  showToast({
    message: `Selected: ${item}`,
    type: "info",
    duration: 2,
  });
}
```
