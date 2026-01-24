/**
 * Action Service
 *
 * Handles action intents from clients.
 */

import { Service, createLogger } from "@rbx/core";
import { ok, err, ErrorCode } from "@rbx/net";
import { isFlagEnabled } from "@rbx/config-featureflags";
import { TIMESTAMP_TOLERANCE_MS } from "@rbx/constants";
import { RemoteService } from "./RemoteService";
import { ActionRequest } from "shared/remotes";

const logger = createLogger("ActionService");

export const ActionService: Service = {
  onStart() {
    logger.info("Starting Action Listener");
    const registry = RemoteService.getRegistry();

    registry.onFunction("DoAction", (player, request: ActionRequest) => {
      // Check kill-switch
      if (!isFlagEnabled("doAction.enabled")) {
        return err(ErrorCode.FeatureDisabled, { message: "Action system disabled" });
      }

      // Timestamp validation
      const nowMs = os.clock() * 1000;
      if (request.timestamp < 0 || request.timestamp > nowMs + TIMESTAMP_TOLERANCE_MS) {
        return err(ErrorCode.InvalidPayload, { message: "Invalid timestamp" });
      }

      logger.debug(`Action from ${player.Name}: ${request.actionId}`);

      return ok({
        accepted: true,
        serverTimestamp: nowMs,
      });
    });
  },
};
