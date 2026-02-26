/**
 * Cosmetics / Wardrobe Screen
 *
 * Full-screen modal for equipping skins, trails, hats, emotes, etc.
 * Tabbed by cosmetic category with equip/unequip toggle.
 *
 * Usage:
 * ```ts
 * import { createCosmeticsScreen } from "@broblox/ui/screens/cosmetics";
 *
 * const wardrobe = createCosmeticsScreen(playerGui, {
 *   getOwned: () => store.getOwned(),
 *   getEquipped: () => store.getEquipped(),
 *   getCosmeticDef: (id) => registry.get(id),
 *   onEquip: (id, slot) => store.equip(id, slot),
 *   onUnequip: (slot) => store.unequip(slot),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
import type { CosmeticDefinition, CosmeticCategory, EquipSlot } from "@broblox/cosmetics";
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

const logger = createLogger("CosmeticsScreen");

// ============================================================================
// Types
// ============================================================================

export interface CosmeticsScreenOptions {
  /** Get all owned cosmetic IDs. */
  getOwned: () => string[];
  /** Get all cosmetic defs (owned + locked for preview). */
  getAllCosmetics: () => CosmeticDefinition[];
  /** Get equipped map: slot → cosmeticId. */
  getEquipped: () => Map<string, string>;
  /** Resolve cosmetic definition. */
  getCosmeticDef: (id: string) => CosmeticDefinition | undefined;
  /** Equip a cosmetic into slot. */
  onEquip?: (cosmeticId: string, slot: EquipSlot) => void;
  /** Unequip a slot. */
  onUnequip?: (slot: EquipSlot) => void;
  /** Close callback. */
  onClose?: () => void;
}

export interface CosmeticsScreenHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  refresh: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

const RARITY_COLORS: Record<string, ColorSpec> = {
  common: { r: 0.7, g: 0.7, b: 0.7 },
  uncommon: { r: 0.3, g: 0.85, b: 0.3 },
  rare: { r: 0.3, g: 0.5, b: 1.0 },
  epic: { r: 0.7, g: 0.3, b: 0.9 },
  legendary: { r: 1.0, g: 0.65, b: 0.0 },
};

function rarityColor(rarity: string): ColorSpec {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
}

const CATEGORY_EMOJI: Record<CosmeticCategory, string> = {
  skin: "👤",
  hat: "🎩",
  trail: "✨",
  effect: "💫",
  accessory: "💍",
  emote: "💃",
  title: "🏷️",
};

const CATEGORY_SLOT: Record<string, EquipSlot> = {
  hat: "head",
  skin: "body",
  trail: "trail",
  effect: "effect",
  emote: "emote_1",
  accessory: "head",
  title: "title",
};

const TABS: CosmeticCategory[] = ["skin", "hat", "trail", "effect", "accessory", "emote", "title"];

// ============================================================================
// Factory
// ============================================================================

