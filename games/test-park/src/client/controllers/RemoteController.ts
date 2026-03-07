/**
 * Remote Controller — Test Park
 *
 * Connects to server remotes using the type-safe registry.
 * Provides typed fire/invoke helpers and event subscription methods
 * for ScreenController, HudController, and other controllers.
 */

import { Controller, createLogger } from "@broblox/core";
import { createClientRegistry, ClientRemoteRegistry, isOk } from "@broblox/net";
import {
  GameRemotes,
  GameRemotesType,
  PlayerDataSyncPayload,
  LevelUpPayload,
  PrestigeUnlockedPayload,
  QuestCompletedPayload,
  AchievementCompletedPayload,
  DailyRewardClaimedPayload,
  EventActivePayload,
} from "shared/remotes";
import type {
  FullPlayerDataPayload,
  CodeRedeemResultPayload,
  GamePassOwnershipPayload,
} from "shared/types";
import type { DailyRewardDay } from "@broblox/rewards";
import type { HatchResult } from "@broblox/gacha";

const logger = createLogger("RemoteController");

// ============================================================================
// Callback types
// ============================================================================

type DataSyncCallback = (data: PlayerDataSyncPayload) => void;
type LevelUpCallback = (data: LevelUpPayload) => void;
type PrestigeCallback = (data: PrestigeUnlockedPayload) => void;
type QuestCompletedCallback = (data: QuestCompletedPayload) => void;
type AchievementCompletedCallback = (data: AchievementCompletedPayload) => void;
type DailyRewardClaimedCallback = (data: DailyRewardClaimedPayload) => void;
type EventStartedCallback = (data: EventActivePayload) => void;
type EventEndedCallback = (data: EventActivePayload) => void;

// ============================================================================
// Module state
// ============================================================================

let registry: ClientRemoteRegistry<GameRemotesType>;

const dataSyncCallbacks: DataSyncCallback[] = [];
const levelUpCallbacks: LevelUpCallback[] = [];
const prestigeCallbacks: PrestigeCallback[] = [];
const questCompletedCallbacks: QuestCompletedCallback[] = [];
const achievementCompletedCallbacks: AchievementCompletedCallback[] = [];
const dailyRewardClaimedCallbacks: DailyRewardClaimedCallback[] = [];
const eventStartedCallbacks: EventStartedCallback[] = [];
const eventEndedCallbacks: EventEndedCallback[] = [];

// ============================================================================
// Controller
// ============================================================================

