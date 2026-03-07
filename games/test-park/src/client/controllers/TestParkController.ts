/**
 * Test Park Controller (Client)
 *
 * Auto-generated UI from the shared zone registry:
 *   • Floating zone teleporter panel (toggle via button)
 *   • Action result toast (auto-hides after a few seconds)
 *
 * The controller reads ZONE_REGISTRY at init. Adding a zone to the
 * registry automatically adds a button here — no manual UI work.
 */

import { Controller, createLogger } from "@broblox/core";
import { Players } from "@rbxts/services";
import { ZONE_REGISTRY } from "shared/test-park/zone-registry";
import { RemoteController } from "./RemoteController";

const logger = createLogger("TestParkController");

// =========================================================================
// Constants
// =========================================================================

const PANEL_WIDTH = 260;
const PANEL_ITEM_HEIGHT = 36;
const PANEL_PADDING = 8;
const TOAST_DURATION = 5;

// =========================================================================
// Module state
// =========================================================================

let screenGui: ScreenGui | undefined;
let panelFrame: ScrollingFrame | undefined;
let toggleButton: TextButton | undefined;
let toastLabel: TextLabel | undefined;
let panelVisible = true;

// =========================================================================
// UI builders
// =========================================================================

function ensureGui(): ScreenGui {
  if (screenGui) return screenGui;
  const player = Players.LocalPlayer;

  const gui = new Instance("ScreenGui");
  gui.Name = "TestParkUI";
  gui.ResetOnSpawn = false;
  gui.IgnoreGuiInset = true;
  gui.DisplayOrder = 100;
  gui.Parent = player.WaitForChild("PlayerGui");
  screenGui = gui;
  return gui;
}

function buildToggleButton(parent: ScreenGui): TextButton {
  const btn = new Instance("TextButton");
  btn.Name = "ToggleZones";
  btn.Size = new UDim2(0, 120, 0, 36);
  btn.Position = new UDim2(1, -130, 0, 10);
  btn.BackgroundColor3 = new Color3(0.15, 0.15, 0.2);
  btn.BackgroundTransparency = 0.2;
  btn.TextColor3 = new Color3(1, 1, 1);
  btn.TextSize = 16;
  btn.Font = Enum.Font.GothamMedium;
  btn.Text = "🗺️ Zones";
  btn.AutoButtonColor = true;
  btn.Parent = parent;

  const corner = new Instance("UICorner");
  corner.CornerRadius = new UDim(0, 8);
  corner.Parent = btn;

  return btn;
}

function buildPanel(parent: ScreenGui): ScrollingFrame {
  const zoneCount = ZONE_REGISTRY.size();
  const contentHeight = zoneCount * (PANEL_ITEM_HEIGHT + PANEL_PADDING) + PANEL_PADDING;

  const frame = new Instance("ScrollingFrame");
  frame.Name = "ZonePanel";
  frame.Size = new UDim2(0, PANEL_WIDTH, 0.7, 0);
  frame.Position = new UDim2(1, -(PANEL_WIDTH + 10), 0, 54);
  frame.BackgroundColor3 = new Color3(0.1, 0.1, 0.14);
  frame.BackgroundTransparency = 0.15;
  frame.BorderSizePixel = 0;
  frame.ScrollBarThickness = 6;
  frame.CanvasSize = new UDim2(0, 0, 0, contentHeight);
  frame.Parent = parent;

  const panelCorner = new Instance("UICorner");
  panelCorner.CornerRadius = new UDim(0, 8);
  panelCorner.Parent = frame;

  // Header
  const header = new Instance("TextLabel");
  header.Name = "Header";
  header.Size = new UDim2(1, -PANEL_PADDING * 2, 0, 30);
  header.Position = new UDim2(0, PANEL_PADDING, 0, 4);
  header.BackgroundTransparency = 1;
  header.TextColor3 = new Color3(0.9, 0.9, 0.9);
  header.TextSize = 15;
  header.Font = Enum.Font.GothamBold;
  header.TextXAlignment = Enum.TextXAlignment.Left;
  header.Text = `Test Park — ${zoneCount} Zones`;
  header.Parent = frame;

  // Zone buttons
  for (let i = 0; i < zoneCount; i++) {
    const zone = ZONE_REGISTRY[i];
    const yPos = 36 + i * (PANEL_ITEM_HEIGHT + PANEL_PADDING);

    const btn = new Instance("TextButton");
    btn.Name = `Zone_${zone.id}`;
    btn.Size = new UDim2(1, -PANEL_PADDING * 2, 0, PANEL_ITEM_HEIGHT);
    btn.Position = new UDim2(0, PANEL_PADDING, 0, yPos);
    btn.BackgroundColor3 = new Color3(zone.color[0], zone.color[1], zone.color[2]);
    btn.BackgroundTransparency = 0.35;
    btn.TextColor3 = new Color3(1, 1, 1);
    btn.TextSize = 14;
    btn.Font = Enum.Font.GothamMedium;
    btn.TextXAlignment = Enum.TextXAlignment.Left;
    btn.Text = `  ${zone.label}`;
    btn.AutoButtonColor = true;
    btn.Parent = frame;

    const btnCorner = new Instance("UICorner");
    btnCorner.CornerRadius = new UDim(0, 6);
    btnCorner.Parent = btn;

    // Teleport on click
    btn.MouseButton1Click.Connect(() => {
      logger.info(`Teleporting to zone: ${zone.id}`);
      RemoteController.getRegistry().fire("TestPark_Teleport", { zoneId: zone.id });
    });
  }

  return frame;
}

