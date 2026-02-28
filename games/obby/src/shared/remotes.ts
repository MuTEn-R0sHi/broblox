/**
 * Shared Remote Definitions (Obby)
 *
 * Single source of truth for all remote endpoints in the obby game.
 * Both server and client import from here.
 */

import { defineServerEvent, defineClientEvent, defineServerFunction } from "@broblox/net";
import type {
  CheckpointReachedEvent,
  StageCompletedEvent,
  LeaderboardUpdatePayload,
  LeaderboardRefreshStatusPayload,
  RespawnRequestPayload,
  RedeemCodeRequest,
  HatchEggRequest,
  EquipPetRequest,
  UnequipPetRequest,
  EquipCosmeticRequest,
  UnequipCosmeticRequest,
  ClaimBattlePassRewardRequest,
  FullPlayerDataPayload,
  CodeRedeemResultPayload,
} from "./types";
import type { DailyRewardDay } from "@broblox/rewards";
import type { HatchResult } from "@broblox/gacha";

// ============================================================================
// Payload types for data sync (not in types.ts but used inline)
// ============================================================================

export interface PlayerDataSyncPayload {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
}

/** A single reward entry used across notification payloads. */
export interface RemoteRewardEntry {
  type: string;
  amount: number;
  itemId?: string;
  label?: string;
}

export interface LevelUpPayload {
  newLevel: number;
}

export interface PrestigeUnlockedPayload {
  newPrestige: number;
}

export interface QuestCompletedPayload {
  questId: string;
  rewards: RemoteRewardEntry[];
}

export interface AchievementCompletedPayload {
  achievementId: string;
  rewards: RemoteRewardEntry[];
}

export interface DailyRewardClaimedPayload {
  day: number;
  streak: number;
  rewards: RemoteRewardEntry[];
}

/** Payload for a scheduled in-game event becoming active or inactive */
export interface EventActivePayload {
  id: string;
  label: string;
  modifiers?: Record<string, unknown>;
}

// ============================================================================
// Remote Registry
// ============================================================================

/**
 * All remotes for the obby game.
 * Add new remotes here – they'll be automatically created and typed.
 */
