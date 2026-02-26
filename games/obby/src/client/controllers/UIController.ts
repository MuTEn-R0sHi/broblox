/**
 * UI Controller
 * Manages game UI elements using Controller lifecycle.
 */

import { Players } from "@rbxts/services";
import { Controller, createLogger } from "@broblox/core";
import { RemoteController } from "./RemoteController";
import {
  StageCompletedEvent,
  CheckpointReachedEvent,
  LeaderboardRefreshStatusPayload,
  LeaderboardUpdatePayload,
} from "shared/types";

const logger = createLogger("UIController");
const player = Players.LocalPlayer;

// UI References
let mainGui: ScreenGui | undefined;
let stageLabel: TextLabel | undefined;
let coinsLabel: TextLabel | undefined;
let timerLabel: TextLabel | undefined;
let notificationFrame: Frame | undefined;
let leaderboardFrame: Frame | undefined;
let leaderboardUpdatedLabel: TextLabel | undefined;
let leaderboardList: Frame | undefined;
let leaderboardRefreshButton: TextButton | undefined;

// State
let currentStage = 1;
let coins = 0;
let stageStartTime = os.clock();
let leaderboardRefreshCoolingDown = false;
let leaderboardRefreshPending = false;
let leaderboardRefreshNonce = 0;

function updateLeaderboardRefreshButton(): void {
  const btn = leaderboardRefreshButton;
  if (!btn) return;

  const canClick = !leaderboardRefreshCoolingDown;
  btn.Active = canClick;
  btn.AutoButtonColor = canClick;
  btn.TextTransparency = canClick ? 0.15 : 0.35;
  btn.BackgroundTransparency = canClick ? 0.2 : 0.5;

  if (leaderboardRefreshPending && !canClick) {
    btn.Text = "Refreshing...";
  } else {
    btn.Text = "Refresh";
  }
}

function formatLeaderboardPlayerName(userId: number, playerName: string): string {
  const MAX_LEN = 16;
  let nameOut = playerName;
  if (nameOut.size() > MAX_LEN) {
    nameOut = `${nameOut.sub(1, MAX_LEN - 1)}…`;
  }

  if (userId === player.UserId) {
    return `${nameOut} (You)`;
  }

  return nameOut;
}

function updateCoinsDisplay(): void {
  if (coinsLabel) {
    coinsLabel.Text = `🪙 ${coins}`;
  }
}

function showNotification(text: string, color: Color3, duration: number): void {
  if (!notificationFrame) return;

  const notification = new Instance("TextLabel");
  notification.Size = new UDim2(1, 0, 0, 60);
  notification.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
  notification.BackgroundTransparency = 0.3;
  notification.TextColor3 = color;
  notification.TextSize = 18;
  notification.Font = Enum.Font.GothamBold;
  notification.Text = text;
  notification.TextWrapped = true;
  notification.Parent = notificationFrame;

  const corner = new Instance("UICorner");
  corner.CornerRadius = new UDim(0, 8);
  corner.Parent = notification;

  task.delay(duration, () => {
    const tween = game.GetService("TweenService").Create(notification, new TweenInfo(0.5), {
      BackgroundTransparency: 1,
      TextTransparency: 1,
    });
    tween.Play();
    tween.Completed.Connect(() => {
      notification.Destroy();
    });
  });
}

function onCheckpointReached(event: CheckpointReachedEvent): void {
  if (!event.isNew) return;

  currentStage = event.stageNumber;
  if (stageLabel) {
    stageLabel.Text = `Stage ${currentStage}`;
  }

  stageStartTime = os.clock();
  showNotification(`✓ Checkpoint ${event.checkpointId}`, new Color3(0.2, 0.8, 0.2), 2);
}

function onStageCompleted(event: StageCompletedEvent): void {
  coins += event.coinsEarned;
  updateCoinsDisplay();

  stageStartTime = os.clock();

  let message = `Stage ${event.stageNumber} Complete!`;
  message += `\n${string.format("%.2f", event.completionTime)}s`;
  if (event.isNewBest) {
    message += " ⭐ NEW BEST!";
  }
  message += `\n+${event.coinsEarned} coins`;

  showNotification(message, new Color3(0.2, 0.6, 1), 3);
}

