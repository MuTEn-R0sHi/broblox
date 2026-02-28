/**
 * Obby Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@broblox/core";
import { RemoteController } from "./controllers/RemoteController";
import { UIController } from "./controllers/UIController";
import { InputController } from "./controllers/InputController";
import { ChatModerationController } from "./controllers/ChatModerationController";
import { ScreenController } from "./controllers/ScreenController";
import { HudController } from "./controllers/HudController";

const logger = createLogger("Client");
const app = new Application();

logger.info("Starting Obby client...");

// Register controllers in dependency order
// RemoteController must come first (other controllers subscribe to its events)
// ScreenController depends on RemoteController
// HudController depends on ScreenController + RemoteController
app
  .register(RemoteController)
  .register(UIController)
  .register(InputController)
  .register(ChatModerationController)
  .register(ScreenController)
  .register(HudController);

app.boot();
logger.info("Obby client booted.");
