/**
 * HUD Controller — Obby Game (Client)
 *
 * Creates a sidebar of icon buttons on the right side of the screen
 * for opening feature screens (inventory, quests, pets, shop, etc.).
 * Also adds feedback indicators for events (level up, quest complete, etc.).
 */

import { Players } from "@rbxts/services";
import { Controller, createLogger } from "@broblox/core";
import { onAction } from "@broblox/input";
import { RemoteController } from "./RemoteController";
import { ScreenController } from "./ScreenController";

const logger = createLogger("HudController");
const player = Players.LocalPlayer;

// ============================================================================
// Button definitions
// ============================================================================

interface HudButtonDef {
  name: string;
  emoji: string;
  tooltip: string;
  action: () => void;
  order: number;
}

// ============================================================================
// Helpers
// ============================================================================

function createIconButton(parent: Instance, def: HudButtonDef): TextButton {
  const btn = new Instance("TextButton");
  btn.Name = def.name;
  btn.Size = new UDim2(0, 44, 0, 44);
  btn.BackgroundColor3 = new Color3(0.12, 0.12, 0.15);
  btn.BackgroundTransparency = 0.25;
  btn.BorderSizePixel = 0;
  btn.Text = def.emoji;
  btn.TextSize = 22;
  btn.TextColor3 = new Color3(1, 1, 1);
  btn.Font = Enum.Font.GothamBold;
  btn.AutoButtonColor = true;
  btn.LayoutOrder = def.order;
  btn.Parent = parent;

  const corner = new Instance("UICorner");
  corner.CornerRadius = new UDim(0, 10);
  corner.Parent = btn;

  // Hover tooltip (simple label above the button)
  const tooltip = new Instance("TextLabel");
  tooltip.Name = "Tooltip";
  tooltip.Size = new UDim2(0, 100, 0, 24);
  tooltip.Position = new UDim2(0, -110, 0.5, -12);
  tooltip.BackgroundColor3 = new Color3(0.08, 0.08, 0.1);
  tooltip.BackgroundTransparency = 0.15;
  tooltip.BorderSizePixel = 0;
  tooltip.TextColor3 = new Color3(1, 1, 1);
  tooltip.TextSize = 12;
  tooltip.Font = Enum.Font.Gotham;
  tooltip.Text = def.tooltip;
  tooltip.TextXAlignment = Enum.TextXAlignment.Right;
  tooltip.Visible = false;
  tooltip.Parent = btn;

  const tipCorner = new Instance("UICorner");
  tipCorner.CornerRadius = new UDim(0, 6);
  tipCorner.Parent = tooltip;

  btn.MouseEnter.Connect(() => {
    tooltip.Visible = true;
    btn.BackgroundTransparency = 0.1;
  });

  btn.MouseLeave.Connect(() => {
    tooltip.Visible = false;
    btn.BackgroundTransparency = 0.25;
  });

  btn.MouseButton1Click.Connect(() => {
    def.action();
  });

  return btn;
}

function showFloatingNotification(
  gui: ScreenGui,
  text: string,
  color: Color3,
  duration: number
): void {
  const label = new Instance("TextLabel");
  label.Size = new UDim2(0, 300, 0, 40);
  label.Position = new UDim2(0.5, -150, 0, 70);
  label.BackgroundColor3 = new Color3(0.08, 0.08, 0.1);
  label.BackgroundTransparency = 0.2;
  label.BorderSizePixel = 0;
  label.TextColor3 = color;
  label.TextSize = 16;
  label.Font = Enum.Font.GothamBold;
  label.Text = text;
  label.TextWrapped = true;
  label.ZIndex = 100;
  label.Parent = gui;

  const corner = new Instance("UICorner");
  corner.CornerRadius = new UDim(0, 8);
  corner.Parent = label;

  task.delay(duration, () => {
    const tween = game.GetService("TweenService").Create(label, new TweenInfo(0.4), {
      BackgroundTransparency: 1,
      TextTransparency: 1,
    });
    tween.Play();
    tween.Completed.Connect(() => {
      label.Destroy();
    });
  });
}

// ============================================================================
// Controller
// ============================================================================

let hudGui: ScreenGui | undefined;

