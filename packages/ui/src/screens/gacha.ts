/**
 * Gacha / Egg Opening Screen
 *
 * Egg shop + pull animation + rarity reveal.  Supports single and multi-pull,
 * pity counter display, and multi-result grid.
 *
 * Usage:
 * ```ts
 * import { createGachaScreen } from "@rbx/ui/screens/gacha";
 *
 * const gacha = createGachaScreen(playerGui, {
 *   getEggs: () => registry.getAll(),
 *   getBalance: (currency) => wallet.get(currency),
 *   getPity: (eggId) => store.getPity(eggId),
 *   onPull: (eggId, count) => store.hatch(eggId, count),
 * });
 * ```
 */

import { createLogger } from "@rbx/core";
import type { EggDefinition, GachaRarity, HatchResult } from "@rbx/gacha";
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
import { getTheme } from "../theme";
import type { Cleanup, ColorSpec } from "../types";

const logger = createLogger("GachaScreen");

// ============================================================================
// Types
// ============================================================================

export interface GachaScreenOptions {
  /** Get available eggs. */
  getEggs: () => EggDefinition[];
  /** Get player balance for a currency. */
  getBalance: (currency: string) => number;
  /** Get current pity counter for an egg. */
  getPity: (eggId: string) => number;
  /** Pull / hatch one or more eggs. Returns array of results. */
  onPull: (eggId: string, count: number) => HatchResult[];
  /** Close callback. */
  onClose?: () => void;
}

export interface GachaScreenHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  refresh: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

const RARITY_COLORS: Record<GachaRarity, ColorSpec> = {
  common: { r: 0.7, g: 0.7, b: 0.7 },
  uncommon: { r: 0.3, g: 0.85, b: 0.3 },
  rare: { r: 0.3, g: 0.5, b: 1.0 },
  epic: { r: 0.7, g: 0.3, b: 0.9 },
  legendary: { r: 1.0, g: 0.65, b: 0.0 },
  mythic: { r: 1.0, g: 0.2, b: 0.4 },
};

const RARITY_GLOW: Record<string, string> = {
  common: "⬜",
  uncommon: "🟩",
  rare: "🟦",
  epic: "🟪",
  legendary: "🟧",
  mythic: "🟥",
};

// ============================================================================
// Factory
// ============================================================================

