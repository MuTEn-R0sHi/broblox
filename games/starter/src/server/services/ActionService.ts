/**
 * Action Service
 *
 * Handles action intents from clients.
 */

import { Service, createLogger } from "@broblox/core";
import { ok, err, ErrorCode } from "@broblox/net";
import { isFlagEnabled } from "@broblox/config-featureflags";
import { TIMESTAMP_TOLERANCE_MS } from "@broblox/constants";
import { RemoteService } from "./RemoteService";
import { ActionRequest } from "shared/remotes";
import { validateActionRequest } from "shared/action-validation";
import { getQuests } from "./QuestService";
import { getAchievements } from "./RewardsService";
import { getEventTracker } from "./AnalyticsService";

const logger = createLogger("ActionService");

export const ActionService: Service = {
  onStart() {
    logger.info("Starting Action Listener");
    const registry = RemoteService.getRegistry();

    registry.onFunction("DoAction", (player, request: ActionRequest) => {
      const nowMs = os.clock() * 1000;

      const validation = validateActionRequest(request, {
        nowMs,
        timestampToleranceMs: TIMESTAMP_TOLERANCE_MS,
        isActionEnabled: isFlagEnabled("doAction.enabled"),
      });

      if (!validation.ok) {
        if (validation.reason === "feature_disabled") {
          return err(ErrorCode.FeatureDisabled, { message: "Action system disabled" });
        }
        return err(ErrorCode.InvalidPayload, { message: "Invalid timestamp" });
      }

      logger.debug(`Action from ${player.Name}: ${request.actionId}`);

      // Route action to quest objectives and achievement progress trackers
      if (request.actionId === "kill") {
        getQuests(player.UserId)?.incrementObjective("kill", 1);
        getAchievements(player.UserId)?.incrementProgress("ach_first_kill", 1);
        getAchievements(player.UserId)?.incrementProgress("ach_kill_100", 1);
        getEventTracker().track("action.kill", player.UserId, {});
      }

      return ok({
        accepted: true,
        serverTimestamp: nowMs,
      });
    });
  },
};
