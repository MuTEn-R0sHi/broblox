/**
 * Obby Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@rbx/core";
import { RemoteController } from "./controllers/RemoteController";
import { UIController } from "./controllers/UIController";
import { InputController } from "./controllers/InputController";

const logger = createLogger("Client");
const app = new Application();

logger.info("Starting Obby client...");

// Register controllers in dependency order
app.register(RemoteController).register(UIController).register(InputController);

app.boot();
logger.info("Obby client booted.");
