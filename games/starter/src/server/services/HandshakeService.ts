/**
 * Handshake Service
 *
 * Handles client-server handshake for session establishment.
 * Implements protocol versioning per ADR-0002.
 */

import { Service, createLogger } from "@rbx/core";
import { ok, err, ErrorCode, validateProtocolVersion, getCurrentProtocolVersion } from "@rbx/net";
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

      // Protocol version check with N-1 compatibility
      const validation = validateProtocolVersion(request.protocolVersion);

      if (!validation.compatible) {
        logger.warn(`Protocol mismatch for ${player.Name}: ${validation.reason}`);
        return err(ErrorCode.ProtocolMismatch, {
          message: validation.reason,
          context: {
            minVersion: validation.minVersion,
            serverVersion: validation.serverVersion,
          },
        });
      }

      // Log if using legacy version (for deprecation tracking)
      if (request.protocolVersion < getCurrentProtocolVersion()) {
        logger.info(
          `${player.Name} using legacy protocol v${request.protocolVersion} (current: v${getCurrentProtocolVersion()})`
        );
      }

      // Success - return session info
      return ok({
        serverProtocolVersion: validation.serverVersion,
        serverTime: os.time(),
        sessionId: generateSessionId(),
      });
    });
  },
};
