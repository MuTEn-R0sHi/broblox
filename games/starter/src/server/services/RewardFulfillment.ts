/**
 * Reward Fulfillment — Starter Game
 *
 * Dispatches RewardEntry descriptors to the appropriate services
 * (coins, xp, items, cosmetics). Extracted as a shared module to avoid
 * circular dependencies between RewardsService and ProgressionService.
 */

import { createLogger } from "@broblox/core";
import type { RewardEntry } from "@broblox/rewards";
import { DataService } from "./DataService";
import { RemoteService } from "./RemoteService";
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
 *
 * When any currency reward is granted, a `PlayerDataSync` remote is fired
 * so the client HUD stays in sync.
 */
export function fulfillRewards(player: Player, rewards: ReadonlyArray<RewardEntry>): void {
  const playerId = player.UserId;
  let currencyGranted = false;

  for (const reward of rewards) {
    switch (reward.type) {
      case "currency": {
        DataService.addCoins(player, reward.amount);
        currencyGranted = true;
        logger.debug(`Granted ${reward.amount} coins to player ${playerId}`);
        break;
      }
      case "xp": {
        const progression = getProgression(playerId);
        if (progression !== undefined) {
          progression.addXp(reward.amount);
          logger.debug(`Granted ${reward.amount} XP to player ${playerId}`);
        } else {
          logger.warn(
            `Cannot grant ${reward.amount} XP to player ${playerId} — progression store not loaded`
          );
        }
        break;
      }
      case "item": {
        if (reward.itemId === undefined) {
          logger.warn(`Item reward for player ${playerId} has no itemId — skipping`);
        } else {
          const inventory = getInventory(playerId);
          if (inventory !== undefined) {
            inventory.addItem(reward.itemId, reward.amount);
            logger.debug(`Granted ${reward.amount}x ${reward.itemId} to player ${playerId}`);
          } else {
            logger.warn(
              `Cannot grant item "${reward.itemId}" to player ${playerId} — inventory not loaded`
            );
          }
        }
        break;
      }
      case "cosmetic": {
        if (reward.itemId === undefined) {
          logger.warn(`Cosmetic reward for player ${playerId} has no itemId — skipping`);
        } else {
          const cosmeticStore = getCosmeticStore(playerId);
          if (cosmeticStore !== undefined) {
            cosmeticStore.grant(reward.itemId);
            logger.debug(`Granted cosmetic ${reward.itemId} to player ${playerId}`);
          } else {
            logger.warn(
              `Cannot grant cosmetic "${reward.itemId}" to player ${playerId} — cosmetic store not loaded`
            );
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
      default: {
        logger.warn(
          `Unknown reward type "${(reward as RewardEntry).type}" for player ${playerId} — skipping`
        );
        break;
      }
    }
  }

  if (currencyGranted) {
    const updated = DataService.getData(player);
    if (updated) {
      RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
        coins: updated.coins,
        kills: updated.kills,
      });
    }
  }
}
