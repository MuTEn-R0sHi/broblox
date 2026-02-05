/**
 * UI Controller
 * Manages game UI elements.
 */

import { Players } from "@rbxts/services";
import { createLogger } from "@rbx/core";
import { RemoteController } from "./RemoteController";
import {
  StageCompletedEvent,
  CheckpointReachedEvent,
  LeaderboardUpdatePayload,
} from "shared/types";

const logger = createLogger("UIController");

export class UIController {
  private remote: RemoteController;
  private player = Players.LocalPlayer;
  private playerGui?: PlayerGui;

  // UI References
  private mainGui?: ScreenGui;
  private stageLabel?: TextLabel;
  private coinsLabel?: TextLabel;
  private timerLabel?: TextLabel;
  private notificationFrame?: Frame;
  private leaderboardFrame?: Frame;
  private leaderboardUpdatedLabel?: TextLabel;
  private leaderboardList?: Frame;
  private leaderboardRefreshButton?: TextButton;

  // State
  private currentStage = 1;
  private coins = 0;
  private stageStartTime = os.clock();

  private formatLeaderboardPlayerName(userId: number, playerName: string): string {
    const MAX_LEN = 16;
    let nameOut = playerName;
    if (nameOut.size() > MAX_LEN) {
      nameOut = `${nameOut.sub(1, MAX_LEN - 1)}…`;
    }

    if (userId === this.player.UserId) {
      return `${nameOut} (You)`;
    }

    return nameOut;
  }

  constructor(remote: RemoteController) {
    this.remote = remote;
  }

  boot(): void {
    logger.info("UIController booting...");

    // Wait for PlayerGui
    this.playerGui = this.player.WaitForChild("PlayerGui") as PlayerGui;

    // Create UI
    this.createUI();

    // Subscribe to events
    this.remote.onCheckpoint((event) => this.onCheckpointReached(event));
    this.remote.onStage((event) => this.onStageCompleted(event));
    this.remote.onDataSync((data) => this.onDataSync(data));
    this.remote.onLeaderboard((data) => this.onLeaderboardUpdate(data));

    // Start timer update loop
    task.spawn(() => this.timerLoop());

    logger.info("UIController booted.");
  }

