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
  BuyProductRequest,
  CheckGamePassRequest,
  GamePassOwnershipPayload,
  AttributeSyncPayload,
  TrainingCompletePayload,
  TrainingRequestPayload,
  StaminaSyncPayload,
  PlayerAttributes,
  WorldChangedPayload,
  EnterWorldRequestPayload,
  EquipGearRequest,
  UnequipGearRequest,
  BuyGearRequest,
  BuyGearResultPayload,
  EquipmentSyncPayload,
  HazardTogglePayload,
  HazardDamagePayload,
  ObstacleUpdatePayload,
  ObstacleTogglePayload,
} from "./types";
import type { DailyRewardDay } from "@broblox/rewards";
import type { HatchResult } from "@broblox/gacha";
import type {
  RemoteRewardEntry,
  LevelUpPayload,
  PrestigeUnlockedPayload,
  QuestCompletedPayload,
  AchievementCompletedPayload,
  DailyRewardClaimedPayload,
  EventActivePayload,
} from "@broblox/game-shared";

// Re-export shared types so existing consumers don't break
export type {
  RemoteRewardEntry,
  LevelUpPayload,
  PrestigeUnlockedPayload,
  QuestCompletedPayload,
  AchievementCompletedPayload,
  DailyRewardClaimedPayload,
  EventActivePayload,
} from "@broblox/game-shared";

// ============================================================================
// Payload types for data sync (game-specific)
// ============================================================================

export interface PlayerDataSyncPayload {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
  attributes?: PlayerAttributes;
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
  // Attribute / Training / Stamina
  // ========================================================================

  /**
   * Server → Client: Full attribute sync (base + effective stats).
   */
  AttributeSync: defineClientEvent<AttributeSyncPayload>("AttributeSync", {
    description: "Server syncs player attribute data to client",
  }),

  /**
   * Server → Client: Training rep completed.
   */
  TrainingComplete: defineClientEvent<TrainingCompletePayload>("TrainingComplete", {
    description: "Server notifies client that a training rep completed",
  }),

  /**
   * Client → Server: Start training at a station.
   */
  RequestTraining: defineServerEvent<TrainingRequestPayload>("RequestTraining", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests to train at a station",
    validate: (v): v is TrainingRequestPayload => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      const t = p["stationType"];
      return t === "speed" || t === "jump" || t === "stamina";
    },
  }),

  /**
   * Server → Client: Stamina state sync (current, max, exhausted).
   */
  StaminaSync: defineClientEvent<StaminaSyncPayload>("StaminaSync", {
    description: "Server syncs stamina state to client",
  }),

  // ========================================================================
  // World System
  // ========================================================================

  /**
   * Client → Server: Request to enter a world via portal.
   */
  RequestEnterWorld: defineServerEvent<EnterWorldRequestPayload>("RequestEnterWorld", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests to enter a world",
    validate: (v): v is EnterWorldRequestPayload => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["worldId"]) === "string";
    },
  }),

  /**
   * Client → Server: Request to exit current world (return to hub).
   */
  RequestExitWorld: defineServerEvent<void>("RequestExitWorld", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests to exit current world",
  }),

  /**
   * Server → Client: Player's active world changed.
   */
  WorldChanged: defineClientEvent<WorldChangedPayload>("WorldChanged", {
    description: "Server notifies client that the player's active world changed",
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

  // ────────────────────────────────────────────────────────────────────
  // Marketplace
  // ────────────────────────────────────────────────────────────────────

  /**
   * Client → Server: Request to buy a developer product.
   */
  BuyProduct: defineServerEvent<BuyProductRequest>("BuyProduct", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests to buy a developer product",
    validate: (v): v is BuyProductRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["productId"]) === "number";
    },
  }),

  /**
   * Client → Server: Check if the player owns a game pass.
   */
  CheckGamePass: defineServerFunction<CheckGamePassRequest, GamePassOwnershipPayload>(
    "CheckGamePass",
    {
      rateLimit: { windowMs: 2000, maxRequests: 5 },
      description: "Check game pass ownership",
      validate: (v): v is CheckGamePassRequest => {
        if (typeOf(v) !== "table") return false;
        const p = v as Record<string, unknown>;
        return typeOf(p["passId"]) === "number";
      },
    }
  ),

  // ────────────────────────────────────────────────────────────────────
  // Equipment / Gear
  // ────────────────────────────────────────────────────────────────────

  /**
   * Client → Server: Equip a gear item.
   */
  EquipGear: defineServerEvent<EquipGearRequest>("EquipGear", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to equip a gear item",
    validate: (v): v is EquipGearRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["gearId"]) === "string";
    },
  }),

  /**
   * Client → Server: Unequip a gear slot.
   */
  UnequipGear: defineServerEvent<UnequipGearRequest>("UnequipGear", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to unequip a gear slot",
    validate: (v): v is UnequipGearRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["slot"]) === "string";
    },
  }),

  /**
   * Client → Server: Purchase a gear item from the shop.
   */
  BuyGear: defineServerFunction<BuyGearRequest, BuyGearResultPayload>("BuyGear", {
    rateLimit: { windowMs: 1000, maxRequests: 2 },
    description: "Client purchases gear from the shop",
    validate: (v): v is BuyGearRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["gearId"]) === "string";
    },
  }),

  /**
   * Server → Client: Equipment state sync (owned gear + equipped slots).
   */
  EquipmentSync: defineClientEvent<EquipmentSyncPayload>("EquipmentSync", {
    description: "Server syncs equipment state to client",
  }),

  // ── Hazard Remotes ───────────────────────────────────────────────────

  /**
   * Server → Client: A hazard instance toggled state (fire jet on/off, platform broke/respawned).
   */
  HazardToggle: defineClientEvent<HazardTogglePayload>("HazardToggle", {
    description: "Server notifies hazard instance state change",
  }),

  /**
   * Server → Client: Player took hazard damage (for UI feedback / screen shake).
   */
  HazardDamage: defineClientEvent<HazardDamagePayload>("HazardDamage", {
    description: "Server notifies player of hazard damage",
  }),

  // ── Obstacle Remotes ─────────────────────────────────────────────────

  /**
   * Server → Client: An obstacle instance's state updated (position, rotation, etc.).
   */
  ObstacleUpdate: defineClientEvent<ObstacleUpdatePayload>("ObstacleUpdate", {
    description: "Server broadcasts obstacle state update",
  }),

  /**
   * Server → Client: An obstacle instance toggled state (blink platform on/off).
   */
  ObstacleToggle: defineClientEvent<ObstacleTogglePayload>("ObstacleToggle", {
    description: "Server notifies obstacle instance state change",
  }),
} as const;

/** Type of the obby remotes registry */
export type ObbyRemotesType = typeof ObbyRemotes;
