import { UserInputService } from "@rbxts/services";
import { type Result, type HandshakePayload, PROTOCOL_VERSION } from "@rbx/net";
import { Controller, createLogger } from "@rbx/core";
import { RemoteController } from "./RemoteController";
import { createStatusUI } from "./UiController";

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
    const payload: HandshakePayload = {
      protocolVersion: PROTOCOL_VERSION,
      buildId: "starter-0.0.0",
      deviceClass: detectDeviceClass(),
    };

    logger.info("Performing handshake...");
    const result = RemoteController.Remotes.Handshake.InvokeServer(payload) as Result<{
      serverVersion: number;
      serverTime: number;
    }>;

    let connected = false;

    if (result.ok) {
      const data = result.value;
      logger.info(
        `Handshake success! Server v${data.serverVersion}, Time: ${data.serverTime}, Latency: ${os.time() - data.serverTime}s`
      );
      connected = true;
    } else {
      logger.error(`Handshake failed: ${result.code}`);
    }

    createStatusUI(connected);
  },
};
