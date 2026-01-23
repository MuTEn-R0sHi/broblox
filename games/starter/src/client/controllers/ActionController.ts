import { UserInputService } from "@rbxts/services";
import { Controller, createLogger } from "@rbx/core";
import { type Result, type DoActionPayload } from "@rbx/net";
import { RemoteController } from "./RemoteController";
import { UiController } from "./UiController";

const logger = createLogger("ActionController");

export const ActionController: Controller & {
  connection?: RBXScriptConnection;
} = {
  connection: undefined,
  onStart() {
    logger.info("ActionController listening for input (press E)");

    this.connection = UserInputService.InputBegan.Connect((input, gameProcessed) => {
      if (gameProcessed) return;
      if (input.KeyCode !== Enum.KeyCode.E) return;

      const payload: DoActionPayload = {
        actionId: "intent_ping",
        timestamp: os.clock() * 1000,
      };

      const result = RemoteController.Remotes.DoAction.InvokeServer(payload) as Result<{
        actionId: string;
        processedAt: number;
      }>;

      if (result.ok) {
        logger.info(`Action OK: ${result.value.actionId}`);
        UiController.showActionResult(
          `Action: ${result.value.actionId} @ ${math.floor(result.value.processedAt)}ms`,
          true
        );
      } else {
        logger.warn(`Action failed: ${result.code}`);
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
