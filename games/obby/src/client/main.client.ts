/**
 * Obby Game Client Entry Point
 */

import { createLogger } from "@rbx/core";
import { RemoteController } from "./controllers/RemoteController";
import { UIController } from "./controllers/UIController";
import { InputController } from "./controllers/InputController";

const logger = createLogger("Client");

logger.info("Starting Obby client...");

// Initialize controllers
const remoteController = new RemoteController();
const uiController = new UIController(remoteController);
const inputController = new InputController(remoteController);

// Boot
remoteController.boot();
uiController.boot();
inputController.boot();

logger.info("Obby client booted.");
