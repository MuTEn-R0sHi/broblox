/**
 * Match lifecycle management.
 *
 * Handles match state transitions, player ready-up, and match events.
 * Server-authoritative - all state is on the server.
 *
 * Match lifecycle:
 *   forming → starting → active → ended
 *              ↓           ↓
 *           cancelled  cancelled
 *
 * @note Uses roblox-ts compatible patterns for Luau compilation.
 */

import { Result, ok, err, ErrorCode, PlayerId, MatchId } from "@rbx/shared-types";
import type { Match, MatchStatus, GameMode, Team } from "./types";

// ============================================================================
// Match State
// ============================================================================

/** Active matches by match ID */
const matches = new Map<string, Match>();

/** Player to match mapping (for quick lookup) */
const playerMatches = new Map<number, MatchId>();

/** Ready status per match (matchId -> Set of ready player IDs) */
const matchReadyPlayers = new Map<string, Set<number>>();

// ============================================================================
// Event Types
// ============================================================================

/** Event emitted when match status changes */
export interface MatchStatusChangedEvent {
  matchId: MatchId;
  previousStatus: MatchStatus;
  newStatus: MatchStatus;
  timestamp: number;
}

/** Event emitted when a player readies up */
export interface PlayerReadyEvent {
  matchId: MatchId;
  playerId: PlayerId;
  readyCount: number;
  totalPlayers: number;
  timestamp: number;
}

/** Event emitted when all players are ready */
export interface AllPlayersReadyEvent {
  matchId: MatchId;
  players: PlayerId[];
  timestamp: number;
}

/** Event emitted when match starts */
export interface MatchStartedEvent {
  matchId: MatchId;
  gameMode: GameMode;
  players: PlayerId[];
  teams?: Team[];
  timestamp: number;
}

/** Event emitted when match ends */
export interface MatchEndedEvent {
  matchId: MatchId;
  gameMode: GameMode;
  players: PlayerId[];
  duration: number;
  reason: "completed" | "cancelled" | "timeout" | "player_left";
  timestamp: number;
}

// ============================================================================
// Event Listeners
// ============================================================================

type EventListener<T> = (event: T) => void;

const statusChangedListeners: EventListener<MatchStatusChangedEvent>[] = [];
const playerReadyListeners: EventListener<PlayerReadyEvent>[] = [];
const allReadyListeners: EventListener<AllPlayersReadyEvent>[] = [];
const matchStartedListeners: EventListener<MatchStartedEvent>[] = [];
const matchEndedListeners: EventListener<MatchEndedEvent>[] = [];

// ============================================================================
// Helper Functions (roblox-ts compatible)
// ============================================================================

/**
 * Get array length in a roblox-ts compatible way.
 */
function arraySize<T extends defined>(arr: T[]): number {
  let count = 0;
  for (const _ of arr) {
    count++;
  }
  return count;
}

/**
 * Remove element at index from array (mutates array).
 */
function arrayRemoveAt<T extends defined>(arr: T[], index: number): void {
  const len = arraySize(arr);
  if (index < 0 || index >= len) return;
  if (index < len - 1) {
    arr[index] = arr[len - 1];
  }
  arr.pop();
}

/**
 * Get Set size (roblox-ts compatible).
 */
function setSize(s: Set<number>): number {
  let count = 0;
  for (const _ of s) {
    count++;
  }
  return count;
}

// ============================================================================
// Match Registration
// ============================================================================

/**
 * Register a newly formed match.
 * Called internally when tryFormMatch succeeds.
 */
export function registerMatch(match: Match): void {
  matches.set(match.matchId as string, match);
  matchReadyPlayers.set(match.matchId as string, new Set());

  // Map players to this match
  for (const playerId of match.players) {
    playerMatches.set(playerId as number, match.matchId);
  }
}

/**
 * Get a match by ID.
 */
export function getMatch(matchId: MatchId): Match | undefined {
  return matches.get(matchId as string);
}

/**
 * Get the match a player is in.
 */
export function getPlayerMatch(playerId: PlayerId): Match | undefined {
  const matchId = playerMatches.get(playerId as number);
  if (!matchId) return undefined;
  return matches.get(matchId as string);
}

/**
 * Check if a player is in any match.
 */
export function isInMatch(playerId: PlayerId): boolean {
  return playerMatches.has(playerId as number);
}

/**
 * Get all active matches.
 */
export function getActiveMatches(): Match[] {
  const result: Match[] = [];
  matches.forEach((match) => {
    if (match.status === "forming" || match.status === "starting" || match.status === "active") {
      result.push(match);
    }
  });
  return result;
}

// ============================================================================
// Ready-Up System
// ============================================================================

/**
 * Mark a player as ready in their current match.
 *
 * @param playerId - Player to mark as ready
 * @returns Result indicating success or failure
 */
