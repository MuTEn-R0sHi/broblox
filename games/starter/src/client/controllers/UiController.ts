import { Players } from "@rbxts/services";
import { PROTOCOL_VERSION } from "@rbx/net";

// This is just a UI controller
export function createStatusUI(connected: boolean) {
  const player = Players.LocalPlayer;
  if (!player) return;

  const screenGui = new Instance("ScreenGui");
  screenGui.Name = "StarterStatusUI";
  screenGui.ResetOnSpawn = false;
  screenGui.IgnoreGuiInset = true;

  const frame = new Instance("Frame");
  frame.Name = "StatusFrame";
  frame.Size = new UDim2(0, 300, 0, 100);
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
  statusLabel.TextColor3 = connected ? new Color3(0, 1, 0) : new Color3(1, 0, 0);
  statusLabel.TextSize = 18;
  statusLabel.Font = Enum.Font.GothamMedium;
  statusLabel.TextXAlignment = Enum.TextXAlignment.Left;
  statusLabel.Text = connected ? "Connected" : "Disconnected";
  statusLabel.Parent = frame;

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

  const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
  screenGui.Parent = playerGui;
}
