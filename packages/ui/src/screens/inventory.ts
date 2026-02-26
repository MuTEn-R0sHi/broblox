/**
 * Inventory / Backpack Screen
 *
 * Full-screen modal showing owned items in a grid with sort/filter, detail
 * view, and capacity indicator.
 *
 * Usage:
 * ```ts
 * import { createInventoryScreen } from "@broblox/ui/screens/inventory";
 *
 * const inv = createInventoryScreen(playerGui, {
 *   getItems: () => store.getAll(),
 *   getItemDef: (id) => registry.get(id),
 *   maxSlots: store.getMaxSlots(),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
import type { ItemInstance, ItemDefinition, ItemRarity, ItemCategory } from "@broblox/inventory";
import {
  createFrame,
  createLabel,
  createButton,
  createScrollFrame,
  addCorner,
  addPadding,
  addGridLayout,
  addListLayout,
  addStroke,
  px,
  scale,
  centerAnchor,
  centerPosition,
} from "../create";
import { getTheme, toColor3 } from "../theme";
import type { Cleanup, ColorSpec } from "../types";

const logger = createLogger("InventoryScreen");

// ============================================================================
// Types
// ============================================================================

export type SortMode = "rarity" | "name" | "recent";

export interface InventoryScreenOptions {
  /** Get all owned items. */
  getItems: () => ItemInstance[];
  /** Resolve item definition. */
  getItemDef: (itemId: string) => ItemDefinition | undefined;
  /** Max inventory slots. */
  maxSlots: number;
  /** Called when the screen is closed. */
  onClose?: () => void;
}

export interface InventoryScreenHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  refresh: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

function rarityColor(rarity: ItemRarity): ColorSpec {
  switch (rarity) {
    case "common":
      return { r: 0.7, g: 0.7, b: 0.7 };
    case "uncommon":
      return { r: 0.3, g: 0.85, b: 0.3 };
    case "rare":
      return { r: 0.3, g: 0.5, b: 1.0 };
    case "epic":
      return { r: 0.7, g: 0.3, b: 0.9 };
    case "legendary":
      return { r: 1.0, g: 0.65, b: 0.0 };
    case "mythic":
      return { r: 1.0, g: 0.2, b: 0.4 };
    default:
      return { r: 0.5, g: 0.5, b: 0.5 };
  }
}