export const RemoteController: Controller & {
  /** Access the remote registry for invocations */
  getRegistry(): ClientRemoteRegistry<GameRemotesType>;

  // Fire methods (Client → Server events)
  equipPet(instanceId: string): void;
  unequipPet(instanceId: string): void;
  equipCosmetic(cosmeticId: string, slot: string): void;
  unequipCosmetic(slot: string): void;
  claimBattlePassReward(rewardId: string): void;
  buyProduct(productId: number): void;

  // Invoke methods (Client → Server functions, yields)
  getFullPlayerData(): FullPlayerDataPayload | undefined;
  claimDailyReward(): DailyRewardDay | undefined;
  redeemCode(code: string): CodeRedeemResultPayload | undefined;
  hatchEgg(eggId: string, count: number): HatchResult[];
  checkGamePass(passId: number): boolean;

  // Event subscriptions
  onDataSync(callback: DataSyncCallback): void;
  onLevelUp(callback: LevelUpCallback): void;
  onPrestige(callback: PrestigeCallback): void;
  onQuestCompleted(callback: QuestCompletedCallback): void;
  onAchievementCompleted(callback: AchievementCompletedCallback): void;
  onDailyRewardClaimed(callback: DailyRewardClaimedCallback): void;
  onEventStarted(callback: EventStartedCallback): void;
  onEventEnded(callback: EventEndedCallback): void;
} = {
  getRegistry() {
    if (!registry) {
      error("RemoteController not initialized");
    }
    return registry;
  },

  onInit() {
    logger.debug("Connecting to remotes...");
    registry = createClientRegistry(GameRemotes);
    registry.initialize();

    // ── Event listeners ─────────────────────────────────────────────

    registry.onEvent("PlayerDataSync", (data) => {
      logger.debug(`Data sync: coins=${data.coins}`);
      for (const cb of dataSyncCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("LevelUp", (data) => {
      logger.info(`Level up: ${data.newLevel}`);
      for (const cb of levelUpCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("PrestigeUnlocked", (data) => {
      logger.info(`Prestige unlocked: ${data.newPrestige}`);
      for (const cb of prestigeCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("QuestCompleted", (data) => {
      logger.info(`Quest completed: ${data.questId}`);
      for (const cb of questCompletedCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("AchievementCompleted", (data) => {
      logger.info(`Achievement completed: ${data.achievementId}`);
      for (const cb of achievementCompletedCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("DailyRewardClaimed", (data) => {
      logger.info(`Daily reward claimed: day ${data.day}, streak ${data.streak}`);
      for (const cb of dailyRewardClaimedCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("EventStarted", (data) => {
      logger.info(`Event started: ${data.id} — ${data.label}`);
      for (const cb of eventStartedCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("EventEnded", (data) => {
      logger.info(`Event ended: ${data.id}`);
      for (const cb of eventEndedCallbacks) {
        cb(data);
      }
    });

    logger.debug("Remotes connected");
  },

  onDestroy() {
    if (registry) {
      registry.destroy();
    }
  },

  // ── Fire methods (Client → Server events) ───────────────────────────

  equipPet(instanceId: string): void {
    registry.fire("EquipPet", { instanceId });
  },

  unequipPet(instanceId: string): void {
    registry.fire("UnequipPet", { instanceId });
  },

  equipCosmetic(cosmeticId: string, slot: string): void {
    registry.fire("EquipCosmetic", { cosmeticId, slot });
  },

  unequipCosmetic(slot: string): void {
    registry.fire("UnequipCosmetic", { slot });
  },

  claimBattlePassReward(rewardId: string): void {
    registry.fire("ClaimBattlePassReward", { rewardId });
  },

  buyProduct(productId: number): void {
    registry.fire("BuyProduct", { productId });
  },

  // ── Invoke methods (Client → Server functions, yields) ──────────────

  getFullPlayerData(): FullPlayerDataPayload | undefined {
    const result = registry.invoke("GetFullPlayerData", undefined as unknown as void);
    if (isOk(result)) {
      return result.value;
    }
    logger.warn(
      `GetFullPlayerData failed: code=${result.code} message=${result.message ?? "none"}`
    );
    return undefined;
  },

  claimDailyReward(): DailyRewardDay | undefined {
    const result = registry.invoke("ClaimDailyReward", undefined as unknown as void);
    if (isOk(result)) {
      return result.value;
    }
    logger.warn(`ClaimDailyReward failed: code=${result.code} message=${result.message ?? "none"}`);
    return undefined;
  },

  redeemCode(code: string): CodeRedeemResultPayload | undefined {
    const result = registry.invoke("RedeemCode", { code });
    if (isOk(result)) {
      return result.value;
    }
    logger.warn(`RedeemCode failed: code=${result.code} message=${result.message ?? "none"}`);
    return undefined;
  },

  hatchEgg(eggId: string, count: number): HatchResult[] {
    const result = registry.invoke("HatchEgg", { eggId, count });
    if (isOk(result)) {
      return result.value;
    }
    logger.warn(`HatchEgg failed: code=${result.code} message=${result.message ?? "none"}`);
    return [];
  },

  checkGamePass(passId: number): boolean {
    const result = registry.invoke("CheckGamePass", { passId });
    if (isOk(result)) {
      return (result.value as GamePassOwnershipPayload).owned;
    }
    logger.warn(`CheckGamePass failed: code=${result.code} message=${result.message ?? "none"}`);
    return false;
  },

  // ── Event subscriptions ─────────────────────────────────────────────

  onDataSync(callback: DataSyncCallback): void {
    dataSyncCallbacks.push(callback);
  },

  onLevelUp(callback: LevelUpCallback): void {
    levelUpCallbacks.push(callback);
  },

  onPrestige(callback: PrestigeCallback): void {
    prestigeCallbacks.push(callback);
  },

  onQuestCompleted(callback: QuestCompletedCallback): void {
    questCompletedCallbacks.push(callback);
  },

  onAchievementCompleted(callback: AchievementCompletedCallback): void {
    achievementCompletedCallbacks.push(callback);
  },

  onDailyRewardClaimed(callback: DailyRewardClaimedCallback): void {
    dailyRewardClaimedCallbacks.push(callback);
  },

  onEventStarted(callback: EventStartedCallback): void {
    eventStartedCallbacks.push(callback);
  },

  onEventEnded(callback: EventEndedCallback): void {
    eventEndedCallbacks.push(callback);
  },
};
