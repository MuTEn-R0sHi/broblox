/**
 * Equipment / Gear Screen
 *
 * Full-screen modal for equipping gear items that provide stat bonuses.
 * Tabbed by gear slot (feet, back, body, accessory1, accessory2).
 *
 * Usage:
 * ```ts
 * import { createEquipmentScreen } from "@broblox/ui/screens/equipment";
 *
 * const gear = createEquipmentScreen(playerGui, {
 *   getOwnedGear: () => store.getOwnedGear(),
 *   getEquippedGear: () => store.getAllEquipped(),
 *   getGearCatalog: () => registry.getAll(),
 *   getCoins: () => data.coins,
 *   getPlayerLevel: () => progression.getLevel(),
 *   onEquip: (gearId) => RemoteController.equipGear(gearId),
 *   onUnequip: (slot) => RemoteController.unequipGear(slot),
 *   onBuy: (gearId) => RemoteController.buyGear(gearId),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
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

const logger = createLogger("EquipmentScreen");

// ============================================================================
// Types
// ============================================================================

export interface GearDisplayDef {
  id: string;
  name: string;
  description?: string;
  rarity: string;
  slot: string;
  modifiers: readonly { stat: string; flat: number }[];
  levelRequirement?: number;
  price?: number;
  tags?: readonly string[];
}

export interface EquipmentScreenOptions {
  /** Get all owned gear IDs. */
  getOwnedGear: () => string[];
  /** Get equipped map: slot → gearId. */
  getEquippedGear: () => Record<string, string>;
  /** Get full gear catalog (all definitions). */
  getGearCatalog: () => readonly GearDisplayDef[];
  /** Get player coin balance. */
  getCoins: () => number;
  /** Get player level. */
  getPlayerLevel: () => number;
  /** Equip a gear item. */
  onEquip?: (gearId: string) => void;
  /** Unequip a slot. */
  onUnequip?: (slot: string) => void;
  /** Buy a gear item. Returns { success, message? }. */
  onBuy?: (gearId: string) => { success: boolean; message?: string } | undefined;
  /** Close callback. */
  onClose?: () => void;
}

