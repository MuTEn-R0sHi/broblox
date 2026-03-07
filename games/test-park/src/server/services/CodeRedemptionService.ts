/**
 * Code Redemption Service — Test Park
 *
 * Registers promo codes and handles player redemption requests.
 */

import { createCodeRedemptionService } from "@broblox/codes";
import { createLogger } from "@broblox/core";

const logger = createLogger("CodeRedemptionService");

const handle = createCodeRedemptionService({
  codes: [
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
  ],
  datastoreName: "TestParkCodes",
  onRedeem: (playerId, code, rewards) => {
    logger.info(`Player ${playerId} redeemed ${code} — ${rewards.size()} reward(s)`);
  },
});

export const CodeRedemptionService = handle.Service;
export const getCodeStore = () => handle.getCodeStore();