export function playerReady(playerId: PlayerId): Result<{ allReady: boolean }> {
  const matchId = playerMatches.get(playerId as number);
  if (!matchId) {
    return err(ErrorCode.NotFound, {
      message: "Player is not in any match",
    });
  }

  const match = matches.get(matchId as string);
  if (!match) {
    return err(ErrorCode.NotFound, {
      message: "Match not found",
    });
  }

  if (match.status !== "forming") {
    return err(ErrorCode.InvalidState, {
      message: `Cannot ready up: match is ${match.status}`,
    });
  }

  const readySet = matchReadyPlayers.get(matchId as string)!;
  readySet.add(playerId as number);

  const readyCount = setSize(readySet);
  const totalPlayers = arraySize(match.players);

  // Emit player ready event
  const readyEvent: PlayerReadyEvent = {
    matchId,
    playerId,
    readyCount,
    totalPlayers,
    timestamp: os.clock(),
  };
  for (const listener of playerReadyListeners) {
    listener(readyEvent);
  }

  const allReady = readyCount >= totalPlayers;

  if (allReady) {
    // Emit all players ready event
    const allReadyEvent: AllPlayersReadyEvent = {
      matchId,
      players: match.players,
      timestamp: os.clock(),
    };
    for (const listener of allReadyListeners) {
      listener(allReadyEvent);
    }
  }

  return ok({ allReady });
}

/**
 * Check if a player is ready.
 */
export function isPlayerReady(playerId: PlayerId): boolean {
  const matchId = playerMatches.get(playerId as number);
  if (!matchId) return false;

  const readySet = matchReadyPlayers.get(matchId as string);
  if (!readySet) return false;

  return readySet.has(playerId as number);
}

/**
 * Get ready status for a match.
 */
export function getReadyStatus(matchId: MatchId): { ready: number; total: number } | undefined {
  const match = matches.get(matchId as string);
  if (!match) return undefined;

  const readySet = matchReadyPlayers.get(matchId as string);
  return {
    ready: readySet ? setSize(readySet) : 0,
    total: arraySize(match.players),
  };
}

// ============================================================================
// Match State Transitions
// ============================================================================

/**
 * Transition match to starting state.
 * Typically called after all players are ready.
 *
 * @param matchId - Match to start
 * @returns Result indicating success or failure
 */
export function transitionToStarting(matchId: MatchId): Result<Match> {
  const match = matches.get(matchId as string);
  if (!match) {
    return err(ErrorCode.NotFound, {
      message: "Match not found",
    });
  }

  if (match.status !== "forming") {
    return err(ErrorCode.InvalidState, {
      message: `Cannot start: match is ${match.status}`,
    });
  }

  const previousStatus = match.status;
  match.status = "starting";

  // Emit status changed event
  emitStatusChanged(matchId, previousStatus, "starting");

  return ok(match);
}

/**
 * Start the match (transition from starting to active).
 *
 * @param matchId - Match to activate
 * @returns Result indicating success or failure
 */
export function startMatch(matchId: MatchId): Result<Match> {
  const match = matches.get(matchId as string);
  if (!match) {
    return err(ErrorCode.NotFound, {
      message: "Match not found",
    });
  }

  if (match.status !== "starting") {
    return err(ErrorCode.InvalidState, {
      message: `Cannot activate: match is ${match.status}`,
    });
  }

  const previousStatus = match.status;
  match.status = "active";
  match.startedAt = os.clock();

  // Emit status changed event
  emitStatusChanged(matchId, previousStatus, "active");

  // Emit match started event
  const startEvent: MatchStartedEvent = {
    matchId,
    gameMode: match.gameMode,
    players: match.players,
    teams: match.teams,
    timestamp: os.clock(),
  };
  for (const listener of matchStartedListeners) {
    listener(startEvent);
  }

  return ok(match);
}

/**
 * End the match normally (game completed).
 *
 * @param matchId - Match to end
 * @returns Result indicating success or failure
 */
export function endMatch(matchId: MatchId): Result<Match> {
  const match = matches.get(matchId as string);
  if (!match) {
    return err(ErrorCode.NotFound, {
      message: "Match not found",
    });
  }

  if (match.status !== "active") {
    return err(ErrorCode.InvalidState, {
      message: `Cannot end: match is ${match.status}`,
    });
  }

  return finalizeMatch(match, "completed");
}

/**
 * Cancel a match (before it completes).
 *
 * @param matchId - Match to cancel
 * @param reason - Why the match was cancelled
 * @returns Result indicating success or failure
 */
