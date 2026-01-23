/**
 * Game Server Entry Point
 * Uses Application pattern for cleaner startup.
 */

import { Application, createLogger } from "@rbx/core";
import { RemoteService } from "./services/RemoteService";
import { HandshakeService } from "./services/HandshakeService";
import { ActionService } from "./services/ActionService";

const logger = createLogger("Main");
const app = new Application();

logger.info("Starting server...");

app.register(RemoteService).register(HandshakeService).register(ActionService);

app.boot();
logger.info("Server booted.");
