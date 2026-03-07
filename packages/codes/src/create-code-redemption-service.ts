/**
 * Factory for game-level CodeRedemptionService.
 *
 * Wraps a single shared CodeStore with per-game code definitions.
 */

import { Service, createLogger } from "@broblox/core";
import { RedeemableCode, CodeReward } from "./types";
import { CodeStore } from "./code-store";

export interface CodeRedemptionServiceConfig {
  /** Promo codes to register. */
  codes: RedeemableCode[];
  /** DataStore name, e.g. "TestParkCodes". */
  datastoreName: string;
  /** Callback fired on successful redemption. */
  onRedeem?: (playerId: number, code: string, rewards: CodeReward[]) => void;
}

export interface CodeRedemptionServiceHandle {
  Service: Service;
  getCodeStore(): CodeStore;
}

export function createCodeRedemptionService(
  config: CodeRedemptionServiceConfig
): CodeRedemptionServiceHandle {
  const logger = createLogger("CodeRedemptionService");

  const codeStore = new CodeStore({
    datastoreName: config.datastoreName,
    enableLogging: true,
    onRedeem: config.onRedeem ?? (() => {}),
  });

  return {
    Service: {
      name: "CodeRedemptionService",

      onInit() {
        codeStore.registerCodes(config.codes);
        logger.info(`Code definitions loaded: ${config.codes.size()} codes.`);
      },

      onStart() {
        logger.info("CodeRedemptionService started.");
      },
    },

    getCodeStore() {
      return codeStore;
    },
  };
}
