/**
 * Handshake Controller
 *
 * Performs initial handshake with server.
 */

import { UserInputService } from "@rbxts/services";
import { PROTOCOL_VERSION, isOk, isErr } from "@rbx/net";
import { Controller, createLogger } from "@rbx/core";
import { BUILD_ID } from "@rbx/constants";
import { RemoteController } from "./RemoteController";
import { UiController } from "./UiController";
import { HandshakeRequest } from "shared/remotes";

const logger = createLogger("HandshakeController");

function detectDeviceClass(): "kbm" | "gamepad" | "touch" {
  if (UserInputService.TouchEnabled && !UserInputService.KeyboardEnabled) {
    return "touch";
  }
  if (UserInputService.GamepadEnabled) {
    return "gamepad";
  }
  return "kbm";
}

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

    UiController.showStatus(connected);
  },
};
