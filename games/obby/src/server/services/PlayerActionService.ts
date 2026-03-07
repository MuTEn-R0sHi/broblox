/**
 * Player Action Service — Obby Game
 *
 * Handles all client-initiated actions via remotes:
 * - GetFullPlayerData (server function → returns full player snapshot)
 * - ClaimDailyReward (server function → claims and returns result)
 * - RedeemCode (server function → redeems a promo code)
 * - HatchEgg (server function → hatches eggs from gacha)
 * - EquipPet / UnequipPet (server events)
 * - EquipCosmetic / UnequipCosmetic (server events)
 * - ClaimBattlePassReward (server event)
 *
 * This service bridges the typed remote layer with the per-player stores
 * exposed by each package service.
 */

import { Service, createLogger } from "@broblox/core";
import { ok, err, ErrorCode } from "@broblox/net";
import { Players } from "@rbxts/services";
import type { FullPlayerDataPayload } from "shared/types";
import type { EquipSlot } from "@broblox/cosmetics";
import type { HatchResult } from "@broblox/gacha";

import { RemoteService } from "./RemoteService";
import { DataService } from "./DataService";
import { getProgression } from "./ProgressionService";
import { getInventory } from "./InventoryService";
import { getQuests } from "./QuestService";
import { getPetStore } from "./PetService";
import { getGachaStore, getEggRegistry } from "./GachaService";
import { getCosmeticStore } from "./CosmeticsService";
import { getBattlePassStore, getSeasonRegistry } from "./BattlePassService";
import { getDailyRewards, REWARD_CYCLE, registerRewardFulfiller } from "./RewardsService";
import { getCodeStore } from "./CodeRedemptionService";
import { fulfillRewards } from "./RewardFulfillment";
import {
  registerProduct,
  processReceipt,
  userOwnsGamePass,
  DEVELOPER_PRODUCTS,
} from "./MarketplaceService";
import { trackPurchase } from "./TelemetryService";

const logger = createLogger("PlayerActionService");

// ============================================================================
// Helpers
// ============================================================================

function buildFullPlayerData(player: Player): FullPlayerDataPayload | undefined {
  const playerId = player.UserId;
  const coreData = DataService.getData(player);
  if (!coreData) return undefined;

  const progression = getProgression(playerId);
  const inventory = getInventory(playerId);
  const quests = getQuests(playerId);
  const petStore = getPetStore(playerId);
  const cosmeticStore = getCosmeticStore(playerId);
  const bpStore = getBattlePassStore(playerId);
  const dailyStore = getDailyRewards(playerId);

  // Build equipped cosmetics as a plain Record
  const equippedCosmetics: Record<string, string> = {};
  if (cosmeticStore) {
    cosmeticStore.getAllEquipped().forEach((id, slot) => {
      equippedCosmetics[slot] = id;
    });
  }

  // Find active season (used for future season-gating)
  const seasonRegistry = getSeasonRegistry();
  const _allSeasons = seasonRegistry.getAll();

  // Always send the reward cycle so the UI can render the schedule
  const rewardCycle = REWARD_CYCLE;

  return {
    coins: coreData.coins,
    currentStage: coreData.currentStage,
    currentCheckpoint: coreData.currentCheckpoint,

    level: progression?.getLevel() ?? 1,
    xp: progression?.getCurrentXp() ?? 0,
    xpForNext: progression?.getXpForNextLevel() ?? 50,
    prestige: progression?.getPrestige() ?? 0,

    items: inventory?.getAllItems() ?? [],
    maxSlots: inventory?.getMaxSlots() ?? 50,

    activeQuests: quests?.getActiveQuests() ?? [],
    completedQuestIds: quests?.getCompletedQuestIds() ?? [],

    pets: petStore?.getAllPets() ?? [],

    ownedCosmetics: cosmeticStore?.getOwned() ?? [],
    equippedCosmetics,

    battlePass: bpStore
      ? {
          seasonId: bpStore.getSeasonId(),
          xp: bpStore.getXp(),
          tier: bpStore.getTier(),
          premiumUnlocked: bpStore.isPremium(),
          claimedRewards: bpStore.getClaimedRewards(),
        }
      : undefined,

    dailyCanClaim: dailyStore?.canClaim() ?? false,
    dailyCurrentDay: dailyStore?.getCycleDay() ?? 1,
    dailyStreak: dailyStore?.getStreak() ?? 0,
    dailyTimeUntilNext: dailyStore?.getTimeUntilNextClaim() ?? 0,
    dailyRewardCycle: rewardCycle,
  };
}

