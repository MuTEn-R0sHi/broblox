import { Players } from "@rbxts/services";
import { Controller } from "@broblox/core";
import { PROTOCOL_VERSION } from "@broblox/net";

/**
 * UI Controller for status display.
 * Follows the Controller interface pattern.
 */
export const UiController: Controller & {
  showStatus(connected: boolean): void;
  showActionResult(message: string, success: boolean): void;
  screenGui?: ScreenGui;
  statusLabel?: TextLabel;
  infoLabel?: TextLabel;
  playerLabel?: TextLabel;
  actionLabel?: TextLabel;
  ensureGui(): void;
} = {
  screenGui: undefined,
  statusLabel: undefined,
  infoLabel: undefined,
  playerLabel: undefined,
  actionLabel: undefined,

  onDestroy() {
    if (this.screenGui) {
      this.screenGui.Destroy();
      this.screenGui = undefined;
      this.statusLabel = undefined;
      this.infoLabel = undefined;
      this.playerLabel = undefined;
      this.actionLabel = undefined;
    }
  },

  ensureGui() {
    const player = Players.LocalPlayer;
    if (!player) return;

    if (this.screenGui) {
      return;
    }

    const screenGui = new Instance("ScreenGui");
    screenGui.Name = "StarterStatusUI";
    screenGui.ResetOnSpawn = false;
    screenGui.IgnoreGuiInset = true;
    this.screenGui = screenGui;

    const frame = new Instance("Frame");
    frame.Name = "StatusFrame";
    frame.Size = new UDim2(0, 320, 0, 130);
    frame.Position = new UDim2(0, 10, 0, 10);
    frame.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
    frame.BackgroundTransparency = 0.3;
    frame.Parent = screenGui;

    const corner = new Instance("UICorner");
    corner.CornerRadius = new UDim(0, 8);
    corner.Parent = frame;

    const statusLabel = new Instance("TextLabel");
    statusLabel.Name = "StatusLabel";
    statusLabel.Size = new UDim2(1, -20, 0, 30);
    statusLabel.Position = new UDim2(0, 10, 0, 10);
    statusLabel.BackgroundTransparency = 1;
    statusLabel.TextColor3 = new Color3(1, 0, 0);
    statusLabel.TextSize = 18;
    statusLabel.Font = Enum.Font.GothamMedium;
    statusLabel.TextXAlignment = Enum.TextXAlignment.Left;
    statusLabel.Text = "Disconnected";
    statusLabel.Parent = frame;
    this.statusLabel = statusLabel;

    const infoLabel = new Instance("TextLabel");
    infoLabel.Name = "InfoLabel";
    infoLabel.Size = new UDim2(1, -20, 0, 20);
    infoLabel.Position = new UDim2(0, 10, 0, 45);
    infoLabel.BackgroundTransparency = 1;
    infoLabel.TextColor3 = new Color3(0.8, 0.8, 0.8);
    infoLabel.TextSize = 14;
    infoLabel.Font = Enum.Font.Gotham;
    infoLabel.TextXAlignment = Enum.TextXAlignment.Left;
    infoLabel.Text = "Protocol: v" + tostring(PROTOCOL_VERSION);
    infoLabel.Parent = frame;
    this.infoLabel = infoLabel;

    const playerLabel = new Instance("TextLabel");
    playerLabel.Name = "PlayerLabel";
    playerLabel.Size = new UDim2(1, -20, 0, 20);
    playerLabel.Position = new UDim2(0, 10, 0, 65);
    playerLabel.BackgroundTransparency = 1;
    playerLabel.TextColor3 = new Color3(0.8, 0.8, 0.8);
    playerLabel.TextSize = 14;
    playerLabel.Font = Enum.Font.Gotham;
    playerLabel.TextXAlignment = Enum.TextXAlignment.Left;
    playerLabel.Text = "Player: " + player.Name;
    playerLabel.Parent = frame;
    this.playerLabel = playerLabel;

    const actionLabel = new Instance("TextLabel");
    actionLabel.Name = "ActionLabel";
    actionLabel.Size = new UDim2(1, -20, 0, 20);
    actionLabel.Position = new UDim2(0, 10, 0, 90);
    actionLabel.BackgroundTransparency = 1;
    actionLabel.TextColor3 = new Color3(0.8, 0.8, 0.8);
    actionLabel.TextSize = 14;
    actionLabel.Font = Enum.Font.Gotham;
    actionLabel.TextXAlignment = Enum.TextXAlignment.Left;
    actionLabel.Text = "Action: -";
    actionLabel.Parent = frame;
    this.actionLabel = actionLabel;

    const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
    screenGui.Parent = playerGui;
  },

  showStatus(connected: boolean) {
    this.ensureGui();
    if (!this.statusLabel) return;

    this.statusLabel.TextColor3 = connected ? new Color3(0, 1, 0) : new Color3(1, 0, 0);
    this.statusLabel.Text = connected ? "Connected" : "Disconnected";
  },

  showActionResult(message: string, success: boolean) {
    this.ensureGui();
    if (!this.actionLabel) return;

    this.actionLabel.TextColor3 = success ? new Color3(0.6, 1, 0.6) : new Color3(1, 0.6, 0.6);
    this.actionLabel.Text = message;
  },
};
