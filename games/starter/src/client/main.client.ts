/**
 * Game Client Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@rbx/core";
import { RemoteController } from "./controllers/RemoteController";
import { HandshakeController } from "./controllers/HandshakeController";

const logger = createLogger("Main");
const app = new Application();

logger.info("Starting client...");

app.register(RemoteController).register(HandshakeController);

app.boot();
logger.info("Client booted.");
