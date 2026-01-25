/**
 * @rbx/matchmaking
 * Matchmaking system for the platform.
 */

// Types
export * from "./types";

// Queue operations
export {
  // Configuration
  registerQueue,
  getQueueConfig,
  getRegisteredGameModes,
  // Queue operations
  joinQueue,
  leaveQueue,
  getQueueStatus,
  isInQueue,
  getQueueEntry,
  // Queue queries
  getQueueSize,
  getQueueEntries,
  // Timeout processing
  processTimeouts,
  // Match formation
  tryFormMatch,
  // Event listeners
  onQueueJoin,
  onQueueLeave,
  onMatchFormed,
  // Testing
  resetQueues,
} from "./queue";

// Match lifecycle
export {
  // Match registration
  registerMatch,
  getMatch,
  getPlayerMatch,
  isInMatch,
  getActiveMatches,
  // Ready-up system
  playerReady,
  isPlayerReady,
  getReadyStatus,
  // State transitions
  transitionToStarting,
  startMatch,
  endMatch,
  cancelMatch,
  removePlayerFromMatch,
  // Event listeners
  onMatchStatusChanged,
  onPlayerReady,
  onAllPlayersReady,
  onMatchStarted,
  onMatchEnded,
  // Testing
  resetMatches,
} from "./match";

// Re-export match event types
export type {
  MatchStatusChangedEvent,
  PlayerReadyEvent,
  AllPlayersReadyEvent,
  MatchStartedEvent,
  MatchEndedEvent,
} from "./match";
