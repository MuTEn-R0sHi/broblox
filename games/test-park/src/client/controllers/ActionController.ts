/**
 * Action Controller
 *
 * Listens for user input and sends action intents to server.
 */

import { Controller, createLogger } from "@broblox/core";
import { onAction } from "@broblox/input";
import { isOk, isErr } from "@broblox/net";
import { RemoteController } from "./RemoteController";
import { UIController } from "./UIController";
import { ActionRequest } from "shared/remotes";

const logger = createLogger("ActionController");

export const ActionController: Controller & {
  unsubscribe?: () => void;
} = {
  unsubscribe: undefined,

  onStart() {
    logger.info("ActionController listening for input (interact action)");
    const registry = RemoteController.getRegistry();

    this.unsubscribe = onAction("interact", (_action, state) => {
      if (!state.active) return;

      const request: ActionRequest = {
        actionId: "intent_ping",
        timestamp: os.clock() * 1000,
      };

      const result = registry.invoke("DoAction", request);

      if (isOk(result)) {
        logger.info(`Action OK: ${request.actionId}`);
        UIController.showActionResult(
          `Action: ${request.actionId} @ ${math.floor(result.value.serverTimestamp)}ms`,
          true
        );
      } else if (isErr(result)) {
        logger.warn(`Action failed: ${result.code} - ${result.message}`);
        UIController.showActionResult(`Action failed: ${result.code}`, false);
      }
    });
  },

  onDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  },
};
