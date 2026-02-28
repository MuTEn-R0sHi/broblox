/**
 * Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@broblox/core";
import { RemoteController } from "./controllers/RemoteController";
import { UiController } from "./controllers/UiController";
import { HandshakeController } from "./controllers/HandshakeController";
import { ActionController } from "./controllers/ActionController";
import { ChatModerationController } from "./controllers/ChatModerationController";
import { ScreenController } from "./controllers/ScreenController";
import { HudController } from "./controllers/HudController";

const logger = createLogger("Main");
const app = new Application();

logger.info("Starting client...");

// Register controllers in dependency order
app
  .register(RemoteController)
  .register(UiController)
  .register(HandshakeController)
  .register(ActionController)
  .register(ChatModerationController)
  .register(ScreenController)
  .register(HudController);

app.boot();
logger.info("Client booted.");
