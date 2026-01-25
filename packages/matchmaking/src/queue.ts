/**
 * Queue management for matchmaking.
 *
 * Handles player queue operations: join, leave, timeout, status.
 * Server-authoritative - all state is on the server.
 *
 * @note Uses roblox-ts compatible patterns for Luau compilation.
 */

import { Result, ok, err, ErrorCode, PlayerId, createMatchId } from "@rbx/shared-types";
import type {
  QueueEntry,
  QueueStatus,
  QueueConfig,
  GameMode,
  Match,
  MatchConfig,
  QueueJoinEvent,
  QueueLeaveEvent,
  MatchFormedEvent,
} from "./types";
import { registerMatch } from "./match";

// ============================================================================
// Queue State
// ============================================================================

/** Queue entries by player ID */
const playerQueues = new Map<number, QueueEntry>();

/** Queue entries by game mode */
const gameModeQueues = new Map<GameMode, Set<number>>();

/** Registered queue configurations */
const queueConfigs = new Map<GameMode, QueueConfig>();

/** Event listeners */
type QueueEventListener<T> = (event: T) => void;
const joinListeners: QueueEventListener<QueueJoinEvent>[] = [];
const leaveListeners: QueueEventListener<QueueLeaveEvent>[] = [];
const matchListeners: QueueEventListener<MatchFormedEvent>[] = [];

// ============================================================================
// Helper Functions (roblox-ts compatible)
// ============================================================================

/**
 * Get array length in a roblox-ts compatible way.
 */
function arraySize<T extends defined>(arr: T[]): number {
  // In roblox-ts, use table.getn or #operator via the size method
  let count = 0;
  for (const _ of arr) {
    count++;
  }
  return count;
}

/**
 * Remove element at index from array (mutates array).
 * Uses unordered remove for O(1) performance.
 */
function arrayRemoveAt<T extends defined>(arr: T[], index: number): void {
  const len = arraySize(arr);
  if (index < 0 || index >= len) return;

  // Swap with last element and pop
  if (index < len - 1) {
    arr[index] = arr[len - 1];
  }
  arr.pop();
}

/**
 * Take first n elements from array.
 */
