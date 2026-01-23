import { Service, createLogger } from "@rbx/core";
import { REMOTES, RateLimiter, validateDoActionPayload, ok, err, ErrorCode } from "@rbx/net";
import { isFlagEnabled } from "@rbx/config-featureflags";
import { RemoteService } from "./RemoteService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("ActionService");
const limiter = new RateLimiter(REMOTES.DoAction.rateLimit);

export const ActionService: Service = {
  onInit() {
    // Subscribe to player cleanup
    PlayerLifecycleService.onPlayerRemoving((player) => {
      limiter.reset(player.UserId);
    });
  },

  onStart() {
    logger.info("Starting Action Listener");

    RemoteService.Remotes.DoAction.OnServerInvoke = (player: Player, payload: unknown) => {
      // Rate limit
      const rateResult = limiter.check(player.UserId);
      if (!rateResult.ok) {
        return rateResult;
      }

      // Check kill-switch
      if (!isFlagEnabled("doAction.enabled")) {
        return err(ErrorCode.FeatureDisabled);
      }

      // Validate
      const validated = validateDoActionPayload(payload);
      if (!validated.ok) {
        return validated;
      }

      const action = validated.value;
      const nowMs = os.clock() * 1000;
      if (action.timestamp < 0 || action.timestamp > nowMs + 5000) {
        return err(ErrorCode.InvalidPayload);
      }
      logger.debug(`Action from ${player.Name}: ${action.actionId}`);

      return ok({
        actionId: action.actionId,
        processedAt: os.clock() * 1000,
      });
    };
  },
};