export function createGachaScreen(
  parent: Instance,
  options: GachaScreenOptions
): GachaScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "GachaScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── panel ─────────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "GachaPanel",
    size: new UDim2(0, 600, 0, 460),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  createLabel({
    text: "🥚 Egg Shop",
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

  // ── egg list (left) + detail (right) ──────────────────────────────────────
  const eggList = createScrollFrame({
    name: "EggList",
    size: new UDim2(0.45, -8, 1, -40),
    position: new UDim2(0, 0, 0, 38),
    parent: panel,
  });
  addListLayout(eggList, { direction: "Vertical", padding: 6 });

  const detailPanel = createFrame({
    name: "DetailPanel",
    size: new UDim2(0.55, -8, 1, -40),
    position: new UDim2(0.45, 8, 0, 38),
    backgroundColor: theme.colors.background,
    parent: panel,
  });
  addCorner(detailPanel, 8);
  addPadding(detailPanel, { top: 12, bottom: 12, left: 12, right: 12 });

  createLabel({
    text: "Select an egg",
    name: "NoSelection",
    size: scale(1, 1),
    textColor: theme.colors.textMuted,
    textSize: 13,
    textXAlignment: Enum.TextXAlignment.Center,
    textYAlignment: Enum.TextYAlignment.Center,
    parent: detailPanel,
  });

  // ── result overlay (shown after pull) ─────────────────────────────────────
  const resultOverlay = createFrame({
    name: "ResultOverlay",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.3,
    parent: backdrop,
  });
  resultOverlay.Visible = false;

  const resultPanel = createFrame({
    name: "ResultPanel",
    size: new UDim2(0, 400, 0, 350),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: resultOverlay,
  });
  addCorner(resultPanel, 12);
  addPadding(resultPanel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── state ─────────────────────────────────────────────────────────────────
  let selectedEggId: string | undefined;

  function clearChildren(instance: Instance) {
    for (const child of instance.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextLabel") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function showResults(results: HatchResult[]) {
    clearChildren(resultPanel);

    createLabel({
      text: results.size() === 1 ? "🎉 You Got!" : `🎉 ${results.size()}× Pull Results`,
      name: "ResultTitle",
      size: new UDim2(1, 0, 0, 28),
      textColor: theme.colors.text,
      textSize: 18,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Center,
      parent: resultPanel,
    });

    const resultGrid = createScrollFrame({
      name: "ResultGrid",
      size: new UDim2(1, 0, 1, -76),
      position: new UDim2(0, 0, 0, 34),
      parent: resultPanel,
    });
    addGridLayout(resultGrid, {
      cellSize: { xOffset: 80, yOffset: 90 },
      cellPadding: { xOffset: 6, yOffset: 6 },
      fillDirection: "Horizontal",
      horizontalAlignment: "Center",
    });

    for (const result of results) {
      if (!result.ok || !result.itemId || !result.rarity) continue;
      const rColor = RARITY_COLORS[result.rarity];
      const glow = RARITY_GLOW[result.rarity] ?? "⬜";

      const cell = createFrame({
        name: `Result_${result.itemId}`,
        size: px(80, 90),
        backgroundColor: theme.colors.background,
        parent: resultGrid,
      });
      addCorner(cell, 8);
      addStroke(cell, { color: rColor, thickness: 2 });

      createLabel({
        text: glow,
        name: "Glow",
        size: new UDim2(1, 0, 0, 30),
        position: new UDim2(0, 0, 0, 6),
        textSize: 26,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      const rarityText =
        (result.rarity as string).sub(1, 1).upper() + (result.rarity as string).sub(2);
      createLabel({
        text: rarityText,
        name: "Rarity",
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, 40),
        textColor: rColor,
        textSize: 10,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      createLabel({
        text: result.itemId,
        name: "ItemId",
        size: new UDim2(1, -4, 0, 12),
        position: new UDim2(0, 2, 0, 56),
        textColor: theme.colors.textMuted,
        textSize: 8,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      if (result.wasPity) {
        createLabel({
          text: "✨ PITY",
          name: "Pity",
          size: new UDim2(1, 0, 0, 10),
          position: new UDim2(0, 0, 0, 72),
          textColor: { r: 1.0, g: 0.85, b: 0.0 },
          textSize: 8,
          font: Enum.Font.GothamBold,
          textXAlignment: Enum.TextXAlignment.Center,
          parent: cell,
        });
      }
    }

    // Close result button
    const closeResult = createButton({
      text: "Continue",
      name: "CloseResult",
      size: new UDim2(0.5, 0, 0, 32),
      position: new UDim2(0.25, 0, 1, -10),
      anchorPoint: new Vector2(0, 1),
      backgroundColor: theme.colors.primary,
      textColor: { r: 1, g: 1, b: 1 },
      textSize: 14,
      font: Enum.Font.GothamBold,
      onClick: () => {
        resultOverlay.Visible = false;
        refresh();
      },
      parent: resultPanel,
    });
    addCorner(closeResult, 6);

    resultOverlay.Visible = true;
  }

  function renderEggDetail(egg: EggDefinition) {
    clearChildren(detailPanel);
    const balance = options.getBalance(egg.currency);
    const pity = options.getPity(egg.id);

    // Egg name
    createLabel({
      text: `🥚 ${egg.name}`,
      name: "EggName",
      size: new UDim2(1, 0, 0, 22),
      textColor: theme.colors.text,
      textSize: 16,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Description
    createLabel({
      text: egg.description,
      name: "Desc",
      size: new UDim2(1, 0, 0, 36),
      position: new UDim2(0, 0, 0, 26),
      textColor: theme.colors.textMuted,
      textSize: 11,
      textWrapped: true,
      textXAlignment: Enum.TextXAlignment.Left,
      textYAlignment: Enum.TextYAlignment.Top,
      parent: detailPanel,
    });

    // Cost + balance
    const canAfford1 = balance >= egg.cost;
    const canAfford10 = balance >= egg.cost * 10;

    createLabel({
      text: `Cost: ${egg.cost} ${egg.currency} · You have: ${balance}`,
      name: "Cost",
      size: new UDim2(1, 0, 0, 16),
      position: new UDim2(0, 0, 0, 68),
      textColor: canAfford1 ? theme.colors.text : theme.colors.error,
      textSize: 11,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Pity counter
    createLabel({
      text: `Pity: ${pity} / ${egg.pityThreshold} (guaranteed ${egg.pityRarity}+)`,
      name: "Pity",
      size: new UDim2(1, 0, 0, 14),
      position: new UDim2(0, 0, 0, 88),
      textColor: theme.colors.textMuted,
      textSize: 10,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Loot table preview
    createLabel({
      text: "Drop Rates:",
      name: "LootHeader",
      size: new UDim2(1, 0, 0, 14),
      position: new UDim2(0, 0, 0, 112),
      textColor: theme.colors.text,
      textSize: 10,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Group loot by rarity
    const byRarity = new Map<string, number>();
    let totalWeight = 0;
    for (const entry of egg.lootTable) {
      totalWeight += entry.weight;
      byRarity.set(entry.rarity, (byRarity.get(entry.rarity) ?? 0) + entry.weight);
    }

    let ry = 128;
    byRarity.forEach((weight, rarity) => {
      const pct = totalWeight > 0 ? math.floor((weight / totalWeight) * 10000) / 100 : 0;
      const rColor = RARITY_COLORS[rarity as GachaRarity] ?? RARITY_COLORS.common;
      createLabel({
        text: `${RARITY_GLOW[rarity] ?? "⬜"} ${rarity}: ${pct}%`,
        name: `Rate_${rarity}`,
        size: new UDim2(1, 0, 0, 14),
        position: new UDim2(0, 0, 0, ry),
        textColor: rColor,
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      ry += 16;
    });

    // Pull buttons
    const btnY = ry + 16;

    if (egg.enabled) {
      const pull1 = createButton({
        text: `Hatch ×1 (${egg.cost})`,
        name: "Pull1",
        size: new UDim2(0.48, 0, 0, 32),
        position: new UDim2(0, 0, 0, btnY),
        backgroundColor: canAfford1 ? theme.colors.primary : theme.colors.background,
        textColor: canAfford1 ? { r: 1, g: 1, b: 1 } : theme.colors.textMuted,
        textSize: 12,
        font: Enum.Font.GothamBold,
        onClick: () => {
          if (!canAfford1) return;
          const results = options.onPull(egg.id, 1);
          showResults(results);
        },
        parent: detailPanel,
      });
      addCorner(pull1, 6);

      const pull10 = createButton({
        text: `Hatch ×10 (${egg.cost * 10})`,
        name: "Pull10",
        size: new UDim2(0.48, 0, 0, 32),
        position: new UDim2(0.52, 0, 0, btnY),
        backgroundColor: canAfford10 ? theme.colors.accent : theme.colors.background,
        textColor: canAfford10 ? { r: 1, g: 1, b: 1 } : theme.colors.textMuted,
        textSize: 12,
        font: Enum.Font.GothamBold,
        onClick: () => {
          if (!canAfford10) return;
          const results = options.onPull(egg.id, 10);
          showResults(results);
        },
        parent: detailPanel,
      });
      addCorner(pull10, 6);
    } else {
      createLabel({
        text: "🚫 Egg Unavailable",
        name: "Disabled",
        size: new UDim2(1, 0, 0, 20),
        position: new UDim2(0, 0, 0, btnY),
        textColor: theme.colors.error,
        textSize: 12,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: detailPanel,
      });
    }
  }

  // ── render egg list ───────────────────────────────────────────────────────
  function refresh() {
    for (const child of eggList.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }

    const eggs = options.getEggs();

    for (const egg of eggs) {
      const isSelected = egg.id === selectedEggId;
      const balance = options.getBalance(egg.currency);
      const canAfford = balance >= egg.cost;

      const card = createFrame({
        name: `Egg_${egg.id}`,
        size: new UDim2(1, 0, 0, 64),
        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
        backgroundTransparency: egg.enabled ? 0 : 0.4,
        parent: eggList,
      });
      addCorner(card, 6);

      // Egg emoji + name
      createLabel({
        text: `🥚 ${egg.name}`,
        name: "EggName",
        size: new UDim2(1, -8, 0, 16),
        position: new UDim2(0, 8, 0, 6),
        textColor: isSelected ? { r: 1, g: 1, b: 1 } : theme.colors.text,
        textSize: 12,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: card,
      });

      // Cost
      createLabel({
        text: `${egg.cost} ${egg.currency}`,
        name: "Cost",
        size: new UDim2(0.5, -8, 0, 12),
        position: new UDim2(0, 8, 0, 26),
        textColor: canAfford ? theme.colors.success : theme.colors.error,
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: card,
      });

      // Status
      if (!egg.enabled) {
        createLabel({
          text: "Unavailable",
          name: "Status",
          size: new UDim2(0.5, -8, 0, 12),
          position: new UDim2(0.5, 0, 0, 26),
          textColor: theme.colors.error,
          textSize: 10,
          textXAlignment: Enum.TextXAlignment.Right,
          parent: card,
        });
      }

      // Loot hint line
      const rarities: string[] = [];
      const seen = new Set<string>();
      for (const entry of egg.lootTable) {
        if (!seen.has(entry.rarity)) {
          seen.add(entry.rarity);
          rarities.push(`${RARITY_GLOW[entry.rarity] ?? "⬜"}`);
        }
      }
      createLabel({
        text: rarities.join(" "),
        name: "Rarities",
        size: new UDim2(1, -8, 0, 14),
        position: new UDim2(0, 8, 0, 42),
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: card,
      });

      // Click
      const clickArea = new Instance("TextButton");
      clickArea.Name = "ClickArea";
      clickArea.Size = scale(1, 1);
      clickArea.BackgroundTransparency = 1;
      clickArea.Text = "";
      clickArea.Parent = card;
      clickArea.MouseButton1Click.Connect(() => {
        selectedEggId = egg.id;
        renderEggDetail(egg);
        refresh();
      });
    }
  }

  // ── show / hide ───────────────────────────────────────────────────────────
  const show = () => {
    backdrop.Visible = true;
    refresh();
  };

  const hide = () => {
    backdrop.Visible = false;
    resultOverlay.Visible = false;
  };

  const cleanup = () => {
    backdrop.Destroy();
  };

  logger.info("Gacha screen created");

  return { frame: backdrop, show, hide, refresh, cleanup };
}