function arrayTake<T extends defined>(arr: T[], n: number): T[] {
  const result: T[] = [];
  let count = 0;
  for (const item of arr) {
    if (count >= n) break;
    result.push(item);
    count++;
  }
  return result;
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
// Configuration
// ============================================================================

/**
 * Register a queue configuration for a game mode.
 */
export function registerQueue(config: QueueConfig): void {
  queueConfigs.set(config.gameMode, config);
  if (!gameModeQueues.has(config.gameMode)) {
    gameModeQueues.set(config.gameMode, new Set());
  }
}

/**
 * Get configuration for a game mode.
 */
export function getQueueConfig(gameMode: GameMode): QueueConfig | undefined {
  return queueConfigs.get(gameMode);
}

/**
 * Get all registered game modes.
 */
export function getRegisteredGameModes(): GameMode[] {
  const modes: GameMode[] = [];
  queueConfigs.forEach((_, mode) => {
    modes.push(mode);
  });
  return modes;
}

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Add a player to a queue.
 *
 * @param playerId - Player's user ID
 * @param gameMode - Game mode to queue for
 * @param mmr - Optional MMR/skill rating
 * @returns Result indicating success or failure
 */
export function joinQueue(
  playerId: PlayerId,
  gameMode: GameMode,
  mmr?: number
): Result<QueueStatus> {
  // Check if game mode is registered
  const config = queueConfigs.get(gameMode);
  if (!config) {
    return err(ErrorCode.InvalidPayload, {
      message: `Unknown game mode: ${gameMode}`,
    });
  }

  // Check if player is already in a queue
  if (playerQueues.has(playerId as number)) {
    const existing = playerQueues.get(playerId as number)!;
    if (existing.gameMode === gameMode) {
      // Already in this queue - return current status
      return ok(getQueueStatusInternal(playerId));
    }
    return err(ErrorCode.InvalidState, {
      message: `Already in queue for ${existing.gameMode}. Leave first.`,
    });
  }

  // Create queue entry
  const entry: QueueEntry = {
    playerId,
    gameMode,
    joinedAt: os.clock(),
    mmr,
  };

  // Add to queues
  playerQueues.set(playerId as number, entry);
  gameModeQueues.get(gameMode)!.add(playerId as number);

  // Emit join event
  const event: QueueJoinEvent = {
    playerId,
    gameMode,
    mmr,
    timestamp: os.clock(),
  };
  for (const listener of joinListeners) {
    listener(event);
  }

  return ok(getQueueStatusInternal(playerId));
}

/**
 * Remove a player from their current queue.
 *
 * @param playerId - Player's user ID
 * @param reason - Why the player is leaving
 * @returns Result indicating success or failure
 */
export function leaveQueue(
  playerId: PlayerId,
  reason: "left" | "timeout" | "matched" = "left"
): Result<void> {
  const entry = playerQueues.get(playerId as number);
  if (!entry) {
    return err(ErrorCode.NotFound, {
      message: "Not in any queue",
    });
  }

  const waitTime = os.clock() - entry.joinedAt;

  // Remove from queues
  playerQueues.delete(playerId as number);
  gameModeQueues.get(entry.gameMode)?.delete(playerId as number);

  // Emit leave event
  const event: QueueLeaveEvent = {
    playerId,
    gameMode: entry.gameMode,
    reason,
    waitTime,
    timestamp: os.clock(),
  };
  for (const listener of leaveListeners) {
    listener(event);
  }

  return ok(undefined);
}

/**
 * Get a player's current queue status.
 *
 * @param playerId - Player's user ID
 * @returns Queue status
 */
export function getQueueStatus(playerId: PlayerId): QueueStatus {
  return getQueueStatusInternal(playerId);
}

function getQueueStatusInternal(playerId: PlayerId): QueueStatus {
  const entry = playerQueues.get(playerId as number);
  if (!entry) {
    return { inQueue: false };
  }

  const modeQueue = gameModeQueues.get(entry.gameMode);
  const position = modeQueue ? [...modeQueue].indexOf(playerId as number) + 1 : undefined;

  return {
    inQueue: true,
    gameMode: entry.gameMode,
    waitTime: os.clock() - entry.joinedAt,
    position,
  };
}

/**
 * Check if a player is in any queue.
 */
export function isInQueue(playerId: PlayerId): boolean {
  return playerQueues.has(playerId as number);
}

/**
 * Get queue entry for a player (internal use).
 */
export function getQueueEntry(playerId: PlayerId): QueueEntry | undefined {
  return playerQueues.get(playerId as number);
}

// ============================================================================
// Queue Queries
// ============================================================================

/**
 * Get the number of players in a queue.
 */
export function getQueueSize(gameMode: GameMode): number {
  const queue = gameModeQueues.get(gameMode);
  if (!queue) return 0;
  return setSize(queue);
}

/**
 * Get all entries in a queue (sorted by join time).
 */
export function getQueueEntries(gameMode: GameMode): QueueEntry[] {
  const playerIds = gameModeQueues.get(gameMode);
  if (!playerIds) return [];

  const entries: QueueEntry[] = [];
  for (const id of playerIds) {
    const entry = playerQueues.get(id);
    if (entry) entries.push(entry);
  }

  // Sort by join time (oldest first) - roblox-ts requires boolean return
  return entries.sort((a, b) => a.joinedAt < b.joinedAt);
}

// ============================================================================
// Timeout Processing
// ============================================================================

/**
 * Process queue timeouts. Call this periodically (e.g., every second).
 *
 * @returns Number of players removed due to timeout
 */
export function processTimeouts(): number {
  const now = os.clock();
  let removed = 0;

  for (const [playerId, entry] of playerQueues) {
    const config = queueConfigs.get(entry.gameMode);
    if (!config) continue;

    const waitTime = now - entry.joinedAt;
    if (waitTime >= config.timeoutSeconds) {
      leaveQueue(playerId as PlayerId, "timeout");
      removed++;
    }
  }

  return removed;
}

// ============================================================================
// Match Formation
// ============================================================================

/**
 * Try to form a match from queued players.
 *
 * @param gameMode - Game mode to form match for
 * @param config - Optional match configuration
 * @returns Formed match or undefined if not enough players
 */
export function tryFormMatch(gameMode: GameMode, config?: MatchConfig): Match | undefined {
  const queueConfig = queueConfigs.get(gameMode);
  if (!queueConfig) return undefined;

  const entries = getQueueEntries(gameMode);
  const entryCount = arraySize(entries);
  if (entryCount < queueConfig.minPlayers) {
    return undefined;
  }

  // Take up to maxPlayers from the queue (FIFO)
  const matchPlayers = arrayTake(entries, queueConfig.maxPlayers);
  const playerIds: PlayerId[] = [];
  for (const e of matchPlayers) {
    playerIds.push(e.playerId);
  }

  // Calculate average wait time
  const now = os.clock();
  let totalWaitTime = 0;
  for (const e of matchPlayers) {
    totalWaitTime += now - e.joinedAt;
  }
  const matchPlayerCount = arraySize(matchPlayers);
  const avgWaitTime = matchPlayerCount > 0 ? totalWaitTime / matchPlayerCount : 0;

  // Generate match ID
  const matchId = createMatchId(`match_${os.time()}_${math.random(1000, 9999)}`);

  // Create match
  const match: Match = {
    matchId,
    gameMode,
    players: playerIds,
    status: "forming",
    createdAt: now,
  };

  // Add team assignments if configured
  if (config?.teamSize && config?.teamCount) {
    match.teams = assignTeams(playerIds, config.teamSize, config.teamCount);
  }

  // Remove players from queue
  for (const playerId of playerIds) {
    leaveQueue(playerId, "matched");
  }

  // Emit match formed event
  const event: MatchFormedEvent = {
    matchId,
    gameMode,
    players: playerIds,
    avgWaitTime,
    timestamp: now,
  };
  for (const listener of matchListeners) {
    listener(event);
  }

  // Register match for lifecycle management
  registerMatch(match);

  return match;
}

/**
 * Assign players to teams.
 */
function assignTeams(
  players: PlayerId[],
  teamSize: number,
  teamCount: number
): { teamId: string; players: PlayerId[] }[] {
  const teams: { teamId: string; players: PlayerId[] }[] = [];

  for (let i = 0; i < teamCount; i++) {
    teams.push({
      teamId: `team_${i + 1}`,
      players: [],
    });
  }

  // Round-robin assignment
  const playerCount = arraySize(players);
  for (let i = 0; i < playerCount; i++) {
    const teamIndex = i % teamCount;
    const teamPlayerCount = arraySize(teams[teamIndex].players);
    if (teamPlayerCount < teamSize) {
      teams[teamIndex].players.push(players[i]);
    }
  }

  return teams;
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Register a listener for queue join events.
 */
export function onQueueJoin(listener: QueueEventListener<QueueJoinEvent>): () => void {
  joinListeners.push(listener);
  return () => {
    const index = joinListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(joinListeners, index);
  };
}

/**
 * Register a listener for queue leave events.
 */
export function onQueueLeave(listener: QueueEventListener<QueueLeaveEvent>): () => void {
  leaveListeners.push(listener);
  return () => {
    const index = leaveListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(leaveListeners, index);
  };
}

/**
 * Register a listener for match formed events.
 */
export function onMatchFormed(listener: QueueEventListener<MatchFormedEvent>): () => void {
  matchListeners.push(listener);
  return () => {
    const index = matchListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(matchListeners, index);
  };
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Clear all queue state. For testing only.
 */
export function resetQueues(): void {
  playerQueues.clear();
  gameModeQueues.forEach((queue) => {
    queue.clear();
  });
}
