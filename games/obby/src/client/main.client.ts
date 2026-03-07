/**
 * Obby Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@broblox/core";
import { initInput, registerAction, addDefaultBinding, key, bind } from "@broblox/input";
import { RemoteController } from "./controllers/RemoteController";
import { UIController } from "./controllers/UIController";
import { InputController } from "./controllers/InputController";
import { ChatModerationController } from "./controllers/ChatModerationController";
import { ScreenController } from "./controllers/ScreenController";
import { HudController } from "./controllers/HudController";

const logger = createLogger("Client");
const app = new Application();

logger.info("Starting Obby client...");

// Initialise the unified input system (registers common actions, default bindings, device detection)
const cleanupInput = initInput();

// Register obby-specific actions
registerAction({
  name: "respawn",
  category: "gameplay",
  displayName: "Reset to Checkpoint",
});
addDefaultBinding(bind("respawn", key("R" as never)));

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
