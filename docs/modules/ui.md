# Modules: UI

UI component library for Roblox games — primitives, components, theming, and full-screen modules (`@broblox/ui`). **Status: Implemented**.

## Purpose

- Provide reusable UI primitives (`createFrame`, `createLabel`, `createButton`, `createScrollFrame`) that abstract Roblox Instance creation.
- Theming system with `DarkTheme` / `LightTheme` and runtime theme switching.
- Higher-level components: `createDialog`, `showToast`, `createProgressBar`, `createListView`, `createSpinner`.
- 8 full-screen UI modules for common game features.
- Helper utilities: `px()`, `scale()`, `fullSize()`, `centerAnchor()`, `addCorner()`, `addPadding()`, `addListLayout()`, `addStroke()`.

## Screen Modules

| Module           | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `daily-rewards`  | Reward calendar with streak tracking and claim animations      |
| `quest-tracker`  | HUD overlay with objective progress and tier badges            |
| `pet-collection` | Grid browser with equip/unequip and XP bars                    |
| `inventory`      | Item grid with search, filters, and drag-to-equip              |
| `cosmetics`      | Appearance customizer with category tabs and preview           |
| `gacha`          | Egg/banner opening screen with pity display and animations     |
| `settings`       | Accessibility and preference panel with sliders and toggles    |
| `battle-pass`    | Seasonal pass viewer with tier progression and reward previews |

## Public API

### Theming

```typescript
import { DarkTheme, LightTheme, getTheme, setTheme, hex, rgb } from "@broblox/ui";

useDarkTheme();
const theme = getTheme();
```

### Primitives

```typescript
import { createFrame, createLabel, createButton, px, scale, addCorner } from "@broblox/ui";

const frame = createFrame({ name: "HUD", size: px(200, 50) });
addCorner(frame, 8);
```

### Components

```typescript
import {
  createDialog,
  showToast,
  createProgressBar,
  createListView,
  createSpinner,
} from "@broblox/ui";

// Modal dialog with confirm/cancel buttons
const dialog = createDialog(parent, { title: "Confirm", message: "Are you sure?" });

// Toast notification — auto-dismisses after duration
const toastCleanup = showToast(parent, { message: "Saved!", duration: 3 });

// Progress bar with 0–1 fill
const { frame: progressFrame, setValue } = createProgressBar(parent, { value: 0 });
setValue(0.75);

// Scrollable list view
const { frame: listFrame, cleanup: listCleanup } = createListView(parent, {
  items: [{ id: "a", text: "First" }],
  itemHeight: 50,
});

// Loading spinner (animated rotation)
const { frame: spinnerFrame, cleanup: spinnerCleanup } = createSpinner(parent, 32);
```

## Dependencies

- `@broblox/core` — Logger

## Testing

- `ui.test.ts` — theme system, color helpers (rgb, hex, lighten, darken), theme management.

## See Also

- [Reference: UI components](../reference/ui.md) — detailed API reference