export const HudController: Controller = {
  onStart() {
    logger.info("HudController starting...");

    const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

    hudGui = new Instance("ScreenGui");
    hudGui.Name = "HudButtons";
    hudGui.ResetOnSpawn = false;
    hudGui.DisplayOrder = 5;
    hudGui.Parent = playerGui;

    // Sidebar container (right edge, below leaderboard)
    const sidebar = new Instance("Frame");
    sidebar.Name = "Sidebar";
    sidebar.Size = new UDim2(0, 52, 0, 400);
    sidebar.Position = new UDim2(1, -58, 0.5, -200);
    sidebar.BackgroundTransparency = 1;
    sidebar.Parent = hudGui;

    const layout = new Instance("UIListLayout");
    layout.SortOrder = Enum.SortOrder.LayoutOrder;
    layout.Padding = new UDim(0, 6);
    layout.HorizontalAlignment = Enum.HorizontalAlignment.Center;
    layout.Parent = sidebar;

    // Button definitions
    const buttons: HudButtonDef[] = [
      {
        name: "Quests",
        emoji: "📋",
        tooltip: "Quest Log",
        action: () => ScreenController.toggleQuestLog(),
        order: 1,
      },
      {
        name: "Inventory",
        emoji: "🎒",
        tooltip: "Inventory",
        action: () => ScreenController.toggleInventory(),
        order: 2,
      },
      {
        name: "Pets",
        emoji: "🐾",
        tooltip: "Pets",
        action: () => ScreenController.togglePets(),
        order: 3,
      },
      {
        name: "Shop",
        emoji: "🥚",
        tooltip: "Egg Shop",
        action: () => ScreenController.toggleGacha(),
        order: 4,
      },
      {
        name: "Cosmetics",
        emoji: "✨",
        tooltip: "Cosmetics",
        action: () => ScreenController.toggleCosmetics(),
        order: 5,
      },
      {
        name: "BattlePass",
        emoji: "⭐",
        tooltip: "Battle Pass",
        action: () => ScreenController.toggleBattlePass(),
        order: 6,
      },
      {
        name: "Settings",
        emoji: "⚙️",
        tooltip: "Settings",
        action: () => ScreenController.toggleSettings(),
        order: 7,
      },
    ];

    for (const def of buttons) {
      createIconButton(sidebar, def);
    }

    // ── Event-driven floating notifications ─────────────────────────

    RemoteController.onLevelUp((data) => {
      if (hudGui) {
        showFloatingNotification(
          hudGui,
          `🎉 Level Up! You are now level ${data.newLevel}!`,
          new Color3(0.3, 0.9, 0.3),
          3
        );
      }
    });

    RemoteController.onPrestige((data) => {
      if (hudGui) {
        showFloatingNotification(
          hudGui,
          `🏆 Prestige ${data.newPrestige} Unlocked!`,
          new Color3(1, 0.85, 0.1),
          4
        );
      }
    });

    RemoteController.onQuestCompleted((data) => {
      if (hudGui) {
        showFloatingNotification(
          hudGui,
          `✅ Quest Complete: ${data.questId}`,
          new Color3(0.3, 0.7, 1),
          3
        );
      }
    });

    RemoteController.onAchievementCompleted((data) => {
      if (hudGui) {
        showFloatingNotification(
          hudGui,
          `🏅 Achievement: ${data.achievementId}`,
          new Color3(1, 0.7, 0.2),
          3
        );
      }
    });

    RemoteController.onEventStarted((data) => {
      if (hudGui) {
        showFloatingNotification(
          hudGui,
          `🎊 Event Started: ${data.label}`,
          new Color3(0.9, 0.3, 0.9),
          4
        );
      }
    });

    RemoteController.onEventEnded((data) => {
      if (hudGui) {
        showFloatingNotification(
          hudGui,
          `Event Ended: ${data.label}`,
          new Color3(0.6, 0.6, 0.6),
          3
        );
      }
    });

    // ── Keybind: Escape closes active modal ─────────────────────────

    onAction("menu", (state) => {
      if (!state.active) return;
      ScreenController.closeActiveModal();
    });

    logger.info("HudController started — sidebar created.");
  },
};
