/**
 * @rbx/matchmaking
 * Matchmaking system for the platform.
 *
 * **Integration status:**
 * - `registerQueue`, `resetQueues` — integrated (MatchmakingService)
 * - Queue joining/leaving, match formation, match lifecycle,
 *   server allocation, teleportation — @planned (tested internally,
 *   not yet wired to game remotes)
 */

// Types
export * from "./types";

// Queue operations
export {
  // Configuration — integrated
  registerQueue,
  getQueueConfig,
  getRegisteredGameModes,
  // Queue operations — @planned: wire to client remotes
  joinQueue,
  leaveQueue,
  getQueueStatus,
  isInQueue,
  getQueueEntry,
  // Queue queries
  getQueueSize,
  getQueueEntries,
  // Timeout processing — @planned: call on interval in MatchmakingService
  processTimeouts,
  // Match formation — @planned: call on interval in MatchmakingService
  tryFormMatch,
  // Event listeners
  onQueueJoin,
  onQueueLeave,
  onMatchFormed,
  // Testing
  resetQueues,
} from "./queue";

// Match lifecycle — @planned: wire to game flow after queue formation
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

// Server allocation — @planned: wire after match lifecycle integration
export {
  // Service injection
  setTeleportService,
  // Configuration
  configureServerAllocation,
  getServerAllocationConfig,
  resetServerAllocationConfig,
  // Server allocation
  allocateServer,
  getReservedServer,
  releaseServer,
  getActiveServers,
  // Teleportation
  teleportToMatch,
  getTeleportRequest,
  getTeleportRequestsForMatch,
  // Player tracking
  recordPlayerJoined,
  allPlayersJoined,
  getMissingPlayers,
  // Cleanup
  cleanupExpiredServers,
  // Event listeners
  onServerAllocated,
  onTeleportInitiated,
  onTeleportFailure,
  // Testing
  resetServerAllocation,
} from "./server-allocation";

// Re-export server allocation types
export type {
  ITeleportService,
  ReservedServer,
  TeleportRequest,
  TeleportStatus,
  ServerAllocationConfig,
  ServerAllocatedEvent,
  TeleportInitiatedEvent,
  TeleportFailureEvent,
} from "./server-allocation";

// Matchmaking service factory
export * from "./create-matchmaking-service";
