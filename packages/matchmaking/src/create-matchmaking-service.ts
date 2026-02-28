/**
 * Factory for game-level MatchmakingService.
 *
 * Wraps the queue, match, and server-allocation modules with lifecycle
 * hooks so games get automatic queue registration, player cleanup,
 * and graceful shutdown (queue draining).
 */

import { Service, createLogger } from "@broblox/core";
import type { PlayerId } from "@broblox/shared-types";
import type { QueueConfig } from "./types";
import type { ITeleportService, ServerAllocationConfig } from "./server-allocation";
import {
  registerQueue,
  joinQueue,
  leaveQueue,
  isInQueue,
  tryFormMatch,
  processTimeouts,
  resetQueues,
  getRegisteredGameModes,
} from "./queue";
import { isInMatch, removePlayerFromMatch, resetMatches } from "./match";
import {
  setTeleportService,
  configureServerAllocation,
  resetServerAllocation,
} from "./server-allocation";

// ============================================================================
// Config
// ============================================================================

export interface MatchmakingServiceConfig {
  /** Queue definitions to register at init time. */
  queues: QueueConfig[];

  /** Teleport service adapter (for reserved-server teleportation). */
  teleportService?: ITeleportService;

  /** Server allocation tuning. */
  serverAllocation?: Partial<ServerAllocationConfig>;

  /**
   * Interval (seconds) for processing queue timeouts.
   * Set to 0 to disable automatic processing (you call processTimeouts yourself).
   * @default 1
   */
  timeoutIntervalSeconds?: number;

  /**
   * Interval (seconds) for attempting match formation across all queues.
   * Set to 0 to disable automatic processing (you call tryFormMatch yourself).
   * @default 2
   */
  matchFormationIntervalSeconds?: number;

  /**
   * Wires player-leave cleanup.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: { UserId: number }) => void) => void;

  /**
   * Wires player-join initialization.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: { UserId: number }) => void) => void;
}

// ============================================================================
// Handle
// ============================================================================

export interface MatchmakingServiceHandle {
  /** Service lifecycle object (register with Application). */
  Service: Service;

  /** Convenience: join a player to a queue. */
  joinQueue: typeof joinQueue;

  /** Convenience: remove a player from their queue. */
  leaveQueue: typeof leaveQueue;

  /** Convenience: try forming a match for a game mode. */
  tryFormMatch: typeof tryFormMatch;

  /** Convenience: process queue timeouts. */
  processTimeouts: typeof processTimeouts;

  /** Initialise per-player matchmaking state (called automatically if onPlayerAdded is provided). */
  initPlayer(playerId: PlayerId): void;

  /** Tear down per-player matchmaking state — removes from queue and match. */
  cleanupPlayer(playerId: PlayerId): void;
}

// ============================================================================
// Factory
// ============================================================================

export function createMatchmakingService(
  config: MatchmakingServiceConfig
): MatchmakingServiceHandle {
  const logger = createLogger("MatchmakingService");

  /** Tracks which players have been initialised so cleanup is thorough. */
  const activePlayers = new Set<number>();

  /** Whether the auto-processing loops should keep running. */
  let running = false;

  const handle: MatchmakingServiceHandle = {
    Service: {
      name: "MatchmakingService",

      onInit() {
        // Register all queues
        for (const queueCfg of config.queues) {
          registerQueue(queueCfg);
        }
        logger.info(`Registered ${config.queues.size()} queue(s)`);

        // Wire teleport service
        if (config.teleportService) {
          setTeleportService(config.teleportService);
        }

        // Configure server allocation
        if (config.serverAllocation) {
          configureServerAllocation(config.serverAllocation);
        }

        // Wire player-leave cleanup
        config.onPlayerRemoving?.((player) => {
          handle.cleanupPlayer(player.UserId as PlayerId);
        });

        logger.info("MatchmakingService initialised");
      },

      onStart() {
        config.onPlayerAdded?.((player) => {
          handle.initPlayer(player.UserId as PlayerId);
        });

        running = true;

        // Auto-process queue timeouts
        const timeoutInterval = config.timeoutIntervalSeconds ?? 1;
        if (timeoutInterval > 0) {
          task.spawn(() => {
            while (running) {
              task.wait(timeoutInterval);
              if (!running) break;
              processTimeouts();
            }
          });
        }

        // Auto-attempt match formation
        const matchInterval = config.matchFormationIntervalSeconds ?? 2;
        if (matchInterval > 0) {
          task.spawn(() => {
            while (running) {
              task.wait(matchInterval);
              if (!running) break;
              for (const mode of getRegisteredGameModes()) {
                tryFormMatch(mode);
              }
            }
          });
        }

        logger.info("MatchmakingService started");
      },

      onDestroy() {
        // Stop auto-processing loops
        running = false;

        // Remove all tracked players from queues/matches
        activePlayers.forEach((id) => {
          const playerId = id as PlayerId;
          if (isInQueue(playerId)) {
            leaveQueue(playerId, "left");
          }
          if (isInMatch(playerId)) {
            removePlayerFromMatch(playerId);
          }
        });
        activePlayers.clear();

        // Reset module state
        resetQueues();
        resetMatches();
        resetServerAllocation();

        logger.info("MatchmakingService stopped");
      },
    },

    joinQueue,
    leaveQueue,
    tryFormMatch,
    processTimeouts,

    initPlayer(playerId: PlayerId) {
      activePlayers.add(playerId as number);
      logger.debug(`Player ${playerId} matchmaking state initialised`);
    },

    cleanupPlayer(playerId: PlayerId) {
      if (!activePlayers.has(playerId as number)) return;

      // Remove from queue if queued
      if (isInQueue(playerId)) {
        leaveQueue(playerId, "left");
      }

      // Remove from match if in one
      if (isInMatch(playerId)) {
        removePlayerFromMatch(playerId);
      }

      activePlayers.delete(playerId as number);
      logger.debug(`Player ${playerId} matchmaking state cleaned up`);
    },
  };

  return handle;
}
