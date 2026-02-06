/**
 * Obby Game Server Entry Point
 */

import { Application, createLogger } from "@rbx/core";
import { Lighting } from "@rbxts/services";
import { PlayerLifecycleService } from "./services/PlayerLifecycleService";
import { RemoteService } from "./services/RemoteService";
import { CheckpointService } from "./services/CheckpointService";
import { StageService } from "./services/StageService";
import { LeaderboardService } from "./services/LeaderboardService";
import { DataService } from "./services/DataService";
import { ModerationEnforcementService } from "./services/ModerationEnforcementService";
import { ChatModerationService } from "./services/ChatModerationService";

const logger = createLogger("Main");
const app = new Application();

// Set up sky/lighting for obby feel
Lighting.Ambient = new Color3(0.4, 0.4, 0.5);
Lighting.OutdoorAmbient = new Color3(0.5, 0.5, 0.6);

logger.info("Starting Obby server...");

// Register services in dependency order
app
  .register(PlayerLifecycleService)
  .register(RemoteService)
  .register(DataService)
  .register(StageService)
  .register(CheckpointService)
  .register(LeaderboardService)
  .register(ModerationEnforcementService)
  .register(ChatModerationService);

app.boot();
logger.info("Obby server booted.");

// Handle graceful shutdown
game.BindToClose(() => {
  logger.info("Server shutting down...");
  app.shutdown();
});
