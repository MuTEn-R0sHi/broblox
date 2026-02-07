/**
 * Shared Remote Definitions (Obby)
 *
 * Single source of truth for all remote endpoints in the obby game.
 * Both server and client import from here.
 */

import { defineServerEvent, defineClientEvent } from "@rbx/net";
import type {
  CheckpointReachedEvent,
  StageCompletedEvent,
  LeaderboardUpdatePayload,
  LeaderboardRefreshStatusPayload,
  RespawnRequestPayload,
} from "./types";

// ============================================================================
// Payload types for data sync (not in types.ts but used inline)
// ============================================================================

export interface PlayerDataSyncPayload {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
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
} as const;

/** Type of the obby remotes registry */
export type ObbyRemotesType = typeof ObbyRemotes;
