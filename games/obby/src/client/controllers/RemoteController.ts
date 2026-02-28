/**
 * Remote Controller
 * Handles client-server communication via Controller lifecycle.
 * Uses the type-safe @broblox/net registry.
 */

import { Controller, createLogger } from "@broblox/core";
import { createClientRegistry, ClientRemoteRegistry, isOk } from "@broblox/net";
import {
  ObbyRemotes,
  ObbyRemotesType,
  PlayerDataSyncPayload,
  LevelUpPayload,
  PrestigeUnlockedPayload,
  QuestCompletedPayload,
  AchievementCompletedPayload,
  DailyRewardClaimedPayload,
  EventActivePayload,
} from "shared/remotes";
import type {
  CheckpointReachedEvent,
  LeaderboardRefreshStatusPayload,
  LeaderboardUpdatePayload,
  StageCompletedEvent,
  FullPlayerDataPayload,
  CodeRedeemResultPayload,
} from "shared/types";
import type { DailyRewardDay } from "@broblox/rewards";
import type { HatchResult } from "@broblox/gacha";

const logger = createLogger("RemoteController");

// ============================================================================
// Callback types
// ============================================================================

type CheckpointCallback = (event: CheckpointReachedEvent) => void;
type StageCallback = (event: StageCompletedEvent) => void;
type LeaderboardCallback = (data: LeaderboardUpdatePayload) => void;
type LeaderboardRefreshStatusCallback = (data: LeaderboardRefreshStatusPayload) => void;
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

let registry: ClientRemoteRegistry<ObbyRemotesType>;

const checkpointCallbacks: CheckpointCallback[] = [];
const stageCallbacks: StageCallback[] = [];
const leaderboardCallbacks: LeaderboardCallback[] = [];
const leaderboardRefreshStatusCallbacks: LeaderboardRefreshStatusCallback[] = [];
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
  // Fire methods (Client → Server events)
  requestRespawnAtCheckpoint(checkpointId?: number): void;
  requestLeaderboardRefresh(): void;
  equipPet(instanceId: string): void;
  unequipPet(instanceId: string): void;
  equipCosmetic(cosmeticId: string, slot: string): void;
  unequipCosmetic(slot: string): void;
  claimBattlePassReward(rewardId: string): void;

  // Invoke methods (Client → Server functions, yields)
  getFullPlayerData(): FullPlayerDataPayload | undefined;
  claimDailyReward(): DailyRewardDay | undefined;
  redeemCode(code: string): CodeRedeemResultPayload | undefined;
  hatchEgg(eggId: string, count: number): HatchResult[];

  // Event subscriptions
  onCheckpoint(callback: CheckpointCallback): void;
  onStage(callback: StageCallback): void;
  onLeaderboard(callback: LeaderboardCallback): void;
  onLeaderboardRefreshStatus(callback: LeaderboardRefreshStatusCallback): void;
  onDataSync(callback: DataSyncCallback): void;
  onLevelUp(callback: LevelUpCallback): void;
  onPrestige(callback: PrestigeCallback): void;
  onQuestCompleted(callback: QuestCompletedCallback): void;
  onAchievementCompleted(callback: AchievementCompletedCallback): void;
  onDailyRewardClaimed(callback: DailyRewardClaimedCallback): void;
  onEventStarted(callback: EventStartedCallback): void;
  onEventEnded(callback: EventEndedCallback): void;
} = {
  onInit() {
    logger.info("RemoteController initializing...");

    registry = createClientRegistry(ObbyRemotes, "ObbyRemotes");
    registry.initialize();

    // ── Existing event listeners ────────────────────────────────────

    registry.onEvent("CheckpointReached", (event) => {
      logger.debug(`Checkpoint reached: ${event.checkpointId}`);
      for (const cb of checkpointCallbacks) {
        cb(event);
      }
    });

    registry.onEvent("StageCompleted", (event) => {
      logger.debug(`Stage completed: ${event.stageNumber}`);
      for (const cb of stageCallbacks) {
        cb(event);
      }
    });

    registry.onEvent("LeaderboardUpdate", (data) => {
      for (const cb of leaderboardCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("LeaderboardRefreshStatus", (data) => {
      for (const cb of leaderboardRefreshStatusCallbacks) {
        cb(data);
      }
    });

    registry.onEvent("PlayerDataSync", (data) => {
      logger.debug(`Data sync: coins=${data.coins}`);
      for (const cb of dataSyncCallbacks) {
        cb(data);
      }
    });

    // ── New event listeners ─────────────────────────────────────────

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

    logger.info("RemoteController initialized.");
  },

  onDestroy() {
    if (registry) {
      registry.destroy();
    }
  },

  // ── Fire methods (Client → Server events) ───────────────────────────

  requestRespawnAtCheckpoint(checkpointId?: number): void {
    registry.fire("RequestRespawn", { toCheckpoint: checkpointId });
  },

  requestLeaderboardRefresh(): void {
    registry.fire("RequestLeaderboard", undefined as unknown as void);
  },

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

  // ── Event subscriptions ─────────────────────────────────────────────

  onCheckpoint(callback: CheckpointCallback): void {
    checkpointCallbacks.push(callback);
  },

  onStage(callback: StageCallback): void {
    stageCallbacks.push(callback);
  },

  onLeaderboard(callback: LeaderboardCallback): void {
    leaderboardCallbacks.push(callback);
  },

  onLeaderboardRefreshStatus(callback: LeaderboardRefreshStatusCallback): void {
    leaderboardRefreshStatusCallbacks.push(callback);
  },

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
