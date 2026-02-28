/**
 * Reward Fulfillment — Obby Game
 *
 * Dispatches RewardEntry descriptors to the appropriate services
 * (coins, xp, items, cosmetics). Extracted as a shared module to avoid
 * circular dependencies between RewardsService and ProgressionService.
 */

import { createLogger } from "@broblox/core";
import type { RewardEntry } from "@broblox/rewards";
import { DataService } from "./DataService";
import { getProgression } from "./ProgressionService";
import { getInventory } from "./InventoryService";
import { getCosmeticStore } from "./CosmeticsService";

const logger = createLogger("RewardFulfillment");

/**
 * Grant an array of reward descriptors to a player.
 *
 * Rewards produced by the daily-login and battle-pass systems are
 * *descriptors* — they record what was earned but never mutate player state.
 * This function makes them real by calling into each domain service.
 */
export function fulfillRewards(player: Player, rewards: ReadonlyArray<RewardEntry>): void {
  const playerId = player.UserId;

  for (const reward of rewards) {
    switch (reward.type) {
      case "currency": {
        DataService.addCoins(player, reward.amount);
        logger.debug(`Granted ${reward.amount} coins to player ${playerId}`);
        break;
      }
      case "xp": {
        const progression = getProgression(playerId);
        if (progression !== undefined) {
          progression.addXp(reward.amount);
          logger.debug(`Granted ${reward.amount} XP to player ${playerId}`);
        }
        break;
      }
      case "item": {
        if (reward.itemId !== undefined) {
          const inventory = getInventory(playerId);
          if (inventory !== undefined) {
            inventory.addItem(reward.itemId, reward.amount);
            logger.debug(`Granted ${reward.amount}x ${reward.itemId} to player ${playerId}`);
          }
        }
        break;
      }
      case "cosmetic": {
        if (reward.itemId !== undefined) {
          const cosmeticStore = getCosmeticStore(playerId);
          if (cosmeticStore !== undefined) {
            cosmeticStore.grant(reward.itemId);
            logger.debug(`Granted cosmetic ${reward.itemId} to player ${playerId}`);
          }
        }
        break;
      }
      case "boost":
      case "custom": {
        logger.warn(
          `Unfulfilled reward type "${reward.type}" for player ${playerId} — not yet implemented`
        );
        break;
      }
    }
  }
}