export function cancelMatch(
  matchId: MatchId,
  reason: "timeout" | "player_left" = "cancelled" as "timeout"
): Result<Match> {
  const match = matches.get(matchId as string);
  if (!match) {
    return err(ErrorCode.NotFound, {
      message: "Match not found",
    });
  }

  if (match.status === "ended" || match.status === "cancelled") {
    return err(ErrorCode.InvalidState, {
      message: `Match already ${match.status}`,
    });
  }

  return finalizeMatch(match, reason);
}

/**
 * Remove a player from their current match.
 * If this leaves the match without enough players, it may be cancelled.
 *
 * @param playerId - Player to remove
 * @param minPlayers - Minimum players required (cancels if below)
 * @returns Result indicating what happened
 */
export function removePlayerFromMatch(
  playerId: PlayerId,
  minPlayers = 1
): Result<{ matchCancelled: boolean }> {
  const matchId = playerMatches.get(playerId as number);
  if (!matchId) {
    return err(ErrorCode.NotFound, {
      message: "Player is not in any match",
    });
  }

  const match = matches.get(matchId as string);
  if (!match) {
    return err(ErrorCode.NotFound, {
      message: "Match not found",
    });
  }

  // Remove player from match
  playerMatches.delete(playerId as number);
  const readySet = matchReadyPlayers.get(matchId as string);
  if (readySet) {
    readySet.delete(playerId as number);
  }

  // Remove from players array
  const playerIndex = match.players.indexOf(playerId);
  if (playerIndex >= 0) {
    arrayRemoveAt(match.players, playerIndex);
  }

  // Check if match should be cancelled
  const remainingPlayers = arraySize(match.players);
  if (remainingPlayers < minPlayers && match.status !== "ended" && match.status !== "cancelled") {
    cancelMatch(matchId, "player_left");
    return ok({ matchCancelled: true });
  }

  return ok({ matchCancelled: false });
}

// ============================================================================
// Internal Helpers
// ============================================================================

function finalizeMatch(
  match: Match,
  reason: "completed" | "cancelled" | "timeout" | "player_left"
): Result<Match> {
  const previousStatus = match.status;
  match.status = reason === "completed" ? "ended" : "cancelled";
  match.endedAt = os.clock();

  const duration = match.startedAt ? match.endedAt - match.startedAt : 0;

  // Emit status changed event
  emitStatusChanged(match.matchId, previousStatus, match.status);

  // Emit match ended event
  const endEvent: MatchEndedEvent = {
    matchId: match.matchId,
    gameMode: match.gameMode,
    players: match.players,
    duration,
    reason,
    timestamp: os.clock(),
  };
  for (const listener of matchEndedListeners) {
    listener(endEvent);
  }

  // Clean up player mappings
  for (const playerId of match.players) {
    playerMatches.delete(playerId as number);
  }
  matchReadyPlayers.delete(match.matchId as string);

  return ok(match);
}

function emitStatusChanged(
  matchId: MatchId,
  previousStatus: MatchStatus,
  newStatus: MatchStatus
): void {
  const event: MatchStatusChangedEvent = {
    matchId,
    previousStatus,
    newStatus,
    timestamp: os.clock(),
  };
  for (const listener of statusChangedListeners) {
    listener(event);
  }
}

// ============================================================================
// Event Subscriptions
// ============================================================================

/**
 * Register a listener for match status changes.
 */
export function onMatchStatusChanged(listener: EventListener<MatchStatusChangedEvent>): () => void {
  statusChangedListeners.push(listener);
  return () => {
    const index = statusChangedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(statusChangedListeners, index);
  };
}

/**
 * Register a listener for player ready events.
 */
export function onPlayerReady(listener: EventListener<PlayerReadyEvent>): () => void {
  playerReadyListeners.push(listener);
  return () => {
    const index = playerReadyListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(playerReadyListeners, index);
  };
}

/**
 * Register a listener for all players ready events.
 */
export function onAllPlayersReady(listener: EventListener<AllPlayersReadyEvent>): () => void {
  allReadyListeners.push(listener);
  return () => {
    const index = allReadyListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(allReadyListeners, index);
  };
}

/**
 * Register a listener for match started events.
 */
export function onMatchStarted(listener: EventListener<MatchStartedEvent>): () => void {
  matchStartedListeners.push(listener);
  return () => {
    const index = matchStartedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(matchStartedListeners, index);
  };
}

/**
 * Register a listener for match ended events.
 */
export function onMatchEnded(listener: EventListener<MatchEndedEvent>): () => void {
  matchEndedListeners.push(listener);
  return () => {
    const index = matchEndedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(matchEndedListeners, index);
  };
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Clear all match state. For testing only.
 */
export function resetMatches(): void {
  matches.clear();
  playerMatches.clear();
  matchReadyPlayers.forEach((set) => set.clear());
  matchReadyPlayers.clear();
}
