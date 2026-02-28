/**
 * Player Action Service — Starter Game
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
import { getBattlePassStore } from "./BattlePassService";
import { getDailyRewards, registerRewardFulfiller, REWARD_CYCLE } from "./RewardsService";
import { getCodeStore } from "./CodeRedemptionService";
import { fulfillRewards } from "./RewardFulfillment";

const logger = createLogger("PlayerActionService");

// ============================================================================
// Helpers
// ============================================================================

// REWARD_CYCLE is now imported from RewardsService to avoid duplication.

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

  const equippedCosmetics: Record<string, string> = {};
  if (cosmeticStore) {
    cosmeticStore.getAllEquipped().forEach((id, slot) => {
      equippedCosmetics[slot] = id;
    });
  }

  const rewardCycle = REWARD_CYCLE;

  return {
    coins: coreData.coins,
    kills: coreData.kills,

    level: progression?.getLevel() ?? 1,
    xp: progression?.getCurrentXp() ?? 0,
    xpForNext: progression?.getXpForNextLevel() ?? 100,
    prestige: progression?.getPrestige() ?? 0,

    items: inventory?.getAllItems() ?? [],
    maxSlots: inventory?.getMaxSlots() ?? 100,

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

// ============================================================================
// Service
// ============================================================================

export const PlayerActionService: Service = {
  onStart() {
    registerRewardFulfiller(fulfillRewards);

    const registry = RemoteService.getRegistry();

    // ── GetFullPlayerData
    registry.onFunction("GetFullPlayerData", (player) => {
      const data = buildFullPlayerData(player);
      if (!data) {
        return err(ErrorCode.NotFound, { message: "Player data not loaded yet" });
      }
      return ok(data);
    });

    // ── ClaimDailyReward
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

    // ── RedeemCode
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

    // ── HatchEgg
    registry.onFunction("HatchEgg", (player, request) => {
      const gachaStore = getGachaStore(player.UserId);
      if (!gachaStore) {
        return err(ErrorCode.NotFound, { message: "Gacha not loaded" });
      }
      const coreData = DataService.getData(player);
      if (!coreData) {
        return err(ErrorCode.NotFound, { message: "Player data not loaded" });
      }
      const eggDef = getEggRegistry().get(request.eggId);
      if (!eggDef) {
        return err(ErrorCode.NotFound, { message: "Egg not found" });
      }
      // Only coin-priced eggs are supported; other currencies need economy extension.
      if (eggDef.currency && eggDef.currency !== "coins") {
        return err(ErrorCode.InvalidPayload, {
          message: "Unsupported egg currency for this action",
        });
      }
      const results: HatchResult[] = [];
      const hatchCount = math.clamp(request.count, 1, 10);
      let availableCoins = coreData.coins;
      for (let i = 0; i < hatchCount; i++) {
        const result = gachaStore.hatch(request.eggId, availableCoins);
        results.push(result);
        if (result.ok) {
          availableCoins = math.max(0, availableCoins - eggDef.cost);
          if (result.itemId) {
            const petStore = getPetStore(player.UserId);
            petStore?.addPet(result.itemId);
          }
        } else {
          break;
        }
      }
      // Persist the coin spend via DataService and sync to client
      const spent = coreData.coins - availableCoins;
      if (spent > 0) {
        DataService.addCoins(player, -spent);
        RemoteService.getRegistry().fireClient("PlayerDataSync", player, {
          coins: availableCoins,
          kills: coreData.kills,
        });
      }
      return ok(results);
    });

    // ── EquipPet
    registry.onEvent("EquipPet", (player, request) => {
      const petStore = getPetStore(player.UserId);
      if (!petStore) return;
      const result = petStore.equipPet(request.instanceId);
      if (result.ok) {
        logger.debug(`Player ${player.UserId} equipped pet ${request.instanceId}`);
      }
    });

    // ── UnequipPet
    registry.onEvent("UnequipPet", (player, request) => {
      const petStore = getPetStore(player.UserId);
      if (!petStore) return;
      const result = petStore.unequipPet(request.instanceId);
      if (result.ok) {
        logger.debug(`Player ${player.UserId} unequipped pet ${request.instanceId}`);
      }
    });

    // ── EquipCosmetic
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

    // ── UnequipCosmetic
    registry.onEvent("UnequipCosmetic", (player, request) => {
      const cosmeticStore = getCosmeticStore(player.UserId);
      if (!cosmeticStore) return;
      const result = cosmeticStore.unequip(request.slot as EquipSlot);
      if (result.ok) {
        logger.debug(`Player ${player.UserId} unequipped cosmetic slot ${request.slot}`);
      }
    });

    // ── ClaimBattlePassReward
    registry.onEvent("ClaimBattlePassReward", (player, request) => {
      const bpStore = getBattlePassStore(player.UserId);
      if (!bpStore) return;
      const result = bpStore.claimReward(request.rewardId);
      if (result.ok && result.reward !== undefined) {
        fulfillRewards(player, [result.reward.reward]);
        logger.info(`Player ${player.UserId} claimed battle pass reward ${request.rewardId}`);
      }
    });

    logger.info("PlayerActionService started — all remote handlers registered.");
  },
};