const RARITY_ORDER: Record<string, number> = {
  mythic: 6,
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

function categoryEmoji(cat: ItemCategory): string {
  switch (cat) {
    case "weapon":
      return "⚔️";
    case "armor":
      return "🛡️";
    case "consumable":
      return "🧪";
    case "material":
      return "🪨";
    case "currency":
      return "💰";
    case "egg":
      return "🥚";
    case "tool":
      return "🔧";
    case "quest":
      return "📜";
    default:
      return "📦";
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createInventoryScreen(
  parent: Instance,
  options: InventoryScreenOptions
): InventoryScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "InventoryScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── main panel ────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "InvPanel",
    size: new UDim2(0, 620, 0, 480),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  createLabel({
    text: "🎒 Inventory",
    name: "Title",
    size: new UDim2(0.4, 0, 0, 30),
    textColor: theme.colors.text,
    textSize: 20,
    font: Enum.Font.GothamBold,
    textXAlignment: Enum.TextXAlignment.Left,
    parent: panel,
  });

  const closeBtn = createButton({
    text: "✕",
    name: "CloseBtn",
    size: px(28, 28),
    position: new UDim2(1, 0, 0, 0),
    anchorPoint: new Vector2(1, 0),
    backgroundColor: theme.colors.surface,
    textColor: theme.colors.textMuted,
    textSize: 16,
    onClick: () => {
      hide();
      options.onClose?.();
    },
    parent: panel,
  });
  addCorner(closeBtn, 14);

  // Capacity
  const capacityLabel = createLabel({
    text: "",
    name: "Capacity",
    size: new UDim2(0.3, 0, 0, 20),
    position: new UDim2(0.4, 0, 0, 5),
    textColor: theme.colors.textMuted,
    textSize: 11,
    textXAlignment: Enum.TextXAlignment.Center,
    parent: panel,
  });

  // ── sort / filter bar ─────────────────────────────────────────────────────
  const toolbar = createFrame({
    name: "Toolbar",
    size: new UDim2(1, 0, 0, 28),
    position: new UDim2(0, 0, 0, 34),
    backgroundTransparency: 1,
    parent: panel,
  });
  addListLayout(toolbar, { direction: "Horizontal", padding: 6 });

  let currentSort: SortMode = "rarity";
  let currentFilter: string | undefined;

  function createSortButton(label: string, mode: SortMode) {
    const btn = createButton({
      text: label,
      name: `Sort_${mode}`,
      size: px(60, 24),
      backgroundColor: currentSort === mode ? theme.colors.primary : theme.colors.background,
      textColor: currentSort === mode ? { r: 1, g: 1, b: 1 } : theme.colors.text,
      textSize: 10,
      font: Enum.Font.GothamMedium,
      onClick: () => {
        currentSort = mode;
        refresh();
      },
      parent: toolbar,
    });
    addCorner(btn, 4);
    return btn;
  }

  createSortButton("Rarity", "rarity");
  createSortButton("Name", "name");
  createSortButton("Recent", "recent");

  // Category filter buttons
  const filterCategories: ItemCategory[] = ["weapon", "armor", "consumable", "material", "misc"];
  for (const cat of filterCategories) {
    const btn = createButton({
      text: categoryEmoji(cat),
      name: `Filter_${cat}`,
      size: px(28, 24),
      backgroundColor: currentFilter === cat ? theme.colors.accent : theme.colors.background,
      textColor: { r: 1, g: 1, b: 1 },
      textSize: 12,
      onClick: () => {
        currentFilter = currentFilter === cat ? undefined : cat;
        refresh();
      },
      parent: toolbar,
    });
    addCorner(btn, 4);
  }

  // ── item grid + detail split ──────────────────────────────────────────────
  const gridScroll = createScrollFrame({
    name: "ItemGrid",
    size: new UDim2(0.55, -8, 1, -72),
    position: new UDim2(0, 0, 0, 68),
    parent: panel,
  });
  addGridLayout(gridScroll, {
    cellSize: { xOffset: 64, yOffset: 72 },
    cellPadding: { xOffset: 4, yOffset: 4 },
    fillDirection: "Horizontal",
    horizontalAlignment: "Left",
  });

  const detailPanel = createFrame({
    name: "DetailPanel",
    size: new UDim2(0.45, -8, 1, -72),
    position: new UDim2(0.55, 8, 0, 68),
    backgroundColor: theme.colors.background,
    parent: panel,
  });
  addCorner(detailPanel, 8);
  addPadding(detailPanel, { top: 12, bottom: 12, left: 12, right: 12 });

  createLabel({
    text: "Select an item",
    name: "NoSelection",
    size: scale(1, 1),
    textColor: theme.colors.textMuted,
    textSize: 13,
    textXAlignment: Enum.TextXAlignment.Center,
    textYAlignment: Enum.TextYAlignment.Center,
    parent: detailPanel,
  });

  // ── state ─────────────────────────────────────────────────────────────────
  let selectedInstanceId: string | undefined;

  function clearDetailPanel() {
    const children = detailPanel.GetChildren();
    for (const child of children) {
      if (child.IsA("Frame") || child.IsA("TextLabel") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function renderDetail(item: ItemInstance) {
    clearDetailPanel();
    const def = options.getItemDef(item.itemId);
    if (!def) return;

    const rColor = rarityColor(def.rarity);

    // Icon + name
    createLabel({
      text: `${categoryEmoji(def.category)} ${def.name}`,
      name: "ItemName",
      size: new UDim2(1, 0, 0, 22),
      textColor: rColor,
      textSize: 16,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Rarity + category
    const rarityText = (def.rarity.sub(1, 1).upper() + def.rarity.sub(2)) as string;
    createLabel({
      text: `${rarityText} · ${def.category.sub(1, 1).upper()}${def.category.sub(2)}`,
      name: "RarityCat",
      size: new UDim2(1, 0, 0, 16),
      position: new UDim2(0, 0, 0, 26),
      textColor: theme.colors.textMuted,
      textSize: 11,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Description
    if (def.description) {
      createLabel({
        text: def.description,
        name: "Desc",
        size: new UDim2(1, 0, 0, 48),
        position: new UDim2(0, 0, 0, 50),
        textColor: theme.colors.textMuted,
        textSize: 11,
        textWrapped: true,
        textXAlignment: Enum.TextXAlignment.Left,
        textYAlignment: Enum.TextYAlignment.Top,
        parent: detailPanel,
      });
    }

    // Quantity
    createLabel({
      text: `Quantity: ${item.quantity}${def.maxStack > 1 ? ` / ${def.maxStack}` : ""}`,
      name: "Quantity",
      size: new UDim2(1, 0, 0, 16),
      position: new UDim2(0, 0, 0, 106),
      textColor: theme.colors.text,
      textSize: 12,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Properties
    let y = 130;
    if (def.tradeable) {
      createLabel({
        text: "✅ Tradeable",
        name: "Tradeable",
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, y),
        textColor: theme.colors.success,
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      y += 16;
    }
    if (def.droppable) {
      createLabel({
        text: "⬇️ Droppable",
        name: "Droppable",
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, y),
        textColor: theme.colors.textMuted,
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      y += 16;
    }

    // Tags
    if (def.tags && def.tags.size() > 0) {
      createLabel({
        text: `Tags: ${def.tags.join(", ")}`,
        name: "Tags",
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, y),
        textColor: theme.colors.textMuted,
        textSize: 9,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
    }
  }

  // ── render grid ───────────────────────────────────────────────────────────
  function clearGrid() {
    const children = gridScroll.GetChildren();
    for (const child of children) {
      if (child.IsA("Frame") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function refresh() {
    clearGrid();
    let items = options.getItems();

    // Filter
    if (currentFilter) {
      items = items.filter((item) => {
        const def = options.getItemDef(item.itemId);
        return def?.category === currentFilter;
      });
    }

    // Sort
    items = [...items];
    items.sort((a, b) => {
      const defA = options.getItemDef(a.itemId);
      const defB = options.getItemDef(b.itemId);
      if (!defA || !defB) return false;

      switch (currentSort) {
        case "rarity": {
          const ra = RARITY_ORDER[defA.rarity] ?? 0;
          const rb = RARITY_ORDER[defB.rarity] ?? 0;
          return rb - ra > 0; // highest first
        }
        case "name":
          return defA.name < defB.name;
        case "recent":
          return b.acquiredAt - a.acquiredAt > 0;
        default:
          return false;
      }
    });

    capacityLabel.Text = `${items.size()} / ${options.maxSlots} slots`;

    for (const item of items) {
      const def = options.getItemDef(item.itemId);
      if (!def) continue;
      const rColor = rarityColor(def.rarity);
      const isSelected = item.instanceId === selectedInstanceId;

      const cell = createFrame({
        name: `Item_${item.instanceId}`,
        size: px(64, 72),
        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
        parent: gridScroll,
      });
      addCorner(cell, 6);
      addStroke(cell, { color: rColor, thickness: 1 });

      // Category emoji as icon
      createLabel({
        text: categoryEmoji(def.category),
        name: "Icon",
        size: new UDim2(1, 0, 0, 28),
        position: new UDim2(0, 0, 0, 4),
        textSize: 22,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Name (truncated)
      const displayName = def.name.size() > 8 ? def.name.sub(1, 7) + "…" : def.name;
      createLabel({
        text: displayName,
        name: "Name",
        size: new UDim2(1, -4, 0, 12),
        position: new UDim2(0, 2, 0, 34),
        textColor: rColor,
        textSize: 9,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Quantity badge
      if (item.quantity > 1) {
        createLabel({
          text: `x${item.quantity}`,
          name: "Qty",
          size: px(24, 14),
          position: new UDim2(1, -2, 1, -2),
          anchorPoint: new Vector2(1, 1),
          textColor: { r: 1, g: 1, b: 1 },
          textSize: 9,
          font: Enum.Font.GothamBold,
          textXAlignment: Enum.TextXAlignment.Center,
          parent: cell,
        });
      }

      // Click handler
      const clickArea = new Instance("TextButton");
      clickArea.Name = "ClickArea";
      clickArea.Size = scale(1, 1);
      clickArea.BackgroundTransparency = 1;
      clickArea.Text = "";
      clickArea.Parent = cell;
      clickArea.MouseButton1Click.Connect(() => {
        selectedInstanceId = item.instanceId;
        renderDetail(item);
        refresh();
      });
    }

    // Update detail if selected
    if (selectedInstanceId) {
      const sel = items.find((i) => i.instanceId === selectedInstanceId);
      if (sel) renderDetail(sel);
    }

    // Re-render toolbar buttons to reflect current state
    const tbChildren = toolbar.GetChildren();
    for (const child of tbChildren) {
      if (child.IsA("TextButton") && child.Name.sub(1, 5) === "Sort_") {
        const btn = child as TextButton;
        const mode = btn.Name.sub(6) as SortMode;
        btn.BackgroundColor3 = toColor3(
          currentSort === mode ? theme.colors.primary : theme.colors.background
        );
        btn.TextColor3 = toColor3(currentSort === mode ? { r: 1, g: 1, b: 1 } : theme.colors.text);
      }
    }
  }

  // ── show / hide ───────────────────────────────────────────────────────────
  const show = () => {
    backdrop.Visible = true;
    refresh();
  };

  const hide = () => {
    backdrop.Visible = false;
  };

  const cleanup = () => {
    backdrop.Destroy();
  };

  logger.info("Inventory screen created");

  return { frame: backdrop, show, hide, refresh, cleanup };
}
