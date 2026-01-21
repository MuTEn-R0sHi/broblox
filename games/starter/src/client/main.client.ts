/**
 * Game Client Entry Point
 * Phase 0.5: Minimal bootstrap to verify tooling end-to-end.
 */

import { Players, ReplicatedStorage, UserInputService } from "@rbxts/services";
import { PROTOCOL_VERSION, type Result } from "@rbx/shared-types";
import { createLogger } from "@rbx/core";
import { REMOTES, type HandshakePayload, type DoActionPayload } from "@rbx/net";

// ============================================================================
// Bootstrap
// ============================================================================

const logger = createLogger("Client");
const player = Players.LocalPlayer;

// Wait for remotes
const remotesFolder = ReplicatedStorage.WaitForChild("Remotes", 30) as Folder;
const handshakeRemote = remotesFolder.WaitForChild(REMOTES.Handshake.name) as RemoteFunction;
const doActionRemote = remotesFolder.WaitForChild(REMOTES.DoAction.name) as RemoteFunction;

// ============================================================================
// Device Detection
// ============================================================================

function detectDeviceClass(): "kbm" | "gamepad" | "touch" {
  if (UserInputService.TouchEnabled && !UserInputService.KeyboardEnabled) {
    return "touch";
  }
  if (UserInputService.GamepadEnabled) {
    return "gamepad";
  }
  return "kbm";
}

// ============================================================================
// Protocol Handshake
// ============================================================================

function performHandshake(): boolean {
  const payload: HandshakePayload = {
    protocolVersion: PROTOCOL_VERSION,
    buildId: "starter-0.0.0",
    deviceClass: detectDeviceClass(),
  };

  logger.info("Performing handshake...");
  const result = handshakeRemote.InvokeServer(payload) as Result<{ serverVersion: number; serverTime: number }>;

  if (!result.ok) {
    logger.error(`Handshake failed: code=${result.code}`);
    return false;
  }

  logger.info(`Handshake success: serverVersion=${result.value.serverVersion}`);
  return true;
}

// ============================================================================
// Test DoAction
// ============================================================================

function testDoAction(): void {
  const payload: DoActionPayload = {
    actionId: "test-action",
    timestamp: os.clock() * 1000,
  };

  logger.debug("Invoking DoAction...");
  const result = doActionRemote.InvokeServer(payload) as Result<{ actionId: string; processedAt: number }>;

  if (!result.ok) {
    logger.warn(`DoAction failed: code=${result.code}`);
    return;
  }

  logger.info(`DoAction success: actionId=${result.value.actionId}`);
}

// ============================================================================
// Simple Status UI
// ============================================================================

function createStatusUI(connected: boolean): void {
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

// ============================================================================
// Main
// ============================================================================

logger.info("Client starting...");

const connected = performHandshake();
createStatusUI(connected);

if (connected) {
  // Test DoAction after a short delay
  task.delay(2, () => testDoAction());
  logger.info("Client ready");
} else {
  logger.error("Failed to connect to server");
}
