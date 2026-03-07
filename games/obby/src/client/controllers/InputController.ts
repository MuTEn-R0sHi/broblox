/**
 * Input Controller
 * Handles player input for reset/respawn using @broblox/input action system.
 */

import { Controller, createLogger } from "@broblox/core";
import { onAction } from "@broblox/input";
import { RemoteController } from "./RemoteController";

const logger = createLogger("InputController");

export const InputController: Controller & {
  unsubscribe?: () => void;
} = {
  unsubscribe: undefined,

  onStart() {
    logger.info("InputController starting...");

    // Respawn action (R key — registered in main.client.ts)
    this.unsubscribe = onAction("respawn", (state) => {
      if (!state.active) return;
      logger.debug("Reset requested");
      RemoteController.requestRespawnAtCheckpoint();
    });

    logger.info("InputController started.");
  },

  onDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  },
};