  private createUI(): void {
    // Main ScreenGui
    this.mainGui = new Instance("ScreenGui");
    this.mainGui.Name = "ObbyUI";
    this.mainGui.ResetOnSpawn = false;
    this.mainGui.Parent = this.playerGui;

    // Top bar frame
    const topBar = new Instance("Frame");
    topBar.Name = "TopBar";
    topBar.Size = new UDim2(1, 0, 0, 50);
    topBar.Position = new UDim2(0, 0, 0, 0);
    topBar.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
    topBar.BackgroundTransparency = 0.5;
    topBar.BorderSizePixel = 0;
    topBar.Parent = this.mainGui;

    // Stage label
    this.stageLabel = new Instance("TextLabel");
    this.stageLabel.Name = "StageLabel";
    this.stageLabel.Size = new UDim2(0.3, 0, 1, 0);
    this.stageLabel.Position = new UDim2(0, 10, 0, 0);
    this.stageLabel.BackgroundTransparency = 1;
    this.stageLabel.TextColor3 = new Color3(1, 1, 1);
    this.stageLabel.TextSize = 24;
    this.stageLabel.TextXAlignment = Enum.TextXAlignment.Left;
    this.stageLabel.Font = Enum.Font.GothamBold;
    this.stageLabel.Text = `Stage ${this.currentStage}`;
    this.stageLabel.Parent = topBar;

    // Timer label
    this.timerLabel = new Instance("TextLabel");
    this.timerLabel.Name = "TimerLabel";
    this.timerLabel.Size = new UDim2(0.3, 0, 1, 0);
    this.timerLabel.Position = new UDim2(0.35, 0, 0, 0);
    this.timerLabel.BackgroundTransparency = 1;
    this.timerLabel.TextColor3 = new Color3(1, 1, 1);
    this.timerLabel.TextSize = 24;
    this.timerLabel.Font = Enum.Font.GothamBold;
    this.timerLabel.Text = "0.00s";
    this.timerLabel.Parent = topBar;

    // Coins label
    this.coinsLabel = new Instance("TextLabel");
    this.coinsLabel.Name = "CoinsLabel";
    this.coinsLabel.Size = new UDim2(0.3, 0, 1, 0);
    this.coinsLabel.Position = new UDim2(0.7, -10, 0, 0);
    this.coinsLabel.BackgroundTransparency = 1;
    this.coinsLabel.TextColor3 = new Color3(1, 0.8, 0);
    this.coinsLabel.TextSize = 24;
    this.coinsLabel.TextXAlignment = Enum.TextXAlignment.Right;
    this.coinsLabel.Font = Enum.Font.GothamBold;
    this.coinsLabel.Text = `🪙 ${this.coins}`;
    this.coinsLabel.Parent = topBar;

    // Notification frame (for popups)
    this.notificationFrame = new Instance("Frame");
    this.notificationFrame.Name = "Notifications";
    this.notificationFrame.Size = new UDim2(0.3, 0, 0.3, 0);
    this.notificationFrame.Position = new UDim2(0.35, 0, 0.15, 0);
    this.notificationFrame.BackgroundTransparency = 1;
    this.notificationFrame.Parent = this.mainGui;

    const listLayout = new Instance("UIListLayout");
    listLayout.SortOrder = Enum.SortOrder.LayoutOrder;
    listLayout.Padding = new UDim(0, 10);
    listLayout.Parent = this.notificationFrame;

    // Leaderboard panel (right side)
    this.leaderboardFrame = new Instance("Frame");
    this.leaderboardFrame.Name = "Leaderboard";
    this.leaderboardFrame.Size = new UDim2(0, 260, 0, 280);
    this.leaderboardFrame.Position = new UDim2(1, -270, 0, 60);
    this.leaderboardFrame.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
    this.leaderboardFrame.BackgroundTransparency = 0.35;
    this.leaderboardFrame.BorderSizePixel = 0;
    this.leaderboardFrame.Parent = this.mainGui;

    const lbCorner = new Instance("UICorner");
    lbCorner.CornerRadius = new UDim(0, 10);
    lbCorner.Parent = this.leaderboardFrame;

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
    title.Parent = this.leaderboardFrame;

    this.leaderboardRefreshButton = new Instance("TextButton");
    this.leaderboardRefreshButton.Name = "Refresh";
    this.leaderboardRefreshButton.Size = new UDim2(0, 72, 0, 20);
    this.leaderboardRefreshButton.Position = new UDim2(1, -80, 0, 6);
    this.leaderboardRefreshButton.BackgroundColor3 = new Color3(0.2, 0.2, 0.2);
    this.leaderboardRefreshButton.BackgroundTransparency = 0.2;
    this.leaderboardRefreshButton.BorderSizePixel = 0;
    this.leaderboardRefreshButton.TextColor3 = new Color3(1, 1, 1);
    this.leaderboardRefreshButton.TextTransparency = 0.15;
    this.leaderboardRefreshButton.TextSize = 12;
    this.leaderboardRefreshButton.Font = Enum.Font.GothamBold;
    this.leaderboardRefreshButton.Text = "Refresh";
    this.leaderboardRefreshButton.AutoButtonColor = true;
    this.leaderboardRefreshButton.Parent = this.leaderboardFrame;

    const refreshCorner = new Instance("UICorner");
    refreshCorner.CornerRadius = new UDim(0, 6);
    refreshCorner.Parent = this.leaderboardRefreshButton;

    this.leaderboardRefreshButton.MouseButton1Click.Connect(() => {
      if (this.leaderboardUpdatedLabel) {
        this.leaderboardUpdatedLabel.Text = "Refreshing...";
      }
      this.remote.requestLeaderboardRefresh();
    });

    this.leaderboardUpdatedLabel = new Instance("TextLabel");
    this.leaderboardUpdatedLabel.Name = "Updated";
    this.leaderboardUpdatedLabel.Size = new UDim2(1, -16, 0, 16);
    this.leaderboardUpdatedLabel.Position = new UDim2(0, 8, 0, 26);
    this.leaderboardUpdatedLabel.BackgroundTransparency = 1;
    this.leaderboardUpdatedLabel.TextColor3 = new Color3(1, 1, 1);
    this.leaderboardUpdatedLabel.TextTransparency = 0.35;
    this.leaderboardUpdatedLabel.TextSize = 12;
    this.leaderboardUpdatedLabel.Font = Enum.Font.Gotham;
    this.leaderboardUpdatedLabel.TextXAlignment = Enum.TextXAlignment.Left;
    this.leaderboardUpdatedLabel.Text = "Updated --:--:--";
    this.leaderboardUpdatedLabel.Parent = this.leaderboardFrame;

    const divider = new Instance("Frame");
    divider.Name = "Divider";
    divider.Size = new UDim2(1, -16, 0, 1);
    divider.Position = new UDim2(0, 8, 0, 46);
    divider.BackgroundColor3 = new Color3(1, 1, 1);
    divider.BackgroundTransparency = 0.85;
    divider.BorderSizePixel = 0;
    divider.Parent = this.leaderboardFrame;

    this.leaderboardList = new Instance("Frame");
    this.leaderboardList.Name = "List";
    this.leaderboardList.Size = new UDim2(1, -16, 1, -56);
    this.leaderboardList.Position = new UDim2(0, 8, 0, 52);
    this.leaderboardList.BackgroundTransparency = 1;
    this.leaderboardList.Parent = this.leaderboardFrame;

    const lbLayout = new Instance("UIListLayout");
    lbLayout.SortOrder = Enum.SortOrder.LayoutOrder;
    lbLayout.Padding = new UDim(0, 4);
    lbLayout.Parent = this.leaderboardList;
  }

