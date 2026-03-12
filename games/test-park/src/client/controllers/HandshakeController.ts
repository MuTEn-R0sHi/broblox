/**
 * Handshake Controller
 *
 * Performs initial handshake with server.
 */

import { PROTOCOL_VERSION, isOk, isErr } from "@broblox/net";
import { Controller, createLogger } from "@broblox/core";
import { detectDeviceClass } from "@broblox/input";
import { BUILD_ID } from "@broblox/constants";
import { RemoteController } from "./RemoteController";
import { UIController } from "./UIController";
import { HandshakeRequest } from "shared/remotes";

const logger = createLogger("HandshakeController");

export const HandshakeController: Controller = {
  onStart() {
    const registry = RemoteController.getRegistry();

    const request: HandshakeRequest = {
      protocolVersion: PROTOCOL_VERSION,
      buildId: BUILD_ID,
      deviceClass: detectDeviceClass(),
    };

    logger.info("Performing handshake...");
    const result = registry.invoke("Handshake", request);

    let connected = false;

    if (isOk(result)) {
      const data = result.value;
      logger.info(
        `Handshake success! Server v${data.serverProtocolVersion}, Time: ${data.serverTime}, Latency: ${os.time() - data.serverTime}s`
      );
      connected = true;
    } else if (isErr(result)) {
      logger.error(`Handshake failed: ${result.code} - ${result.message}`);
    }

    UIController.showStatus(connected);
  },
};
