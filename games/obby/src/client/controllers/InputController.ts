/**
 * Input Controller
 * Handles player input for reset/respawn.
 */

import { UserInputService } from "@rbxts/services";
import { Controller, createLogger } from "@rbx/core";
import { RemoteController } from "./RemoteController";

const logger = createLogger("InputController");

export const InputController: Controller = {
  onStart() {
    logger.info("InputController starting...");

    // Reset keybind (R key)
    UserInputService.InputBegan.Connect((input, gameProcessed) => {
      if (gameProcessed) return;

      if (input.KeyCode === Enum.KeyCode.R) {
        logger.debug("Reset requested");
        RemoteController.requestRespawnAtCheckpoint();
      }
    });

    logger.info("InputController started.");
  },
};
