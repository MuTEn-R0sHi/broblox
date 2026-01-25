/**
 * Matchmaking type definitions.
 */

import { PlayerId, MatchId } from "@rbx/shared-types";

// ============================================================================
// Queue Types
// ============================================================================

/** Supported game modes */
export type GameMode = string;

/** Queue entry representing a player waiting for a match */
export interface QueueEntry {
  /** Player's user ID */
  playerId: PlayerId;
  /** Timestamp when player joined queue (os.clock()) */
  joinedAt: number;
  /** Player's MMR/skill rating (optional) */
  mmr?: number;
  /** Preferred game mode */
  gameMode: GameMode;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Queue status returned to players */
export interface QueueStatus {
  /** Whether player is currently in queue */
  inQueue: boolean;
  /** Current game mode (if in queue) */
  gameMode?: GameMode;
  /** Time spent in queue (seconds) */
  waitTime?: number;
  /** Estimated time to match (seconds, optional) */
  estimatedWait?: number;
  /** Current queue position (optional) */
  position?: number;
}

/** Configuration for a queue */
export interface QueueConfig {
  /** Game mode identifier */
  gameMode: GameMode;
  /** Minimum players required to form a match */
  minPlayers: number;
  /** Maximum players per match */
  maxPlayers: number;
  /** Queue timeout in seconds */
  timeoutSeconds: number;
  /** Whether to use MMR-based matching */
  useMMR?: boolean;
  /** Maximum MMR difference for matching (if useMMR) */
  maxMMRDelta?: number;
}

// ============================================================================
// Match Types
// ============================================================================

/** Match status */
export type MatchStatus = "forming" | "starting" | "active" | "ended" | "cancelled";

/** Team assignment */
export interface Team {
  /** Unique team identifier */
  teamId: string;
  /** Player IDs on this team */
  players: PlayerId[];
}

/** Match configuration */
export interface MatchConfig {
  /** Game mode for the match */
  gameMode: GameMode;
  /** Team size (players per team) */
  teamSize?: number;
  /** Number of teams */
  teamCount?: number;
  /** Match time limit in seconds (optional) */
  timeLimitSeconds?: number;
}

/** A formed match */
export interface Match {
  /** Unique match identifier */
  matchId: MatchId;
  /** Game mode */
  gameMode: GameMode;
  /** All player IDs in the match */
  players: PlayerId[];
  /** Team assignments (if team mode) */
  teams?: Team[];
  /** Match status */
  status: MatchStatus;
  /** When the match was created */
  createdAt: number;
  /** When the match started (if started) */
  startedAt?: number;
  /** When the match ended (if ended) */
  endedAt?: number;
  /** Reserved server access code (if allocated) */
  serverAccessCode?: string;
}

// ============================================================================
// Events
// ============================================================================

/** Event emitted when a player joins queue */
export interface QueueJoinEvent {
  playerId: PlayerId;
  gameMode: GameMode;
  mmr?: number;
  timestamp: number;
}

/** Event emitted when a player leaves queue */
export interface QueueLeaveEvent {
  playerId: PlayerId;
  gameMode: GameMode;
  reason: "left" | "timeout" | "matched";
  waitTime: number;
  timestamp: number;
}

/** Event emitted when a match is formed */
export interface MatchFormedEvent {
  matchId: MatchId;
  gameMode: GameMode;
  players: PlayerId[];
  avgWaitTime: number;
  timestamp: number;
}
