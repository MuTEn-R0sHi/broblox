/**
 * Input Controller
 * Handles player input for reset/respawn.
 */

import { UserInputService, Players } from "@rbxts/services";
import { createLogger } from "@rbx/core";
import { RemoteController } from "./RemoteController";

const logger = createLogger("InputController");

export class InputController {
  private remote: RemoteController;
  private player = Players.LocalPlayer;

  constructor(remote: RemoteController) {
    this.remote = remote;
  }

  boot(): void {
    logger.info("InputController booting...");

    // Reset keybind (R key)
    UserInputService.InputBegan.Connect((input, gameProcessed) => {
      if (gameProcessed) return;

      if (input.KeyCode === Enum.KeyCode.R) {
        this.requestReset();
      }
    });

    logger.info("InputController booted.");
  }

  private requestReset(): void {
    logger.debug("Reset requested");
    this.remote.requestRespawnAtCheckpoint();
  }
}
