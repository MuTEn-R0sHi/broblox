import { Service, createLogger } from "@rbx/core";
import { REMOTES, RateLimiter, validateDoActionPayload, ok } from "@rbx/net";
import { RemoteService } from "./RemoteService";
import { Players } from "@rbxts/services";

const logger = createLogger("ActionService");
const limiter = new RateLimiter(REMOTES.DoAction.rateLimit);

export const ActionService: Service = {
  onStart() {
    logger.info("Starting Action Listener");

    Players.PlayerRemoving.Connect((player) => limiter.reset(player.UserId));

    RemoteService.Remotes.DoAction.OnServerInvoke = (player: Player, payload: unknown) => {
      // Rate limit
      const rateResult = limiter.check(player.UserId);
      if (!rateResult.ok) {
        return rateResult;
      }

      // Validate
      const validated = validateDoActionPayload(payload);
      if (!validated.ok) {
        return validated;
      }

      const action = validated.value;
      logger.info(`Action from ${player.Name}: ${action.actionId}`);

      return ok("Action received");
    };
  },
};
