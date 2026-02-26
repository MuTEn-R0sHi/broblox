/**
 * Code Redemption Service — Obby Game
 *
 * Registers promo codes and handles player redemption requests.
 * Uses the @broblox/codes package.
 */

import { createCodeRedemptionService } from "@broblox/codes";
import { createLogger } from "@broblox/core";

const logger = createLogger("CodeRedemptionService");

const handle = createCodeRedemptionService({
  codes: [
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
  ],
  datastoreName: "ObbyCodes",
  onRedeem: (playerId, code, rewards) => {
    logger.info(`Player ${playerId} redeemed ${code} — ${rewards.size()} reward(s)`);
  },
});

export const CodeRedemptionService = handle.Service;
export const getCodeStore = () => handle.getCodeStore();
