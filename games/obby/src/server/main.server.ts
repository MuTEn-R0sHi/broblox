/**
 * Obby Game Server Entry Point
 */

import { Application, createLogger } from "@rbx/core";
import { Lighting } from "@rbxts/services";
import { PlayerLifecycleService } from "./services/PlayerLifecycleService";
import { SecurityService } from "./services/SecurityService";
import { RemoteService } from "./services/RemoteService";
import { CheckpointService } from "./services/CheckpointService";
import { StageService } from "./services/StageService";
import { LeaderboardService } from "./services/LeaderboardService";
import { DataService } from "./services/DataService";
import { ModerationEnforcementService } from "./services/ModerationEnforcementService";
import { ChatModerationService } from "./services/ChatModerationService";
import { MovementValidationService } from "./services/MovementValidationService";
import { FeatureFlagSyncService } from "./services/FeatureFlagSyncService";
import { CodeRedemptionService } from "./services/CodeRedemptionService";
import { InventoryService } from "./services/InventoryService";
import { ProgressionService } from "./services/ProgressionService";
import { QuestService } from "./services/QuestService";
import { RewardsService } from "./services/RewardsService";
import { PetService } from "./services/PetService";
import { GachaService } from "./services/GachaService";
import { CosmeticsService } from "./services/CosmeticsService";
import { BattlePassService } from "./services/BattlePassService";
import { LocalizationService } from "./services/LocalizationService";
import { AudioService } from "./services/AudioService";
import { TutorialService } from "./services/TutorialService";
import { WorldService } from "./services/WorldService";
import { AnalyticsService } from "./services/AnalyticsService";
import { NotificationService } from "./services/NotificationService";
import { EventService } from "./services/EventService";

const logger = createLogger("Main");
const app = new Application();

// Set up sky/lighting for obby feel
Lighting.Ambient = new Color3(0.4, 0.4, 0.5);
Lighting.OutdoorAmbient = new Color3(0.5, 0.5, 0.6);

logger.info("Starting Obby server...");

// Register services in dependency order
app
  .register(PlayerLifecycleService)
  .register(SecurityService)
  .register(RemoteService)
  .register(DataService)
  .register(StageService)
  .register(CheckpointService)
  .register(LeaderboardService)
  .register(AnalyticsService)
  .register(NotificationService)
  .register(ModerationEnforcementService)
  .register(ChatModerationService)
  .register(MovementValidationService)
  .register(FeatureFlagSyncService)
  .register(CodeRedemptionService)
  .register(InventoryService)
  .register(ProgressionService)
  .register(QuestService)
  .register(RewardsService)
  .register(PetService)
  .register(GachaService)
  .register(CosmeticsService)
  .register(BattlePassService)
  .register(LocalizationService)
  .register(AudioService)
  .register(TutorialService)
  .register(WorldService)
  .register(EventService);

app.boot();
logger.info("Obby server booted.");

// Handle graceful shutdown
game.BindToClose(() => {
  logger.info("Server shutting down...");
  app.shutdown();
});
