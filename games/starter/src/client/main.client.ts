/**
 * Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@rbx/core";
import { RemoteController } from "./controllers/RemoteController";
import { UiController } from "./controllers/UiController";
import { HandshakeController } from "./controllers/HandshakeController";
import { ActionController } from "./controllers/ActionController";

const logger = createLogger("Main");
const app = new Application();

logger.info("Starting client...");

// Register controllers in dependency order
app
  .register(RemoteController)
  .register(UiController)
  .register(HandshakeController)
  .register(ActionController);

app.boot();
logger.info("Client booted.");