function buildToast(parent: ScreenGui): TextLabel {
  const label = new Instance("TextLabel");
  label.Name = "ActionToast";
  label.Size = new UDim2(0.5, 0, 0, 44);
  label.Position = new UDim2(0.25, 0, 1, -60);
  label.BackgroundColor3 = new Color3(0.12, 0.12, 0.16);
  label.BackgroundTransparency = 0.15;
  label.TextColor3 = new Color3(1, 1, 1);
  label.TextSize = 15;
  label.Font = Enum.Font.GothamMedium;
  label.TextWrapped = true;
  label.Text = "";
  label.Visible = false;
  label.Parent = parent;

  const toastCorner = new Instance("UICorner");
  toastCorner.CornerRadius = new UDim(0, 8);
  toastCorner.Parent = label;

  return label;
}

// =========================================================================
// Toast management
// =========================================================================

let toastThread: thread | undefined;

function showToast(text: string, success: boolean): void {
  if (!toastLabel) return;
  toastLabel.Text = `  ${text}`;
  toastLabel.TextColor3 = success ? new Color3(0.4, 1, 0.5) : new Color3(1, 0.4, 0.4);
  toastLabel.Visible = true;

  // Cancel previous auto-hide
  if (toastThread) {
    task.cancel(toastThread);
  }
  toastThread = task.delay(TOAST_DURATION, () => {
    if (toastLabel) toastLabel.Visible = false;
    toastThread = undefined;
  });
}

// =========================================================================
// Controller
// =========================================================================

export const TestParkController: Controller = {
  onInit() {
    const gui = ensureGui();
    toggleButton = buildToggleButton(gui);
    panelFrame = buildPanel(gui);
    toastLabel = buildToast(gui);

    toggleButton.MouseButton1Click.Connect(() => {
      panelVisible = !panelVisible;
      if (panelFrame) panelFrame.Visible = panelVisible;
    });

    logger.info(`Test park UI built — ${ZONE_REGISTRY.size()} zones`);
  },

  onStart() {
    // Listen for action results from server
    const registry = RemoteController.getRegistry();
    registry.onEvent("TestPark_ActionResult", (payload) => {
      logger.info(`Action result: [${payload.actionId}] ${payload.result}`);
      showToast(payload.result, payload.success);
    });
  },

  onDestroy() {
    if (toastThread) {
      task.cancel(toastThread);
    }
    if (screenGui) {
      screenGui.Destroy();
      screenGui = undefined;
      panelFrame = undefined;
      toggleButton = undefined;
      toastLabel = undefined;
    }
  },
};
