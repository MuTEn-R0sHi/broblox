/**
 * Action Controller
 *
 * Listens for user input and sends action intents to server.
 */

import { UserInputService } from "@rbxts/services";
import { Controller, createLogger } from "@broblox/core";
import { isOk, isErr } from "@broblox/net";
import { RemoteController } from "./RemoteController";
import { UiController } from "./UiController";
import { ActionRequest } from "shared/remotes";

const logger = createLogger("ActionController");

export const ActionController: Controller & {
  connection?: RBXScriptConnection;
} = {
  connection: undefined,

  onStart() {
    logger.info("ActionController listening for input (press E)");
    const registry = RemoteController.getRegistry();

    this.connection = UserInputService.InputBegan.Connect((input, gameProcessed) => {
      if (gameProcessed) return;
      if (input.KeyCode !== Enum.KeyCode.E) return;

      const request: ActionRequest = {
        actionId: "intent_ping",
        timestamp: os.clock() * 1000,
      };

      const result = registry.invoke("DoAction", request);

      if (isOk(result)) {
        logger.info(`Action OK: ${request.actionId}`);
        UiController.showActionResult(
          `Action: ${request.actionId} @ ${math.floor(result.value.serverTimestamp)}ms`,
          true
        );
      } else if (isErr(result)) {
        logger.warn(`Action failed: ${result.code} - ${result.message}`);
        UiController.showActionResult(`Action failed: ${result.code}`, false);
      }
    });
  },

  onDestroy() {
    if (this.connection) {
      this.connection.Disconnect();
      this.connection = undefined;
    }
  },
};
