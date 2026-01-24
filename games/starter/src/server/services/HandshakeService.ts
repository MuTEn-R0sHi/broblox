/**
 * Handshake Service
 *
 * Handles client-server handshake for session establishment.
 */

import { Service, createLogger } from "@rbx/core";
import { ok, err, ErrorCode, PROTOCOL_VERSION } from "@rbx/net";
import { RemoteService } from "./RemoteService";
import { HandshakeRequest } from "shared/remotes";

const logger = createLogger("HandshakeService");

// Simple session ID generator
let sessionCounter = 0;
function generateSessionId(): string {
  sessionCounter += 1;
  return `session_${os.time()}_${sessionCounter}`;
}

export const HandshakeService: Service = {
  onStart() {
    logger.info("Starting Handshake Listener");
    const registry = RemoteService.getRegistry();

    registry.onFunction("Handshake", (player, request: HandshakeRequest) => {
      logger.info(
        `Handshake from ${player.Name} (v${request.protocolVersion}, ${request.deviceClass})`
      );

      // Protocol version check
      if (request.protocolVersion !== PROTOCOL_VERSION) {
        return err(ErrorCode.ProtocolMismatch, {
          message: `Expected v${PROTOCOL_VERSION}, got v${request.protocolVersion}`,
        });
      }

      // Success - return session info
      return ok({
        serverProtocolVersion: PROTOCOL_VERSION,
        serverTime: os.time(),
        sessionId: generateSessionId(),
      });
    });
  },
};
