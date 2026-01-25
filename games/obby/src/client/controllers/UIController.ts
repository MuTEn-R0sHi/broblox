/**
 * UI Controller
 * Manages game UI elements.
 */

import { Players } from "@rbxts/services";
import { createLogger } from "@rbx/core";
import { RemoteController } from "./RemoteController";
import { StageCompletedEvent, CheckpointReachedEvent } from "shared/types";

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

  // State
  private currentStage = 1;
  private coins = 0;
  private stageStartTime = os.clock();

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
    this.coins = data.coins;
    this.updateCoinsDisplay();

    // Show notification for coin collection
    this.showNotification(
      `+${data.coins - this.coins || data.coins} coins!`,
      new Color3(1, 0.8, 0),
      1.5
    );
  }

  private updateCoinsDisplay(): void {
    if (this.coinsLabel) {
      this.coinsLabel.Text = `🪙 ${this.coins}`;
    }
  }
}