// REWARD_CYCLE is imported from RewardsService — single source of truth.

// ============================================================================
// Service
// ============================================================================

export const PlayerActionService: Service = {
  onStart() {
    // Register the fulfillment function so RewardsService can grant
    // achievement rewards without a circular static import.
    registerRewardFulfiller(fulfillRewards);

    const registry = RemoteService.getRegistry();

    // ── GetFullPlayerData ─────────────────────────────────────────────
    registry.onFunction("GetFullPlayerData", (player) => {
      const data = buildFullPlayerData(player);
      if (!data) {
        return err(ErrorCode.NotFound, { message: "Player data not loaded yet" });
      }
      return ok(data);
    });

    // ── ClaimDailyReward ──────────────────────────────────────────────
    registry.onFunction("ClaimDailyReward", (player) => {
      const dailyStore = getDailyRewards(player.UserId);
      if (!dailyStore) {
        return err(ErrorCode.NotFound, { message: "Rewards not loaded" });
      }

      if (!dailyStore.canClaim()) {
        return ok(undefined);
      }

      const reward = dailyStore.claim();

      if (reward !== undefined) {
        fulfillRewards(player, reward.rewards);
        logger.info(`Player ${player.UserId} claimed daily reward day ${reward.day}`);
      }

      return ok(reward);
    });

    // ── RedeemCode ────────────────────────────────────────────────────
    registry.onFunction("RedeemCode", (player, request) => {
      const codeStore = getCodeStore();
      const result = codeStore.redeemCode(player.UserId, request.code);

      if (result.success) {
        logger.info(`Player ${player.UserId} redeemed code "${request.code}"`);
        return ok({ success: true });
      }

      logger.debug(`Player ${player.UserId} failed to redeem "${request.code}": ${result.status}`);
      return ok({ success: false, message: result.status });
    });

    // ── HatchEgg ──────────────────────────────────────────────────────
    registry.onFunction("HatchEgg", (player, request) => {
      const gachaStore = getGachaStore(player.UserId);
      if (!gachaStore) {
        return err(ErrorCode.NotFound, { message: "Gacha not loaded" });
      }

      const coreData = DataService.getData(player);
      if (!coreData) {
        return err(ErrorCode.NotFound, { message: "Player data not loaded" });
      }

      // Validate egg currency — only coins are supported
      const eggDef = getEggRegistry().get(request.eggId);
      if (!eggDef) {
        return err(ErrorCode.NotFound, { message: "Unknown egg" });
      }
      if (eggDef.currency !== "coins") {
        logger.warn(
          `Player ${player.UserId} tried to hatch egg "${request.eggId}" with unsupported currency "${eggDef.currency}"`
        );
        return err(ErrorCode.InvalidPayload, { message: "Unsupported currency" });
      }

      const results: HatchResult[] = [];
      const hatchCount = math.clamp(request.count, 1, 10);

      for (let i = 0; i < hatchCount; i++) {
        const result = gachaStore.hatch(request.eggId, coreData.coins);
        results.push(result);

        if (result.ok) {
          // Deduct cost from player coins (addCoins mutates session data by reference)
          DataService.addCoins(player, -eggDef.cost);

          // If hatched a pet species, add to pet store
          if (result.itemId) {
            const petStore = getPetStore(player.UserId);
            petStore?.addPet(result.itemId);
          }
        } else {
          break; // Stop on first failure (insufficient funds, etc.)
        }
      }

      return ok(results);
    });

    // ── EquipPet ──────────────────────────────────────────────────────
    registry.onEvent("EquipPet", (player, request) => {
      const petStore = getPetStore(player.UserId);
      if (!petStore) return;
      const result = petStore.equipPet(request.instanceId);
      if (result.ok) {
        logger.debug(`Player ${player.UserId} equipped pet ${request.instanceId}`);
      }
    });

    // ── UnequipPet ────────────────────────────────────────────────────
    registry.onEvent("UnequipPet", (player, request) => {
      const petStore = getPetStore(player.UserId);
      if (!petStore) return;
      const result = petStore.unequipPet(request.instanceId);
      if (result.ok) {
        logger.debug(`Player ${player.UserId} unequipped pet ${request.instanceId}`);
      }
    });

    // ── EquipCosmetic ─────────────────────────────────────────────────
    registry.onEvent("EquipCosmetic", (player, request) => {
      const cosmeticStore = getCosmeticStore(player.UserId);
      if (!cosmeticStore) return;
      const result = cosmeticStore.equip(request.cosmeticId, request.slot as EquipSlot);
      if (result.ok) {
        logger.debug(
          `Player ${player.UserId} equipped cosmetic ${request.cosmeticId} in slot ${request.slot}`
        );
      }
    });

    // ── UnequipCosmetic ───────────────────────────────────────────────
    registry.onEvent("UnequipCosmetic", (player, request) => {
      const cosmeticStore = getCosmeticStore(player.UserId);
      if (!cosmeticStore) return;
      const result = cosmeticStore.unequip(request.slot as EquipSlot);
      if (result.ok) {
        logger.debug(`Player ${player.UserId} unequipped cosmetic slot ${request.slot}`);
      }
    });

    // ── ClaimBattlePassReward ─────────────────────────────────────────
    registry.onEvent("ClaimBattlePassReward", (player, request) => {
      const bpStore = getBattlePassStore(player.UserId);
      if (!bpStore) return;
      const result = bpStore.claimReward(request.rewardId);
      if (result.ok && result.reward !== undefined) {
        fulfillRewards(player, [result.reward.reward]);
        logger.info(`Player ${player.UserId} claimed battle pass reward ${request.rewardId}`);
      }
    });

    // ── Marketplace: Register product handlers ────────────────────────
    // 100 Coins product
    registerProduct(
      { productId: DEVELOPER_PRODUCTS[0].productId, name: DEVELOPER_PRODUCTS[0].name },
      (receipt) => {
        const player = Players.GetPlayerByUserId(receipt.PlayerId);
        if (player !== undefined) {
          DataService.addCoins(player, 100);
          trackPurchase(
            player,
            DEVELOPER_PRODUCTS[0].name,
            DEVELOPER_PRODUCTS[0].productId,
            DEVELOPER_PRODUCTS[0].robuxPrice
          );
          logger.info(`Player ${receipt.PlayerId} purchased 100 Coins`);
        }
        return "PurchaseGranted";
      }
    );

    // 500 Coins product
    registerProduct(
      { productId: DEVELOPER_PRODUCTS[1].productId, name: DEVELOPER_PRODUCTS[1].name },
      (receipt) => {
        const player = Players.GetPlayerByUserId(receipt.PlayerId);
        if (player !== undefined) {
          DataService.addCoins(player, 500);
          trackPurchase(
            player,
            DEVELOPER_PRODUCTS[1].name,
            DEVELOPER_PRODUCTS[1].productId,
            DEVELOPER_PRODUCTS[1].robuxPrice
          );
          logger.info(`Player ${receipt.PlayerId} purchased 500 Coins`);
        }
        return "PurchaseGranted";
      }
    );

    // Skip Stage product
    registerProduct(
      { productId: DEVELOPER_PRODUCTS[2].productId, name: DEVELOPER_PRODUCTS[2].name },
      (receipt) => {
        const player = Players.GetPlayerByUserId(receipt.PlayerId);
        if (player !== undefined) {
          // Skip stage logic — advance checkpoint by 1 stage
          const coreData = DataService.getData(player);
          if (coreData) {
            coreData.currentStage += 1;
            trackPurchase(
              player,
              DEVELOPER_PRODUCTS[2].name,
              DEVELOPER_PRODUCTS[2].productId,
              DEVELOPER_PRODUCTS[2].robuxPrice
            );
            logger.info(
              `Player ${receipt.PlayerId} purchased Skip Stage → now on stage ${coreData.currentStage}`
            );
          }
        }
        return "PurchaseGranted";
      }
    );

    // ── Marketplace: BuyProduct event (client fires to initiate prompt)
    registry.onEvent("BuyProduct", (player, request) => {
      // Signal from client — actual purchase handled by Roblox prompt flow.
      logger.debug(`Player ${player.UserId} requested to buy product ${request.productId}`);
    });

    // ── Marketplace: CheckGamePass function
    registry.onFunction("CheckGamePass", (player, request) => {
      const result = userOwnsGamePass(player.UserId, request.passId);
      return ok({
        passId: request.passId,
        owned: result.owned,
      });
    });

    logger.info("PlayerActionService started — all remote handlers registered.");
  },
};
