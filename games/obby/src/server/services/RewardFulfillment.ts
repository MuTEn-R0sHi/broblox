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
import { RemoteService } from "./RemoteService";
import { getProgression } from "./ProgressionService";
import { getInventory } from "./InventoryService";
import { getCosmeticStore } from "./CosmeticsService";
import { getGachaStore } from "./GachaService";
import { getPetStore } from "./PetService";

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
      case "boost": {
        // Boost rewards grant bonus XP (amount × 100)
        const boostProgression = getProgression(playerId);
        if (boostProgression !== undefined) {
          const boostXp = reward.amount * 100;
          boostProgression.addXp(boostXp);
          logger.debug(`Granted boost (${boostXp} XP) to player ${playerId}`);
        } else {
          logger.warn(`Cannot grant boost to player ${playerId} — progression store not loaded`);
        }
        break;
      }
      case "custom": {
        // Custom rewards — dispatch by label/itemId
        if (reward.label === "egg" && reward.itemId) {
          const amount = reward.amount ?? 1;
          if (amount <= 0) {
            logger.warn(
              `Custom egg reward for player ${playerId} has non-positive amount (${amount}) — skipping`
            );
            break;
          }
          // Grant free egg hatches (bypass currency check)
          const gachaStore = getGachaStore(playerId);
          if (gachaStore !== undefined) {
            const petStore = getPetStore(playerId);
            for (let i = 0; i < amount; i++) {
              const result = gachaStore.hatch(reward.itemId, math.huge);
              if (result.ok && result.itemId) {
                petStore?.addPet(result.itemId);
                logger.debug(
                  `Custom egg grant (${i + 1}/${amount}): player ${playerId} hatched ${result.itemId} from ${reward.itemId}`
                );
              } else {
                logger.warn(
                  `Custom egg hatch failed for player ${playerId} on attempt ${i + 1}/${amount}`
                );
                break;
              }
            }
          } else {
            logger.warn(`Cannot grant custom egg to player ${playerId} — gacha store not loaded`);
          }
        } else {
          logger.warn(
            `Unhandled custom reward for player ${playerId}: label=${reward.label ?? "none"}, itemId=${reward.itemId ?? "none"}`
          );
        }
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

  // Sync the client HUD when coins changed so the display updates immediately
  if (currencyGranted) {
    const updated = DataService.getData(player);
    if (updated) {
      const world = updated.worlds["grasslands"];
      RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
        coins: updated.coins,
        currentStage: world?.currentStage ?? 1,
        currentCheckpoint: world?.currentCheckpoint ?? 0,
      });
    }
  }
}
