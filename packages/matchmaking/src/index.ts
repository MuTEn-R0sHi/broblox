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
