/**
 * Pet Collection Screen
 *
 * Full-screen modal showing owned pets in a grid.  Players can equip/unequip,
 * view stats, evolve, and rename pets.
 *
 * Usage:
 * ```ts
 * import { createPetCollection } from "@broblox/ui/screens/pet-collection";
 *
 * const petUI = createPetCollection(playerGui, {
 *   getPets: () => store.getAll(),
 *   getSpecies: (id) => registry.get(id),
 *   maxEquipped: 3,
 *   onEquip: (instanceId) => store.equip(instanceId),
 *   onUnequip: (instanceId) => store.unequip(instanceId),
 *   onEvolve: (instanceId) => store.evolve(instanceId),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
import type { PetInstance, PetSpecies, PetRarity } from "@broblox/pets";
import {
  createFrame,
  createLabel,
  createButton,
  createScrollFrame,
  addCorner,
  addPadding,
  addListLayout,
  addGridLayout,
  addStroke,
  px,
  scale,
  centerAnchor,
  centerPosition,
} from "../create";
import { createProgressBar } from "../components";
import { getTheme } from "../theme";
import type { Cleanup, ColorSpec } from "../types";

const logger = createLogger("PetCollection");

declare const game: {
  GetService(name: "TweenService"): {
    Create(instance: Instance, tweenInfo: TweenInfo, properties: Record<string, unknown>): Tween;
  };
};

// ============================================================================
// Types
// ============================================================================

export interface PetCollectionOptions {
  /** Get all owned pets. */
  getPets: () => PetInstance[];
  /** Resolve species definition. */
  getSpecies: (speciesId: string) => PetSpecies | undefined;
  /** Max equipped slots. */
  maxEquipped?: number;
  /** Equip callback. */
  onEquip: (instanceId: string) => void;
  /** Unequip callback. */
  onUnequip: (instanceId: string) => void;
  /** Evolve callback — returns true on success. */
  onEvolve?: (instanceId: string) => boolean;
  /** Called when the screen is closed. */
  onClose?: () => void;
}

export interface PetCollectionHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  refresh: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