  private onCheckpointReached(event: CheckpointReachedEvent): void {
    if (!event.isNew) return;

    this.currentStage = event.stageNumber;
    if (this.stageLabel) {
      this.stageLabel.Text = `Stage ${this.currentStage}`;
    }

    // Reset stage timer
    this.stageStartTime = os.clock();

    // Show notification
    this.showNotification(`✓ Checkpoint ${event.checkpointId}`, new Color3(0.2, 0.8, 0.2), 2);
  }

  private onStageCompleted(event: StageCompletedEvent): void {
    this.coins += event.coinsEarned;
    if (this.coinsLabel) {
      this.coinsLabel.Text = `🪙 ${this.coins}`;
    }

    // Reset stage timer
    this.stageStartTime = os.clock();

    // Build notification message
    let message = `Stage ${event.stageNumber} Complete!`;
    message += `\n${string.format("%.2f", event.completionTime)}s`;
    if (event.isNewBest) {
      message += " ⭐ NEW BEST!";
    }
    message += `\n+${event.coinsEarned} coins`;

    this.showNotification(message, new Color3(0.2, 0.6, 1), 3);
  }

  private showNotification(text: string, color: Color3, duration: number): void {
    if (!this.notificationFrame) return;

    const notification = new Instance("TextLabel");
    notification.Size = new UDim2(1, 0, 0, 60);
    notification.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
    notification.BackgroundTransparency = 0.3;
    notification.TextColor3 = color;
    notification.TextSize = 18;
    notification.Font = Enum.Font.GothamBold;
    notification.Text = text;
    notification.TextWrapped = true;
    notification.Parent = this.notificationFrame;

    // Corner rounding
    const corner = new Instance("UICorner");
    corner.CornerRadius = new UDim(0, 8);
    corner.Parent = notification;

    // Fade out and destroy
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

  private timerLoop(): void {
    while (this.mainGui?.Parent) {
      const elapsed = os.clock() - this.stageStartTime;
      if (this.timerLabel) {
        this.timerLabel.Text = string.format("%.2fs", elapsed);
      }
      task.wait(0.05);
    }
  }

  private onDataSync(data: {
    coins: number;
    currentStage: number;
    currentCheckpoint: number;
  }): void {
    logger.debug(`Data sync received: coins=${data.coins}`);
    const coinDelta = data.coins - this.coins;
    this.coins = data.coins;
    this.currentStage = data.currentStage;
    this.updateCoinsDisplay();

    if (this.stageLabel) {
      this.stageLabel.Text = `Stage ${this.currentStage}`;
    }

    // Only show a coin notification when we actually gained coins.
    if (coinDelta > 0) {
      this.showNotification(`+${coinDelta} coins!`, new Color3(1, 0.8, 0), 1.5);
    }
  }

  private onLeaderboardUpdate(payload: LeaderboardUpdatePayload): void {
    if (!this.leaderboardList) return;

    if (this.leaderboardUpdatedLabel) {
      // payload.updatedAt is seconds since epoch (os.time()).
      const timeText = os.date("%H:%M:%S", payload.updatedAt);
      this.leaderboardUpdatedLabel.Text = `Updated ${timeText}`;
    }

    // Clear old rows (keep UIListLayout)
    for (const child of this.leaderboardList.GetChildren()) {
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
      empty.Parent = this.leaderboardList;
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

      if (e.userId === this.player.UserId) {
        row.BackgroundTransparency = 0.8;
        row.BackgroundColor3 = new Color3(0.2, 0.4, 1);
        row.Font = Enum.Font.GothamBold;
      }

      const timeText = e.bestTime !== undefined ? ` • ${string.format("%.2f", e.bestTime)}s` : "";
      const nameText = this.formatLeaderboardPlayerName(e.userId, e.playerName);
      row.Text = `#${e.rank} ${nameText} • ${e.completions} win${e.completions === 1 ? "" : "s"}${timeText}`;
      row.Parent = this.leaderboardList;
    }
  }

  private updateCoinsDisplay(): void {
    if (this.coinsLabel) {
      this.coinsLabel.Text = `🪙 ${this.coins}`;
    }
  }
}
