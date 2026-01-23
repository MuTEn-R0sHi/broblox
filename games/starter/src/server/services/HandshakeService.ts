import { Service, createLogger } from "@rbx/core";
import {
  REMOTES,
  RateLimiter,
  validateHandshakePayload,
  ok,
  err,
  ErrorCode,
  PROTOCOL_VERSION,
} from "@rbx/net";
import { RemoteService } from "./RemoteService";
import { Players } from "@rbxts/services";

const logger = createLogger("HandshakeService");
const limiter = new RateLimiter(REMOTES.Handshake.rateLimit);

export const HandshakeService: Service = {
  onStart() {
    logger.info("Starting Handshake Listener");

    Players.PlayerRemoving.Connect((player) => limiter.reset(player.UserId));

    RemoteService.Remotes.Handshake.OnServerInvoke = (player: Player, payload: unknown) => {
      // Rate limit
      const rateResult = limiter.check(player.UserId);
      if (!rateResult.ok) {
        return rateResult;
      }

      // Validate
      const validated = validateHandshakePayload(payload);
      if (!validated.ok) {
        logger.warn(`Invalid handshake from ${player.Name}`);
        return validated;
      }

      const data = validated.value;
      logger.info(`Handshake from ${player.Name} (v${data.protocolVersion}, ${data.deviceClass})`);

      if (data.protocolVersion !== PROTOCOL_VERSION) {
        return err(ErrorCode.ProtocolMismatch);
      }

      return ok({
        serverVersion: PROTOCOL_VERSION,
        serverTime: os.time(),
      });
    };
  },
};