export function createCosmeticsScreen(
  parent: Instance,
  options: CosmeticsScreenOptions
): CosmeticsScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "CosmeticsScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── panel ─────────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "CosmeticsPanel",
    size: new UDim2(0, 650, 0, 500),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  createLabel({
    text: "👗 Wardrobe",
    name: "Title",
    size: new UDim2(0.5, 0, 0, 28),
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

  // ── tab bar ───────────────────────────────────────────────────────────────
  const tabBar = createFrame({
    name: "TabBar",
    size: new UDim2(1, 0, 0, 30),
    position: new UDim2(0, 0, 0, 34),
    backgroundTransparency: 1,
    parent: panel,
  });
  addListLayout(tabBar, { direction: "Horizontal", padding: 4 });

  let activeTab: CosmeticCategory = "skin";

  function createTab(cat: CosmeticCategory) {
    const label = `${CATEGORY_EMOJI[cat]} ${cat.sub(1, 1).upper()}${cat.sub(2)}`;
    const btn = createButton({
      text: label,
      name: `Tab_${cat}`,
      size: px(80, 26),
      backgroundColor: activeTab === cat ? theme.colors.primary : theme.colors.background,
      textColor: activeTab === cat ? { r: 1, g: 1, b: 1 } : theme.colors.text,
      textSize: 10,
      font: Enum.Font.GothamMedium,
      onClick: () => {
        activeTab = cat;
        refresh();
      },
      parent: tabBar,
    });
    addCorner(btn, 4);
  }

  for (const cat of TABS) {
    createTab(cat);
  }

  // ── grid + detail split ───────────────────────────────────────────────────
  const gridScroll = createScrollFrame({
    name: "CosGrid",
    size: new UDim2(0.55, -8, 1, -78),
    position: new UDim2(0, 0, 0, 72),
    parent: panel,
  });
  addGridLayout(gridScroll, {
    cellSize: { xOffset: 72, yOffset: 80 },
    cellPadding: { xOffset: 4, yOffset: 4 },
    fillDirection: "Horizontal",
    horizontalAlignment: "Left",
  });

  const detailPanel = createFrame({
    name: "DetailPanel",
    size: new UDim2(0.45, -8, 1, -78),
    position: new UDim2(0.55, 8, 0, 72),
    backgroundColor: theme.colors.background,
    parent: panel,
  });
  addCorner(detailPanel, 8);
  addPadding(detailPanel, { top: 12, bottom: 12, left: 12, right: 12 });

  createLabel({
    text: "Select a cosmetic",
    name: "NoSelection",
    size: scale(1, 1),
    textColor: theme.colors.textMuted,
    textSize: 13,
    textXAlignment: Enum.TextXAlignment.Center,
    textYAlignment: Enum.TextYAlignment.Center,
    parent: detailPanel,
  });

  // ── state ─────────────────────────────────────────────────────────────────
  let selectedId: string | undefined;

  function clearChildren(instance: Instance) {
    for (const child of instance.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextLabel") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function renderDetail(def: CosmeticDefinition, owned: boolean, equipped: boolean) {
    clearChildren(detailPanel);
    const rColor = rarityColor(def.rarity);

    createLabel({
      text: `${CATEGORY_EMOJI[def.category]} ${def.name}`,
      name: "CosName",
      size: new UDim2(1, 0, 0, 22),
      textColor: rColor,
      textSize: 16,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    const rarityText = `${def.rarity.sub(1, 1).upper()}${def.rarity.sub(2)}`;
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

    // Badges
    let y = 110;
    if (def.limited) {
      createLabel({
        text: "⭐ Limited Edition",
        name: "Limited",
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, y),
        textColor: { r: 1.0, g: 0.85, b: 0.0 },
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      y += 16;
    }
    if (def.tradeable) {
      createLabel({
        text: "🔄 Tradeable",
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

    // Action buttons
    if (!owned) {
      createLabel({
        text: "🔒 Not Owned",
        name: "Locked",
        size: new UDim2(1, 0, 0, 20),
        position: new UDim2(0, 0, 0, y + 10),
        textColor: theme.colors.textMuted,
        textSize: 12,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: detailPanel,
      });
    } else {
      const slot = CATEGORY_SLOT[def.category] as EquipSlot | undefined;
      if (slot) {
        if (equipped) {
          const unequipBtn = createButton({
            text: "Unequip",
            name: "UnequipBtn",
            size: new UDim2(1, 0, 0, 32),
            position: new UDim2(0, 0, 0, y + 10),
            backgroundColor: theme.colors.error,
            textColor: { r: 1, g: 1, b: 1 },
            textSize: 13,
            font: Enum.Font.GothamBold,
            onClick: () => {
              options.onUnequip?.(slot);
              refresh();
            },
            parent: detailPanel,
          });
          addCorner(unequipBtn, 6);
        } else {
          const equipBtn = createButton({
            text: "Equip",
            name: "EquipBtn",
            size: new UDim2(1, 0, 0, 32),
            position: new UDim2(0, 0, 0, y + 10),
            backgroundColor: theme.colors.primary,
            textColor: { r: 1, g: 1, b: 1 },
            textSize: 13,
            font: Enum.Font.GothamBold,
            onClick: () => {
              options.onEquip?.(def.id, slot);
              refresh();
            },
            parent: detailPanel,
          });
          addCorner(equipBtn, 6);
        }
      }
    }
  }

  // ── render grid ───────────────────────────────────────────────────────────
  function refresh() {
    // Clear grid
    for (const child of gridScroll.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }

    const owned = new Set(options.getOwned());
    const equipped = options.getEquipped();
    const allCosmetics = options.getAllCosmetics();

    // Equipped set for quick lookup
    const equippedIds = new Set<string>();
    equipped.forEach((cosId) => equippedIds.add(cosId));

    // Filter by active tab
    const filtered = allCosmetics.filter((c) => c.category === activeTab);

    // sort: owned first, then by rarity desc
    const RARITY_ORD: Record<string, number> = {
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };

    filtered.sort((a, b) => {
      const oa = owned.has(a.id) ? 1 : 0;
      const ob = owned.has(b.id) ? 1 : 0;
      if (oa !== ob) return ob - oa > 0;
      return (RARITY_ORD[b.rarity] ?? 0) - (RARITY_ORD[a.rarity] ?? 0) > 0;
    });

    for (const cos of filtered) {
      const isOwned = owned.has(cos.id);
      const isEquipped = equippedIds.has(cos.id);
      const isSelected = cos.id === selectedId;
      const rColor = rarityColor(cos.rarity);

      const cell = createFrame({
        name: `Cos_${cos.id}`,
        size: px(72, 80),
        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
        backgroundTransparency: isOwned ? 0 : 0.6,
        parent: gridScroll,
      });
      addCorner(cell, 6);
      addStroke(cell, { color: rColor, thickness: 1 });

      // Emoji
      createLabel({
        text: CATEGORY_EMOJI[cos.category],
        name: "Icon",
        size: new UDim2(1, 0, 0, 28),
        position: new UDim2(0, 0, 0, 4),
        textSize: 22,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Name
      const displayName = cos.name.size() > 9 ? cos.name.sub(1, 8) + "…" : cos.name;
      createLabel({
        text: displayName,
        name: "Name",
        size: new UDim2(1, -4, 0, 12),
        position: new UDim2(0, 2, 0, 34),
        textColor: isOwned ? rColor : theme.colors.textMuted,
        textSize: 9,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Equipped badge
      if (isEquipped) {
        createLabel({
          text: "✅",
          name: "EquipBadge",
          size: px(16, 16),
          position: new UDim2(1, -2, 0, 2),
          anchorPoint: new Vector2(1, 0),
          textSize: 12,
          textXAlignment: Enum.TextXAlignment.Center,
          parent: cell,
        });
      }

      // Lock overlay for unowned
      if (!isOwned) {
        createLabel({
          text: "🔒",
          name: "Lock",
          size: new UDim2(1, 0, 0, 16),
          position: new UDim2(0, 0, 0, 52),
          textSize: 12,
          textXAlignment: Enum.TextXAlignment.Center,
          parent: cell,
        });
      }

      // Click
      const clickArea = new Instance("TextButton");
      clickArea.Name = "ClickArea";
      clickArea.Size = scale(1, 1);
      clickArea.BackgroundTransparency = 1;
      clickArea.Text = "";
      clickArea.Parent = cell;
      clickArea.MouseButton1Click.Connect(() => {
        selectedId = cos.id;
        renderDetail(cos, isOwned, isEquipped);
        refresh();
      });
    }

    // Refresh tabs highlight
    for (const child of tabBar.GetChildren()) {
      if (child.IsA("TextButton") && child.Name.sub(1, 4) === "Tab_") {
        const btn = child as TextButton;
        const cat = btn.Name.sub(5) as CosmeticCategory;
        btn.BackgroundColor3 = toColor3(
          activeTab === cat ? theme.colors.primary : theme.colors.background
        );
        btn.TextColor3 = toColor3(activeTab === cat ? { r: 1, g: 1, b: 1 } : theme.colors.text);
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

  logger.info("Cosmetics screen created");

  return { frame: backdrop, show, hide, refresh, cleanup };
}