function onDataSync(data: {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
}): void {
  logger.debug(`Data sync received: coins=${data.coins}`);
  const coinDelta = data.coins - coins;
  coins = data.coins;
  currentStage = data.currentStage;
  updateCoinsDisplay();

  if (stageLabel) {
    stageLabel.Text = `Stage ${currentStage}`;
  }

  if (coinDelta > 0) {
    showNotification(`+${coinDelta} coins!`, new Color3(1, 0.8, 0), 1.5);
  }
}

function onLeaderboardUpdate(payload: LeaderboardUpdatePayload): void {
  if (!leaderboardList) return;

  leaderboardRefreshPending = false;
  updateLeaderboardRefreshButton();

  if (leaderboardUpdatedLabel) {
    const timeText = os.date("%H:%M:%S", payload.updatedAt);
    leaderboardUpdatedLabel.Text = `Updated ${timeText}`;
  }

  for (const child of leaderboardList.GetChildren()) {
    if (child.IsA("TextLabel")) {
      child.Destroy();
    }
  }

  const entries = payload.entries;
  const count = entries.size();
  if (count === 0) {
    const empty = new Instance("TextLabel");
    empty.Size = new UDim2(1, 0, 0, 22);
    empty.BackgroundTransparency = 1;
    empty.TextColor3 = new Color3(1, 1, 1);
    empty.TextTransparency = 0.25;
    empty.TextSize = 14;
    empty.Font = Enum.Font.Gotham;
    empty.TextXAlignment = Enum.TextXAlignment.Left;
    empty.Text = "No entries yet";
    empty.Parent = leaderboardList;
    return;
  }

  for (let i = 0; i < count; i++) {
    const e = entries[i];
    const row = new Instance("TextLabel");
    row.Name = "Row";
    row.Size = new UDim2(1, 0, 0, 22);
    row.BackgroundTransparency = 1;
    row.TextColor3 = new Color3(1, 1, 1);
    row.TextSize = 14;
    row.Font = Enum.Font.Gotham;
    row.TextXAlignment = Enum.TextXAlignment.Left;

    if (e.userId === player.UserId) {
      row.BackgroundTransparency = 0.8;
      row.BackgroundColor3 = new Color3(0.2, 0.4, 1);
      row.Font = Enum.Font.GothamBold;
    }

    const timeText = e.bestTime !== undefined ? ` • ${string.format("%.2f", e.bestTime)}s` : "";
    const nameText = formatLeaderboardPlayerName(e.userId, e.playerName);
    row.Text = `#${e.rank} ${nameText} • ${e.completions} win${e.completions === 1 ? "" : "s"}${timeText}`;
    row.Parent = leaderboardList;
  }
}

function onLeaderboardRefreshStatus(status: LeaderboardRefreshStatusPayload): void {
  if (status.ok) return;

  const retryAfter = status.retryAfter ?? 1;
  const secondsText = string.format("%.1f", retryAfter);
  showNotification(
    `Refresh rate-limited. Try again in ${secondsText}s`,
    new Color3(1, 0.8, 0.2),
    1.5
  );

  leaderboardRefreshPending = false;
  if (leaderboardUpdatedLabel && leaderboardUpdatedLabel.Text === "Refreshing...") {
    leaderboardUpdatedLabel.Text = `Rate limited (${secondsText}s)`;
  }

  leaderboardRefreshCoolingDown = true;
  updateLeaderboardRefreshButton();
  const nonce = leaderboardRefreshNonce;
  task.delay(retryAfter + 0.05, () => {
    if (nonce !== leaderboardRefreshNonce) return;
    leaderboardRefreshCoolingDown = false;
    updateLeaderboardRefreshButton();
  });
}

function timerLoop(): void {
  while (mainGui?.Parent) {
    const elapsed = os.clock() - stageStartTime;
    if (timerLabel) {
      timerLabel.Text = string.format("%.2fs", elapsed);
    }
    task.wait(0.05);
  }
}

