/**
 * Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@broblox/core";
import { initInput } from "@broblox/input";
import { RemoteController } from "./controllers/RemoteController";
import { UIController } from "./controllers/UIController";
import { HandshakeController } from "./controllers/HandshakeController";
import { ActionController } from "./controllers/ActionController";
import { ChatModerationController } from "./controllers/ChatModerationController";
import { ScreenController } from "./controllers/ScreenController";
import { HudController } from "./controllers/HudController";
import { TestParkController } from "./controllers/TestParkController";

const logger = createLogger("Main");
const app = new Application();

logger.info("Starting client...");

// Initialise the unified input system (registers common actions, default bindings, device detection)
initInput();

// Register controllers in dependency order
app
  .register(RemoteController)
  .register(UIController)
  .register(HandshakeController)
  .register(ActionController)
  .register(ChatModerationController)
  .register(ScreenController)
  .register(HudController)
  .register(TestParkController);

app.boot();
logger.info("Client booted.");
