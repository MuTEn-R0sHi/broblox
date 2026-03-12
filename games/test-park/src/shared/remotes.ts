/**
 * Shared Remote Definitions (Test Park)
 *
 * Single source of truth for all remote endpoints in the test park.
 * Both server and client import from here.
 */

import {
  defineServerFunction,
  defineServerEvent,
  defineClientEvent,
  validateHandshakePayload,
  validateDoActionPayload,
} from "@broblox/net";
import type { HandshakeResponse } from "@broblox/shared-types";
import type {
  RedeemCodeRequest,
  HatchEggRequest,
  EquipPetRequest,
  UnequipPetRequest,
  EquipCosmeticRequest,
  UnequipCosmeticRequest,
  ClaimBattlePassRewardRequest,
  BuyProductRequest,
  CheckGamePassRequest,
  GamePassOwnershipPayload,
  FullPlayerDataPayload,
  CodeRedeemResultPayload,
  UseAbilityRequest,
  ReportHitRequest,
  HitResultPayload,
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
// Payload Types
// ============================================================================

/** Handshake request from client */
export interface HandshakeRequest {
  protocolVersion: number;
  buildId: string;
  deviceClass: "kbm" | "gamepad" | "touch";
}

export type { HandshakeResponse };

/** Action request from client */
export interface ActionRequest {
  actionId: string;
  timestamp: number;
  payload?: unknown;
}

/** Action response from server */
export interface ActionResponse {
  accepted: boolean;
  serverTimestamp: number;
}

// ── Test Park Payloads ──────────────────────────────────────────────────

/** Client → Server: request teleport to a zone */
export interface TestParkTeleportRequest {
  zoneId: string;
}

/** Server → Client: result of a test-park action */
export interface TestParkActionResultPayload {
  actionId: string;
  result: string;
  success: boolean;
}

/** Server notification to client */
export interface ServerNotification {
  type: string;
  message: string;
  data?: unknown;
}

export interface PlayerDataSyncPayload {
  coins: number;
  kills: number;
}

// ============================================================================
// Remote Registry
// ============================================================================

/**
 * All remotes for the test park.
 * Add new remotes here — they'll be automatically created and typed.
 */
export const GameRemotes = {
  Handshake: defineServerFunction<HandshakeRequest, HandshakeResponse>("Net_Handshake", {
    rateLimit: { windowMs: 60000, maxRequests: 3 },
    description: "Client-server handshake for session establishment",
    validate: (v): v is HandshakeRequest => validateHandshakePayload(v).ok,
  }),

  DoAction: defineServerFunction<ActionRequest, ActionResponse>("Intent_DoAction", {
    rateLimit: { windowMs: 1000, maxRequests: 10 },
    description: "Client action intent",
    validate: (v): v is ActionRequest => validateDoActionPayload(v).ok,
  }),

  Notification: defineClientEvent<ServerNotification>("Server_Notification", {
    description: "Server broadcasts notifications to clients",
  }),

  PlayerDataSync: defineClientEvent<PlayerDataSyncPayload>("PlayerDataSync", {
    description: "Server syncs player HUD data to client",
  }),

  LevelUp: defineClientEvent<LevelUpPayload>("LevelUp", {
    description: "Notifies client that the player leveled up",
  }),

  PrestigeUnlocked: defineClientEvent<PrestigeUnlockedPayload>("PrestigeUnlocked", {
    description: "Notifies client that the player achieved a new prestige rank",
  }),

  QuestCompleted: defineClientEvent<QuestCompletedPayload>("QuestCompleted", {
    description: "Notifies client that a quest was completed",
  }),

  AchievementCompleted: defineClientEvent<AchievementCompletedPayload>("AchievementCompleted", {
    description: "Notifies client that an achievement was unlocked",
  }),

  DailyRewardClaimed: defineClientEvent<DailyRewardClaimedPayload>("DailyRewardClaimed", {
    description: "Notifies client that a daily reward was claimed",
  }),

  EventStarted: defineClientEvent<EventActivePayload>("Server_EventStarted", {
    description: "Server broadcasts that a scheduled event has become active",
  }),

  EventEnded: defineClientEvent<EventActivePayload>("Server_EventEnded", {
    description: "Server broadcasts that a scheduled event has become inactive",
  }),

  // Server Functions (Client → Server, returns Result<T>)

  GetFullPlayerData: defineServerFunction<void, FullPlayerDataPayload>("GetFullPlayerData", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests full player data for UI population",
  }),

  ClaimDailyReward: defineServerFunction<void, DailyRewardDay | undefined>("ClaimDailyReward", {
    rateLimit: { windowMs: 2000, maxRequests: 1 },
    description: "Client claims the daily login reward",
  }),

  RedeemCode: defineServerFunction<RedeemCodeRequest, CodeRedeemResultPayload>("RedeemCode", {
    rateLimit: { windowMs: 3000, maxRequests: 1 },
    description: "Client redeems a promotional code",
    validate: (v): v is RedeemCodeRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["code"]) === "string";
    },
  }),

  HatchEgg: defineServerFunction<HatchEggRequest, HatchResult[]>("HatchEgg", {
    rateLimit: { windowMs: 1000, maxRequests: 3 },
    description: "Client hatches an egg",
    validate: (v): v is HatchEggRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["eggId"]) === "string" && typeOf(p["count"]) === "number";
    },
  }),

  // Server Events (Client → Server, fire-and-forget)

  EquipPet: defineServerEvent<EquipPetRequest>("EquipPet", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to equip a pet",
    validate: (v): v is EquipPetRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["instanceId"]) === "string";
    },
  }),

  UnequipPet: defineServerEvent<UnequipPetRequest>("UnequipPet", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to unequip a pet",
    validate: (v): v is UnequipPetRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["instanceId"]) === "string";
    },
  }),

  EquipCosmetic: defineServerEvent<EquipCosmeticRequest>("EquipCosmetic", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to equip a cosmetic",
    validate: (v): v is EquipCosmeticRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["cosmeticId"]) === "string" && typeOf(p["slot"]) === "string";
    },
  }),

  UnequipCosmetic: defineServerEvent<UnequipCosmeticRequest>("UnequipCosmetic", {
    rateLimit: { windowMs: 500, maxRequests: 3 },
    description: "Client requests to unequip a cosmetic",
    validate: (v): v is UnequipCosmeticRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["slot"]) === "string";
    },
  }),

  ClaimBattlePassReward: defineServerEvent<ClaimBattlePassRewardRequest>("ClaimBattlePassReward", {
    rateLimit: { windowMs: 1000, maxRequests: 3 },
    description: "Client claims a battle pass reward",
    validate: (v): v is ClaimBattlePassRewardRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["rewardId"]) === "string";
    },
  }),

  // Marketplace remotes

  BuyProduct: defineServerEvent<BuyProductRequest>("Marketplace_BuyProduct", {
    rateLimit: { windowMs: 2000, maxRequests: 2 },
    description: "Client requests to purchase a developer product",
    validate: (v): v is BuyProductRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["productId"]) === "number";
    },
  }),

  CheckGamePass: defineServerFunction<CheckGamePassRequest, GamePassOwnershipPayload>(
    "Marketplace_CheckGamePass",
    {
      rateLimit: { windowMs: 2000, maxRequests: 5 },
      description: "Client checks if they own a game pass",
      validate: (v): v is CheckGamePassRequest => {
        if (typeOf(v) !== "table") return false;
        const p = v as Record<string, unknown>;
        return typeOf(p["passId"]) === "number";
      },
    }
  ),

  // Combat remotes

  UseAbility: defineServerEvent<UseAbilityRequest>("Combat_UseAbility", {
    rateLimit: { windowMs: 200, maxRequests: 10 },
    description: "Client requests to use a combat ability",
    validate: (v): v is UseAbilityRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["abilityId"]) === "string";
    },
  }),

  ReportHit: defineServerFunction<ReportHitRequest, HitResultPayload>("Combat_ReportHit", {
    rateLimit: { windowMs: 200, maxRequests: 10 },
    description: "Client reports a hit for server-side validation",
    validate: (v): v is ReportHitRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return (
        typeOf(p["targetId"]) === "number" &&
        typeOf(p["abilityId"]) === "string" &&
        typeOf(p["originX"]) === "number" &&
        typeOf(p["originY"]) === "number" &&
        typeOf(p["originZ"]) === "number" &&
        typeOf(p["directionX"]) === "number" &&
        typeOf(p["directionY"]) === "number" &&
        typeOf(p["directionZ"]) === "number" &&
        typeOf(p["clientTimestamp"]) === "number"
      );
    },
  }),

  // ── Test Park ─────────────────────────────────────────────────────────

  /** Client requests teleport to a test park zone */
  TestPark_Teleport: defineServerEvent<TestParkTeleportRequest>("TestPark_Teleport", {
    rateLimit: { windowMs: 1000, maxRequests: 3 },
    description: "Staff teleports to a test park zone",
    validate: (v): v is TestParkTeleportRequest => {
      if (typeOf(v) !== "table") return false;
      const p = v as Record<string, unknown>;
      return typeOf(p["zoneId"]) === "string";
    },
  }),

  /** Server sends action result feedback to the triggering client */
  TestPark_ActionResult: defineClientEvent<TestParkActionResultPayload>("TestPark_ActionResult", {
    description: "Server sends test park action result to client",
  }),
} as const;

/** Type of the game remotes registry */
export type GameRemotesType = typeof GameRemotes;