export interface EquipmentScreenHandle {
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

const SLOT_EMOJI: Record<string, string> = {
  feet: "👟",
  back: "🦸",
  body: "🛡️",
  accessory1: "💍",
  accessory2: "📿",
};

const SLOT_LABELS: Record<string, string> = {
  feet: "Feet",
  back: "Back",
  body: "Body",
  accessory1: "Ring",
  accessory2: "Amulet",
};

const STAT_EMOJI: Record<string, string> = {
  speed: "⚡",
  jump: "🦘",
  stamina: "💪",
};

const TABS = ["feet", "back", "body", "accessory1", "accessory2"];

// ============================================================================
// Factory
// ============================================================================

export function createEquipmentScreen(
  parent: Instance,
  options: EquipmentScreenOptions
): EquipmentScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "EquipmentScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── panel ─────────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "EquipmentPanel",
    size: new UDim2(0, 680, 0, 520),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  createLabel({
    text: "⚔️ Gear Shop",
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

  let activeTab = "feet";

  function createTab(slot: string) {
    const label = `${SLOT_EMOJI[slot] ?? "?"} ${SLOT_LABELS[slot] ?? slot}`;
    const btn = createButton({
      text: label,
      name: `Tab_${slot}`,
      size: px(90, 26),
      backgroundColor: activeTab === slot ? theme.colors.primary : theme.colors.background,
      textColor: activeTab === slot ? { r: 1, g: 1, b: 1 } : theme.colors.text,
      textSize: 10,
      font: Enum.Font.GothamMedium,
      onClick: () => {
        activeTab = slot;
        selectedId = undefined;
        refresh();
      },
      parent: tabBar,
    });
    addCorner(btn, 4);
  }

  for (const slot of TABS) {
    createTab(slot);
  }

  // ── grid + detail split ───────────────────────────────────────────────────
  const gridScroll = createScrollFrame({
    name: "GearGrid",
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
    text: "Select a gear item",
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

  function renderDetail(def: GearDisplayDef, owned: boolean, equipped: boolean) {
    clearChildren(detailPanel);
    const rColor = rarityColor(def.rarity);

    createLabel({
      text: `${SLOT_EMOJI[def.slot] ?? "?"} ${def.name}`,
      name: "GearName",
      size: new UDim2(1, 0, 0, 22),
      textColor: rColor,
      textSize: 16,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    const rarityText = `${def.rarity.sub(1, 1).upper()}${def.rarity.sub(2)}`;
    const slotText = SLOT_LABELS[def.slot] ?? def.slot;
    createLabel({
      text: `${rarityText} · ${slotText}`,
      name: "RaritySlot",
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
        size: new UDim2(1, 0, 0, 36),
        position: new UDim2(0, 0, 0, 48),
        textColor: theme.colors.textMuted,
        textSize: 11,
        textWrapped: true,
        textXAlignment: Enum.TextXAlignment.Left,
        textYAlignment: Enum.TextYAlignment.Top,
        parent: detailPanel,
      });
    }

    // Stat modifiers
    let y = 92;
    for (const mod of def.modifiers) {
      const emoji = STAT_EMOJI[mod.stat] ?? "📊";
      createLabel({
        text: `${emoji} ${mod.stat.sub(1, 1).upper()}${mod.stat.sub(2)} +${mod.flat}`,
        name: `Stat_${mod.stat}`,
        size: new UDim2(1, 0, 0, 16),
        position: new UDim2(0, 0, 0, y),
        textColor: theme.colors.success,
        textSize: 11,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      y += 18;
    }

    // Level requirement
    if (def.levelRequirement !== undefined && def.levelRequirement > 0) {
      const playerLevel = options.getPlayerLevel();
      const meetsLevel = playerLevel >= def.levelRequirement;
      createLabel({
        text: `🔰 Level ${def.levelRequirement} required`,
        name: "LevelReq",
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, y),
        textColor: meetsLevel ? theme.colors.textMuted : theme.colors.error,
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      y += 18;
    }

    y += 8;

    // Action buttons
    if (owned) {
      if (equipped) {
        const unequipBtn = createButton({
          text: "Unequip",
          name: "UnequipBtn",
          size: new UDim2(1, 0, 0, 32),
          position: new UDim2(0, 0, 0, y),
          backgroundColor: theme.colors.error,
          textColor: { r: 1, g: 1, b: 1 },
          textSize: 13,
          font: Enum.Font.GothamBold,
          onClick: () => {
            options.onUnequip?.(def.slot);
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
          position: new UDim2(0, 0, 0, y),
          backgroundColor: theme.colors.primary,
          textColor: { r: 1, g: 1, b: 1 },
          textSize: 13,
          font: Enum.Font.GothamBold,
          onClick: () => {
            options.onEquip?.(def.id);
            refresh();
          },
          parent: detailPanel,
        });
        addCorner(equipBtn, 6);
      }
    } else {
      // Buy button
      const coins = options.getCoins();
      const defPrice = def.price ?? 0;
      const canAfford = coins >= defPrice;
      const playerLevel = options.getPlayerLevel();
      const meetsLevel = def.levelRequirement === undefined || playerLevel >= def.levelRequirement;
      const canBuy = canAfford && meetsLevel;

      const buyBtn = createButton({
        text: canBuy ? `🪙 Buy (${defPrice} coins)` : `🔒 ${defPrice} coins`,
        name: "BuyBtn",
        size: new UDim2(1, 0, 0, 32),
        position: new UDim2(0, 0, 0, y),
        backgroundColor: canBuy ? theme.colors.warning : theme.colors.background,
        textColor: canBuy ? { r: 1, g: 1, b: 1 } : theme.colors.textMuted,
        textSize: 13,
        font: Enum.Font.GothamBold,
        onClick: () => {
          if (!canBuy) return;
          const result = options.onBuy?.(def.id);
          if (result?.success) {
            logger.debug(`Purchased gear ${def.id}`);
          }
          refresh();
        },
        parent: detailPanel,
      });
      addCorner(buyBtn, 6);
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

    const owned = new Set(options.getOwnedGear());
    const equipped = options.getEquippedGear();
    const catalog = options.getGearCatalog();

    // Equipped IDs for quick lookup
    const equippedIds = new Set<string>();
    for (const [, gearId] of pairs(equipped)) {
      equippedIds.add(gearId);
    }

    // Filter by active tab
    const filtered = catalog.filter((g) => g.slot === activeTab);

    // Sort: owned first, then by rarity desc
    const RARITY_ORD: Record<string, number> = {
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const oa = owned.has(a.id) ? 1 : 0;
      const ob = owned.has(b.id) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      return (RARITY_ORD[b.rarity] ?? 0) - (RARITY_ORD[a.rarity] ?? 0);
    });

    for (const gear of sorted) {
      const isOwned = owned.has(gear.id);
      const isEquipped = equippedIds.has(gear.id);
      const isSelected = gear.id === selectedId;
      const rColor = rarityColor(gear.rarity);

      const cell = createFrame({
        name: `Gear_${gear.id}`,
        size: px(72, 80),
        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
        backgroundTransparency: isOwned ? 0 : 0.6,
        parent: gridScroll,
      });
      addCorner(cell, 6);
      addStroke(cell, { color: rColor, thickness: 1 });

      // Slot emoji
      createLabel({
        text: SLOT_EMOJI[gear.slot] ?? "?",
        name: "Icon",
        size: new UDim2(1, 0, 0, 28),
        position: new UDim2(0, 0, 0, 4),
        textSize: 22,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Name
      const displayName = gear.name.size() > 9 ? gear.name.sub(1, 8) + "…" : gear.name;
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

      // Price tag for unowned
      if (!isOwned && gear.price !== undefined && gear.price > 0) {
        createLabel({
          text: `🪙${gear.price}`,
          name: "Price",
          size: new UDim2(1, 0, 0, 12),
          position: new UDim2(0, 0, 0, 50),
          textColor: theme.colors.warning,
          textSize: 9,
          textXAlignment: Enum.TextXAlignment.Center,
          parent: cell,
        });
      }

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
          position: new UDim2(0, 0, 0, 62),
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
        selectedId = gear.id;
        renderDetail(gear, isOwned, isEquipped);
      });
    }

    // Re-render detail panel if the selected item is still in this tab
    if (selectedId !== undefined) {
      const sel = sorted.find((g) => g.id === selectedId);
      if (sel) {
        const isOwned = owned.has(sel.id);
        const isEquipped = equippedIds.has(sel.id);
        renderDetail(sel, isOwned, isEquipped);
      } else {
        // Selected item not in current tab — clear detail
        clearChildren(detailPanel);
        createLabel({
          text: "Select a gear item",
          name: "NoSelection",
          size: scale(1, 1),
          textColor: theme.colors.textMuted,
          textSize: 13,
          textXAlignment: Enum.TextXAlignment.Center,
          textYAlignment: Enum.TextYAlignment.Center,
          parent: detailPanel,
        });
      }
    }

    // Refresh tabs highlight
    for (const child of tabBar.GetChildren()) {
      if (child.IsA("TextButton") && child.Name.sub(1, 4) === "Tab_") {
        const btn = child as TextButton;
        const slot = btn.Name.sub(5);
        btn.BackgroundColor3 = toColor3(
          slot === activeTab ? theme.colors.primary : theme.colors.background
        );
        btn.TextColor3 = toColor3(slot === activeTab ? { r: 1, g: 1, b: 1 } : theme.colors.text);
      }
    }
  }

  // ── Handle methods ────────────────────────────────────────────────────────

  function show() {
    refresh();
    backdrop.Visible = true;
  }

  function hide() {
    backdrop.Visible = false;
  }

  function cleanup() {
    backdrop.Destroy();
  }

  // Initial render (hidden)
  refresh();

  return { frame: backdrop, show, hide, refresh, cleanup };
}