export const ObbyRemotes = {
  /**
   * Server → Client: A checkpoint was reached.
   */
  CheckpointReached: defineClientEvent<CheckpointReachedEvent>("CheckpointReached", {
    description: "Notifies client that a checkpoint was reached",
  }),

  /**
   * Client → Server: Player requests a respawn.
   */
  RequestRespawn: defineServerEvent<RespawnRequestPayload>("RequestRespawn", {
    rateLimit: { windowMs: 1000, maxRequests: 2 },
    description: "Client requests respawn at a checkpoint",
    validate: (v): v is RespawnRequestPayload => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return p["toCheckpoint"] === undefined || typeOf(p["toCheckpoint"]) === "number";
    },
  }),

  /**
   * Client → Server: Player requests a leaderboard refresh.
   */
  RequestLeaderboard: defineServerEvent<void>("RequestLeaderboard", {
    rateLimit: { windowMs: 2000, maxRequests: 1 },
    description: "Client requests leaderboard snapshot",
  }),

  /**
   * Server → Client: Leaderboard refresh status (ok or rate-limited).
   */
  LeaderboardRefreshStatus: defineClientEvent<LeaderboardRefreshStatusPayload>(
    "LeaderboardRefreshStatus",
    {
      description: "Server tells client whether leaderboard refresh succeeded",
    }
  ),

  /**
   * Server → Client: A stage was completed.
   */
  StageCompleted: defineClientEvent<StageCompletedEvent>("StageCompleted", {
    description: "Notifies client that a stage was completed",
  }),

  /**
   * Server → Client: Sync player data (coins, stage, checkpoint).
   */
  PlayerDataSync: defineClientEvent<PlayerDataSyncPayload>("PlayerDataSync", {
    description: "Server syncs player HUD data to client",
  }),

  /**
   * Server → Client: Full leaderboard update.
   */
  LeaderboardUpdate: defineClientEvent<LeaderboardUpdatePayload>("LeaderboardUpdate", {
    description: "Server broadcasts leaderboard data to clients",
  }),

  /**
   * Server → Client: Player leveled up.
   */
  LevelUp: defineClientEvent<LevelUpPayload>("LevelUp", {
    description: "Notifies client that the player leveled up",
  }),

  /**
   * Server → Client: Player prestiged.
   */
  PrestigeUnlocked: defineClientEvent<PrestigeUnlockedPayload>("PrestigeUnlocked", {
    description: "Notifies client that the player achieved a new prestige rank",
  }),

  /**
   * Server → Client: Player completed a quest.
   */
  QuestCompleted: defineClientEvent<QuestCompletedPayload>("QuestCompleted", {
    description: "Notifies client that a quest was completed",
  }),

  /**
   * Server → Client: Player unlocked an achievement.
   */
  AchievementCompleted: defineClientEvent<AchievementCompletedPayload>("AchievementCompleted", {
    description: "Notifies client that an achievement was unlocked",
  }),

  /**
   * Server → Client: Player claimed a daily reward.
   */
  DailyRewardClaimed: defineClientEvent<DailyRewardClaimedPayload>("DailyRewardClaimed", {
    description: "Notifies client that a daily reward was claimed",
  }),

  /**
   * Server → All Clients: A scheduled in-game event has started.
   */
  EventStarted: defineClientEvent<EventActivePayload>("Obby_EventStarted", {
    description: "Server broadcasts that a scheduled event has become active",
  }),

  /**
   * Server → All Clients: A scheduled in-game event has ended.
   */
  EventEnded: defineClientEvent<EventActivePayload>("Obby_EventEnded", {
    description: "Server broadcasts that a scheduled event has become inactive",
  }),

  // ========================================================================
  // Server Functions (Client → Server, returns Result<T>)
  // ========================================================================

  /**
   * Client → Server: Request full player data snapshot for UI screens.
   */
  GetFullPlayerData: defineServerFunction<void, FullPlayerDataPayload>("GetFullPlayerData", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests full player data for UI population",
  }),

  /**
   * Client → Server: Claim daily login reward.
   */
  ClaimDailyReward: defineServerFunction<void, DailyRewardDay | undefined>("ClaimDailyReward", {
    rateLimit: { windowMs: 2000, maxRequests: 1 },
    description: "Client claims the daily login reward",
  }),

  /**
   * Client → Server: Redeem a promo code.
   */
  RedeemCode: defineServerFunction<RedeemCodeRequest, CodeRedeemResultPayload>("RedeemCode", {
    rateLimit: { windowMs: 3000, maxRequests: 1 },
    description: "Client redeems a promotional code",
    validate: (v): v is RedeemCodeRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["code"]) === "string";
    },
  }),

  /**
   * Client → Server: Hatch eggs from the gacha system.
   */
  HatchEgg: defineServerFunction<HatchEggRequest, HatchResult[]>("HatchEgg", {
    rateLimit: { windowMs: 1000, maxRequests: 3 },
    description: "Client hatches an egg",
    validate: (v): v is HatchEggRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["eggId"]) === "string" && typeOf(p["count"]) === "number";
    },
  }),

  // ========================================================================
  // Server Events (Client → Server, fire-and-forget)
  // ========================================================================

  /**
   * Client → Server: Equip a pet.
   */
  EquipPet: defineServerEvent<EquipPetRequest>("EquipPet", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to equip a pet",
    validate: (v): v is EquipPetRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["instanceId"]) === "string";
    },
  }),

  /**
   * Client → Server: Unequip a pet.
   */
  UnequipPet: defineServerEvent<UnequipPetRequest>("UnequipPet", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to unequip a pet",
    validate: (v): v is UnequipPetRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["instanceId"]) === "string";
    },
  }),

  /**
   * Client → Server: Equip a cosmetic.
   */
  EquipCosmetic: defineServerEvent<EquipCosmeticRequest>("EquipCosmetic", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to equip a cosmetic",
    validate: (v): v is EquipCosmeticRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["cosmeticId"]) === "string" && typeOf(p["slot"]) === "string";
    },
  }),

  /**
   * Client → Server: Unequip a cosmetic.
   */
  UnequipCosmetic: defineServerEvent<UnequipCosmeticRequest>("UnequipCosmetic", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to unequip a cosmetic",
    validate: (v): v is UnequipCosmeticRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["slot"]) === "string";
    },
  }),

  /**
   * Client → Server: Claim a battle pass tier reward.
   */
  ClaimBattlePassReward: defineServerEvent<ClaimBattlePassRewardRequest>("ClaimBattlePassReward", {
    rateLimit: { windowMs: 1000, maxRequests: 3 },
    description: "Client claims a battle pass reward",
    validate: (v): v is ClaimBattlePassRewardRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["rewardId"]) === "string";
    },
  }),
} as const;

/** Type of the obby remotes registry */
export type ObbyRemotesType = typeof ObbyRemotes;
