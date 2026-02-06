/**
 * Code Redemption Service — Starter Game
 *
 * Registers promo codes and handles player redemption requests.
 * Uses the @rbx/codes package.
 */

import { Service, createLogger } from "@rbx/core";
import { CodeStore } from "@rbx/codes";

const logger = createLogger("CodeRedemptionService");

let codeStore: CodeStore | undefined;

export function getCodeStore(): CodeStore {
  if (!codeStore) {
    throw "CodeRedemptionService has not been initialized yet.";
  }
  return codeStore;
}

export const CodeRedemptionService: Service = {
  onInit() {
    codeStore = new CodeStore({
      datastoreName: "StarterCodes",
      enableLogging: true,
      onRedeem: (playerId, code, rewards) => {
        logger.info(`Player ${playerId} redeemed ${code} — ${rewards.size()} reward(s)`);
        // TODO: grant rewards to the player's inventory / currency
      },
    });

    // ----- Register your codes here -----
    codeStore.registerCodes([
      {
        code: "LAUNCH2025",
        description: "Launch day bonus — 500 coins",
        status: "ACTIVE",
        rewards: [{ type: "coins", label: "500 Coins", amount: 500 }],
        maxUses: 0,
        perPlayerLimit: 1,
        expiresAt: 0,
        createdAt: os.time(),
        useCount: 0,
      },
      {
        code: "WELCOME",
        description: "Welcome gift — 100 coins",
        status: "ACTIVE",
        rewards: [{ type: "coins", label: "100 Coins", amount: 100 }],
        maxUses: 0,
        perPlayerLimit: 1,
        expiresAt: 0,
        createdAt: os.time(),
        useCount: 0,
      },
    ]);

    logger.info("Code redemption service initialized");
  },
};
