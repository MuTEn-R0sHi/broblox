/**
 * Code Redemption Service — Obby Game
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
      datastoreName: "ObbyCodes",
      enableLogging: true,
      onRedeem: (playerId, code, rewards) => {
        logger.info(`Player ${playerId} redeemed ${code} — ${rewards.size()} reward(s)`);
        // TODO: grant rewards to the player's inventory / currency
      },
    });

    // ----- Register your codes here -----
    codeStore.registerCodes([
      {
        code: "OBBY2025",
        description: "Obby launch bonus — 200 coins",
        status: "ACTIVE",
        rewards: [{ type: "coins", label: "200 Coins", amount: 200 }],
        maxUses: 0,
        perPlayerLimit: 1,
        expiresAt: 0,
        createdAt: os.time(),
        useCount: 0,
      },
      {
        code: "SPEEDRUN",
        description: "Speed boost trial — 5 min boost",
        status: "ACTIVE",
        rewards: [{ type: "boost", label: "Speed Boost (5 min)", amount: 300 }],
        maxUses: 5000,
        perPlayerLimit: 1,
        expiresAt: 0,
        createdAt: os.time(),
        useCount: 0,
      },
    ]);

    logger.info("Code redemption service initialized");
  },
};