function rarityColor(rarity: PetRarity): ColorSpec {
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

function rarityLabel(rarity: PetRarity): string {
  return (rarity.sub(1, 1).upper() + rarity.sub(2)) as string;
}

function elementEmoji(element: string): string {
  switch (element) {
    case "fire":
      return "🔥";
    case "water":
      return "💧";
    case "earth":
      return "🌿";
    case "air":
      return "💨";
    case "light":
      return "✨";
    case "dark":
      return "🌑";
    default:
      return "⚪";
  }
}

function statBar(
  label: string,
  value: number,
  maxValue: number,
  parent: Instance,
  y: number,
  theme: ReturnType<typeof getTheme>
) {
  createLabel({
    text: `${label}: ${value}`,
    name: `Stat_${label}`,
    size: new UDim2(1, 0, 0, 14),
    position: new UDim2(0, 0, 0, y),
    textColor: theme.colors.textMuted,
    textSize: 10,
    textXAlignment: Enum.TextXAlignment.Left,
    parent,
  });

  const barHolder = createFrame({
    name: `StatBar_${label}`,
    size: new UDim2(1, 0, 0, 4),
    position: new UDim2(0, 0, 0, y + 14),
    backgroundTransparency: 1,
    parent,
  });
  createProgressBar(barHolder, {
    value: maxValue > 0 ? math.clamp(value / maxValue, 0, 1) : 0,
    color: theme.colors.primary,
    height: 4,
  });
}

// ============================================================================
// Factory
// ============================================================================

export function createPetCollection(
  parent: Instance,
  options: PetCollectionOptions
): PetCollectionHandle {
  const theme = getTheme();
  const maxEquipped = options.maxEquipped ?? 3;

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "PetCollectionScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── main panel ────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "PetPanel",
    size: new UDim2(0, 640, 0, 480),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  createLabel({
    text: "🐾 Pet Collection",
    name: "Title",
    size: new UDim2(0.7, 0, 0, 30),
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

  // Equipped count
  const equippedLabel = createLabel({
    text: "",
    name: "EquippedCount",
    size: new UDim2(0.3, 0, 0, 20),
    position: new UDim2(0.7, -34, 0, 5),
    textColor: theme.colors.textMuted,
    textSize: 11,
    textXAlignment: Enum.TextXAlignment.Right,
    parent: panel,
  });

  // ── split layout: grid left + detail right ────────────────────────────────
  const gridScroll = createScrollFrame({
    name: "PetGrid",
    size: new UDim2(0.55, -8, 1, -44),
    position: new UDim2(0, 0, 0, 38),
    parent: panel,
  });
  addGridLayout(gridScroll, {
    cellSize: { xOffset: 90, yOffset: 100 },
    cellPadding: { xOffset: 6, yOffset: 6 },
    fillDirection: "Horizontal",
    horizontalAlignment: "Left",
  });

  const detailPanel = createFrame({
    name: "DetailPanel",
    size: new UDim2(0.45, -8, 1, -44),
    position: new UDim2(0.55, 8, 0, 38),
    backgroundColor: theme.colors.background,
    parent: panel,
  });
  addCorner(detailPanel, 8);
  addPadding(detailPanel, { top: 12, bottom: 12, left: 12, right: 12 });

  // Placeholder for when no pet is selected
  const _noSelection = createLabel({
    text: "Select a pet to view details",
    name: "NoSelection",
    size: scale(1, 1),
    textColor: theme.colors.textMuted,
    textSize: 13,
    textXAlignment: Enum.TextXAlignment.Center,
    textYAlignment: Enum.TextYAlignment.Center,
    parent: detailPanel,
  });

  // ── state ─────────────────────────────────────────────────────────────────
  let selectedPetId: string | undefined;

  function clearDetailPanel() {
    const children = detailPanel.GetChildren();
    for (const child of children) {
      if (child.IsA("Frame") || child.IsA("TextLabel") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function renderDetail(pet: PetInstance) {
    clearDetailPanel();
    const species = options.getSpecies(pet.speciesId);
    if (!species) return;

    const displayName = pet.nickname ?? species.name;
    const rColor = rarityColor(species.rarity);

    // Name
    createLabel({
      text: `${elementEmoji(species.element)} ${displayName}`,
      name: "PetName",
      size: new UDim2(1, 0, 0, 22),
      textColor: rColor,
      textSize: 16,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // Rarity + Level
    createLabel({
      text: `${rarityLabel(species.rarity)} · Lv. ${pet.level} / ${species.maxLevel}`,
      name: "RarityLevel",
      size: new UDim2(1, 0, 0, 16),
      position: new UDim2(0, 0, 0, 24),
      textColor: theme.colors.textMuted,
      textSize: 11,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });

    // XP bar
    const xpNeeded = math.floor(species.baseXp * math.pow(species.growthRate, pet.level - 1));
    createLabel({
      text: `XP: ${pet.xp} / ${xpNeeded}`,
      name: "XPLabel",
      size: new UDim2(1, 0, 0, 14),
      position: new UDim2(0, 0, 0, 46),
      textColor: theme.colors.textMuted,
      textSize: 10,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: detailPanel,
    });
    const xpBarHolder = createFrame({
      name: "XPBar",
      size: new UDim2(1, 0, 0, 6),
      position: new UDim2(0, 0, 0, 60),
      backgroundTransparency: 1,
      parent: detailPanel,
    });
    createProgressBar(xpBarHolder, {
      value: xpNeeded > 0 ? pet.xp / xpNeeded : 0,
      color: theme.colors.accent,
      height: 6,
    });

    // Stats
    const stats = species.baseStats;
    const maxStat = math.max(stats.power, stats.speed, stats.stamina, stats.luck, 1) * 2;
    statBar("Power", stats.power * pet.level, maxStat * species.maxLevel, detailPanel, 76, theme);
    statBar("Speed", stats.speed * pet.level, maxStat * species.maxLevel, detailPanel, 98, theme);
    statBar(
      "Stamina",
      stats.stamina * pet.level,
      maxStat * species.maxLevel,
      detailPanel,
      120,
      theme
    );
    statBar("Luck", stats.luck * pet.level, maxStat * species.maxLevel, detailPanel, 142, theme);

    // Abilities
    const unlockedAbilities = species.abilities.filter(
      ([lvl]: [number, unknown]) => lvl <= pet.level
    );
    if (unlockedAbilities.size() > 0) {
      createLabel({
        text: "Abilities:",
        name: "AbilityHeader",
        size: new UDim2(1, 0, 0, 16),
        position: new UDim2(0, 0, 0, 170),
        textColor: theme.colors.text,
        textSize: 11,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: detailPanel,
      });
      let aY = 188;
      for (const [, ability] of unlockedAbilities) {
        createLabel({
          text: `• ${ability.name} — ${ability.description}`,
          name: `Ability_${ability.id}`,
          size: new UDim2(1, 0, 0, 14),
          position: new UDim2(0, 0, 0, aY),
          textColor: theme.colors.textMuted,
          textSize: 9,
          textWrapped: true,
          textXAlignment: Enum.TextXAlignment.Left,
          parent: detailPanel,
        });
        aY += 16;
      }
    }

    // ── Action buttons ──────────────────────────────────────────────────────
    const actionBar = createFrame({
      name: "ActionBar",
      size: new UDim2(1, 0, 0, 36),
      position: new UDim2(0, 0, 1, -36),
      backgroundTransparency: 1,
      parent: detailPanel,
    });
    addListLayout(actionBar, {
      direction: "Horizontal",
      padding: 6,
      horizontalAlignment: "Center",
    });

    // Equip / Unequip
    const equipText = pet.equipped ? "Unequip" : "Equip";
    const equipColor = pet.equipped ? theme.colors.warning : theme.colors.primary;
    const equipBtn = createButton({
      text: equipText,
      name: "EquipBtn",
      size: px(80, 32),
      backgroundColor: equipColor,
      textColor: { r: 1, g: 1, b: 1 },
      textSize: 12,
      font: Enum.Font.GothamBold,
      onClick: () => {
        if (pet.equipped) {
          options.onUnequip(pet.instanceId);
        } else {
          options.onEquip(pet.instanceId);
        }
        refresh();
      },
      parent: actionBar,
    });
    addCorner(equipBtn, 6);

    // Evolve (if eligible)
    if (
      species.evolvesInto &&
      species.evolveLevel &&
      pet.level >= species.evolveLevel &&
      options.onEvolve
    ) {
      const evolveBtn = createButton({
        text: "🌟 Evolve",
        name: "EvolveBtn",
        size: px(90, 32),
        backgroundColor: { r: 1.0, g: 0.65, b: 0.0 },
        textColor: { r: 1, g: 1, b: 1 },
        textSize: 12,
        font: Enum.Font.GothamBold,
        onClick: () => {
          const ok = options.onEvolve!(pet.instanceId);
          if (ok) {
            refresh();
          }
        },
        parent: actionBar,
      });
      addCorner(evolveBtn, 6);
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
    const pets = options.getPets();
    const equippedCount = pets.filter((p) => p.equipped).size();
    equippedLabel.Text = `${equippedCount}/${maxEquipped} equipped`;

    for (const pet of pets) {
      const species = options.getSpecies(pet.speciesId);
      if (!species) continue;
      const rColor = rarityColor(species.rarity);
      const isSelected = pet.instanceId === selectedPetId;

      const cell = createFrame({
        name: `Pet_${pet.instanceId}`,
        size: px(90, 100),
        backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
        parent: gridScroll,
      });
      addCorner(cell, 8);
      if (pet.equipped) {
        addStroke(cell, { color: theme.colors.success, thickness: 2 });
      }

      // Element emoji as icon placeholder
      createLabel({
        text: elementEmoji(species.element),
        name: "Icon",
        size: new UDim2(1, 0, 0, 36),
        position: new UDim2(0, 0, 0, 4),
        textSize: 28,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Name
      createLabel({
        text: pet.nickname ?? species.name,
        name: "Name",
        size: new UDim2(1, -4, 0, 14),
        position: new UDim2(0, 2, 0, 42),
        textColor: rColor,
        textSize: 10,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Level
      createLabel({
        text: `Lv.${pet.level}`,
        name: "Level",
        size: new UDim2(1, 0, 0, 12),
        position: new UDim2(0, 0, 0, 58),
        textColor: theme.colors.textMuted,
        textSize: 9,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Rarity
      createLabel({
        text: rarityLabel(species.rarity),
        name: "Rarity",
        size: new UDim2(1, 0, 0, 12),
        position: new UDim2(0, 0, 0, 72),
        textColor: rColor,
        textSize: 8,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: cell,
      });

      // Equipped badge
      if (pet.equipped) {
        createLabel({
          text: "✓",
          name: "EquipBadge",
          size: px(16, 16),
          position: new UDim2(1, -4, 0, 2),
          anchorPoint: new Vector2(1, 0),
          textColor: theme.colors.success,
          textSize: 12,
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
        selectedPetId = pet.instanceId;
        renderDetail(pet);
        refresh(); // re-render grid to update selection highlight
      });
    }

    // If a pet is selected, re-render detail
    if (selectedPetId) {
      const selectedPet = pets.find((p) => p.instanceId === selectedPetId);
      if (selectedPet) {
        renderDetail(selectedPet);
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

  logger.info("Pet collection screen created");

  return { frame: backdrop, show, hide, refresh, cleanup };
}