function createUI(playerGui: PlayerGui): void {
  mainGui = new Instance("ScreenGui");
  mainGui.Name = "ObbyUI";
  mainGui.ResetOnSpawn = false;
  mainGui.Parent = playerGui;

  // Top bar frame
  const topBar = new Instance("Frame");
  topBar.Name = "TopBar";
  topBar.Size = new UDim2(1, 0, 0, 50);
  topBar.Position = new UDim2(0, 0, 0, 0);
  topBar.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
  topBar.BackgroundTransparency = 0.5;
  topBar.BorderSizePixel = 0;
  topBar.Parent = mainGui;

  // Stage label
  stageLabel = new Instance("TextLabel");
  stageLabel.Name = "StageLabel";
  stageLabel.Size = new UDim2(0.3, 0, 1, 0);
  stageLabel.Position = new UDim2(0, 10, 0, 0);
  stageLabel.BackgroundTransparency = 1;
  stageLabel.TextColor3 = new Color3(1, 1, 1);
  stageLabel.TextSize = 24;
  stageLabel.TextXAlignment = Enum.TextXAlignment.Left;
  stageLabel.Font = Enum.Font.GothamBold;
  stageLabel.Text = `Stage ${currentStage}`;
  stageLabel.Parent = topBar;

  // Timer label
  timerLabel = new Instance("TextLabel");
  timerLabel.Name = "TimerLabel";
  timerLabel.Size = new UDim2(0.3, 0, 1, 0);
  timerLabel.Position = new UDim2(0.35, 0, 0, 0);
  timerLabel.BackgroundTransparency = 1;
  timerLabel.TextColor3 = new Color3(1, 1, 1);
  timerLabel.TextSize = 24;
  timerLabel.Font = Enum.Font.GothamBold;
  timerLabel.Text = "0.00s";
  timerLabel.Parent = topBar;

  // Coins label
  coinsLabel = new Instance("TextLabel");
  coinsLabel.Name = "CoinsLabel";
  coinsLabel.Size = new UDim2(0.3, 0, 1, 0);
  coinsLabel.Position = new UDim2(0.7, -10, 0, 0);
  coinsLabel.BackgroundTransparency = 1;
  coinsLabel.TextColor3 = new Color3(1, 0.8, 0);
  coinsLabel.TextSize = 24;
  coinsLabel.TextXAlignment = Enum.TextXAlignment.Right;
  coinsLabel.Font = Enum.Font.GothamBold;
  coinsLabel.Text = `🪙 ${coins}`;
  coinsLabel.Parent = topBar;

  // Notification frame
  notificationFrame = new Instance("Frame");
  notificationFrame.Name = "Notifications";
  notificationFrame.Size = new UDim2(0.3, 0, 0.3, 0);
  notificationFrame.Position = new UDim2(0.35, 0, 0.15, 0);
  notificationFrame.BackgroundTransparency = 1;
  notificationFrame.Parent = mainGui;

  const listLayout = new Instance("UIListLayout");
  listLayout.SortOrder = Enum.SortOrder.LayoutOrder;
  listLayout.Padding = new UDim(0, 10);
  listLayout.Parent = notificationFrame;

  // Leaderboard panel (right side)
  leaderboardFrame = new Instance("Frame");
  leaderboardFrame.Name = "Leaderboard";
  leaderboardFrame.Size = new UDim2(0, 260, 0, 280);
  leaderboardFrame.Position = new UDim2(1, -270, 0, 60);
  leaderboardFrame.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
  leaderboardFrame.BackgroundTransparency = 0.35;
  leaderboardFrame.BorderSizePixel = 0;
  leaderboardFrame.Parent = mainGui;

  const lbCorner = new Instance("UICorner");
  lbCorner.CornerRadius = new UDim(0, 10);
  lbCorner.Parent = leaderboardFrame;

  const title = new Instance("TextLabel");
  title.Name = "Title";
  title.Size = new UDim2(1, -16, 0, 20);
  title.Position = new UDim2(0, 8, 0, 6);
  title.BackgroundTransparency = 1;
  title.TextColor3 = new Color3(1, 1, 1);
  title.TextSize = 18;
  title.Font = Enum.Font.GothamBold;
  title.TextXAlignment = Enum.TextXAlignment.Left;
  title.Text = "Leaderboard";
  title.Parent = leaderboardFrame;

  leaderboardRefreshButton = new Instance("TextButton");
  leaderboardRefreshButton.Name = "Refresh";
  leaderboardRefreshButton.Size = new UDim2(0, 72, 0, 20);
  leaderboardRefreshButton.Position = new UDim2(1, -80, 0, 6);
  leaderboardRefreshButton.BackgroundColor3 = new Color3(0.2, 0.2, 0.2);
  leaderboardRefreshButton.BackgroundTransparency = 0.2;
  leaderboardRefreshButton.BorderSizePixel = 0;
  leaderboardRefreshButton.TextColor3 = new Color3(1, 1, 1);
  leaderboardRefreshButton.TextTransparency = 0.15;
  leaderboardRefreshButton.TextSize = 12;
  leaderboardRefreshButton.Font = Enum.Font.GothamBold;
  leaderboardRefreshButton.Text = "Refresh";
  leaderboardRefreshButton.AutoButtonColor = true;
  leaderboardRefreshButton.Parent = leaderboardFrame;

  const refreshCorner = new Instance("UICorner");
  refreshCorner.CornerRadius = new UDim(0, 6);
  refreshCorner.Parent = leaderboardRefreshButton;

  leaderboardRefreshButton.MouseButton1Click.Connect(() => {
    if (leaderboardRefreshCoolingDown) return;

    leaderboardRefreshPending = true;
    leaderboardRefreshCoolingDown = true;
    const nonce = (leaderboardRefreshNonce += 1);

    if (leaderboardUpdatedLabel) {
      leaderboardUpdatedLabel.Text = "Refreshing...";
    }
    updateLeaderboardRefreshButton();
    RemoteController.requestLeaderboardRefresh();

    task.delay(1.1, () => {
      if (nonce !== leaderboardRefreshNonce) return;
      leaderboardRefreshCoolingDown = false;
      updateLeaderboardRefreshButton();
    });

    task.delay(3, () => {
      if (nonce !== leaderboardRefreshNonce) return;
      if (!leaderboardRefreshPending) return;

      leaderboardRefreshPending = false;
      updateLeaderboardRefreshButton();
      if (leaderboardUpdatedLabel && leaderboardUpdatedLabel.Text === "Refreshing...") {
        leaderboardUpdatedLabel.Text = "Update timed out";
      }
    });
  });

  leaderboardUpdatedLabel = new Instance("TextLabel");
  leaderboardUpdatedLabel.Name = "Updated";
  leaderboardUpdatedLabel.Size = new UDim2(1, -16, 0, 16);
  leaderboardUpdatedLabel.Position = new UDim2(0, 8, 0, 26);
  leaderboardUpdatedLabel.BackgroundTransparency = 1;
  leaderboardUpdatedLabel.TextColor3 = new Color3(1, 1, 1);
  leaderboardUpdatedLabel.TextTransparency = 0.35;
  leaderboardUpdatedLabel.TextSize = 12;
  leaderboardUpdatedLabel.Font = Enum.Font.Gotham;
  leaderboardUpdatedLabel.TextXAlignment = Enum.TextXAlignment.Left;
  leaderboardUpdatedLabel.Text = "Updated --:--:--";
  leaderboardUpdatedLabel.Parent = leaderboardFrame;

  const divider = new Instance("Frame");
  divider.Name = "Divider";
  divider.Size = new UDim2(1, -16, 0, 1);
  divider.Position = new UDim2(0, 8, 0, 46);
  divider.BackgroundColor3 = new Color3(1, 1, 1);
  divider.BackgroundTransparency = 0.85;
  divider.BorderSizePixel = 0;
  divider.Parent = leaderboardFrame;

  leaderboardList = new Instance("Frame");
  leaderboardList.Name = "List";
  leaderboardList.Size = new UDim2(1, -16, 1, -56);
  leaderboardList.Position = new UDim2(0, 8, 0, 52);
  leaderboardList.BackgroundTransparency = 1;
  leaderboardList.Parent = leaderboardFrame;

  const lbLayout = new Instance("UIListLayout");
  lbLayout.SortOrder = Enum.SortOrder.LayoutOrder;
  lbLayout.Padding = new UDim(0, 4);
  lbLayout.Parent = leaderboardList;
}

export const UIController: Controller = {
  onStart() {
    logger.info("UIController starting...");

    const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
    createUI(playerGui);

    // Subscribe to events
    RemoteController.onCheckpoint((event) => onCheckpointReached(event));
    RemoteController.onStage((event) => onStageCompleted(event));
    RemoteController.onDataSync((data) => onDataSync(data));
    RemoteController.onLeaderboard((data) => onLeaderboardUpdate(data));
    RemoteController.onLeaderboardRefreshStatus((data) => onLeaderboardRefreshStatus(data));

    // Start timer update loop
    task.spawn(() => timerLoop());

    logger.info("UIController started.");
  },
};
