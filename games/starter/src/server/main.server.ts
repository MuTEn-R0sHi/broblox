/**
 * Game Server Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@rbx/core";
import { PlayerLifecycleService } from "./services/PlayerLifecycleService";
import { FeatureFlagSyncService } from "./services/FeatureFlagSyncService";
import { MovementValidationService } from "./services/MovementValidationService";
import { ModerationEnforcementService } from "./services/ModerationEnforcementService";
import { ChatModerationService } from "./services/ChatModerationService";
import { RemoteService } from "./services/RemoteService";
import { HandshakeService } from "./services/HandshakeService";
import { ActionService } from "./services/ActionService";
import { CodeRedemptionService } from "./services/CodeRedemptionService";
import { LeaderboardService } from "./services/LeaderboardService";
import { AnalyticsService } from "./services/AnalyticsService";
import { NotificationService } from "./services/NotificationService";

const logger = createLogger("Main");
const app = new Application();

logger.info("Starting server...");

// Register services in dependency order
// PlayerLifecycleService must be first (others depend on it)
app
  .register(PlayerLifecycleService)
  .register(FeatureFlagSyncService)
  .register(MovementValidationService)
  .register(ModerationEnforcementService)
  .register(ChatModerationService)
  .register(RemoteService)
  .register(HandshakeService)
  .register(ActionService)
  .register(CodeRedemptionService)
  .register(LeaderboardService)
  .register(AnalyticsService)
  .register(NotificationService);

app.boot();
logger.info("Server booted.");

// Handle graceful shutdown
game.BindToClose(() => {
  logger.info("Server shutting down...");
  app.shutdown();
});
