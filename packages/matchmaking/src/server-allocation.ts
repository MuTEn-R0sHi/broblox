/**
 * Reserved server allocation for matches.
 *
 * Handles TeleportService integration:
 * - Reserve servers for matches
 * - Teleport player groups to reserved servers
 * - Handle teleport failures gracefully
 * - Track active servers
 *
 * @note Uses roblox-ts compatible patterns for Luau compilation.
 * @note TeleportService calls are stubbed for unit testing.
 */

import { Result, ok, err, ErrorCode, PlayerId, MatchId } from "@broblox/shared-types";
import { arraySize, arrayRemoveAt } from "@broblox/core";

// ============================================================================
// Types
// ============================================================================

/** Reserved server information */
export interface ReservedServer {
  /** Server access code from TeleportService */
  accessCode: string;
  /** Place ID the server is for */
  placeId: number;
  /** Associated match ID */
  matchId: MatchId;
  /** When the server was reserved */
  createdAt: number;
  /** Players expected to join */
  expectedPlayers: PlayerId[];
  /** Players who have joined */
  joinedPlayers: PlayerId[];
}

/** Teleport status for tracking */
export type TeleportStatus = "pending" | "teleporting" | "success" | "failed";

/** Teleport request tracking */
export interface TeleportRequest {
  /** Unique request ID */
  requestId: string;
  /** Match ID */
  matchId: MatchId;
  /** Players being teleported */
  players: PlayerId[];
  /** Target server access code */
  accessCode: string;
  /** Place ID */
  placeId: number;
  /** Current status */
  status: TeleportStatus;
  /** When teleport was initiated */
  initiatedAt: number;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
}

/** Server allocation configuration */
export interface ServerAllocationConfig {
  /** Maximum retry attempts for failed teleports */
  maxRetries: number;
  /** Delay between retries (seconds) */
  retryDelaySeconds: number;
  /** Server reservation timeout (seconds) */
  reservationTimeoutSeconds: number;
  /** Whether to log teleport events */
  logEvents: boolean;
}

/** Teleport failure event */
export interface TeleportFailureEvent {
  requestId: string;
  matchId: MatchId;
  playerId: PlayerId;
  error: string;
  timestamp: number;
  willRetry: boolean;
}

/** Server allocation event */
export interface ServerAllocatedEvent {
  matchId: MatchId;
  accessCode: string;
  placeId: number;
  timestamp: number;
}

/** Teleport initiated event */
export interface TeleportInitiatedEvent {
  requestId: string;
  matchId: MatchId;
  playerCount: number;
  timestamp: number;
}

// ============================================================================
// TeleportService Stub (for unit testing)
// ============================================================================

/**
 * TeleportService interface for dependency injection.
 * In Roblox, this wraps the actual TeleportService.
 * In tests, this can be mocked.
 */
export interface ITeleportService {
  /** Reserve a server for a place */
  reserveServer(placeId: number): Result<string>;
  /** Teleport players to a private server */
  teleportToPrivateServer(
    placeId: number,
    accessCode: string,
    players: PlayerId[],
    teleportData?: Record<string, unknown>
  ): Result<void>;
}

/** Default (no-op) teleport service for testing */
let teleportService: ITeleportService = {
  reserveServer(_placeId: number): Result<string> {
    return err(ErrorCode.ServiceUnavailable, { message: "TeleportService not configured" });
  },
  teleportToPrivateServer(
    _placeId: number,
    _accessCode: string,
    _players: PlayerId[],
    _teleportData?: Record<string, unknown>
  ): Result<void> {
    return err(ErrorCode.ServiceUnavailable, { message: "TeleportService not configured" });
  },
};

/**
 * Configure the teleport service implementation.
 * Call this with the actual TeleportService wrapper in Roblox.
 */
export function setTeleportService(service: ITeleportService): void {
  teleportService = service;
}

// ============================================================================
// State
// ============================================================================

/** Default configuration */
const defaultConfig: ServerAllocationConfig = {
  maxRetries: 3,
  retryDelaySeconds: 2,
  reservationTimeoutSeconds: 300, // 5 minutes
  logEvents: true,
};

/** Current configuration */
let currentConfig: ServerAllocationConfig = { ...defaultConfig };

/** Active reserved servers by match ID */
const activeServers = new Map<string, ReservedServer>();

/** Active teleport requests by request ID */
const teleportRequests = new Map<string, TeleportRequest>();

/** Counter for generating request IDs */
let requestCounter = 0;

// ============================================================================
// Event Listeners
// ============================================================================

type EventListener<T> = (event: T) => void;

const serverAllocatedListeners: EventListener<ServerAllocatedEvent>[] = [];
const teleportInitiatedListeners: EventListener<TeleportInitiatedEvent>[] = [];
const teleportFailureListeners: EventListener<TeleportFailureEvent>[] = [];

function generateRequestId(): string {
  requestCounter++;
  return `teleport-${requestCounter}`;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configure server allocation settings.
 */
export function configureServerAllocation(config: Partial<ServerAllocationConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current configuration.
 */
export function getServerAllocationConfig(): ServerAllocationConfig {
  return { ...currentConfig };
}

/**
 * Reset to default configuration.
 */
export function resetServerAllocationConfig(): void {
  currentConfig = { ...defaultConfig };
}

// ============================================================================
// Server Allocation
// ============================================================================

/**
 * Allocate a reserved server for a match.
 *
 * @param placeId - Roblox place ID for the match server
 * @param matchId - Match identifier
 * @param players - Players expected to join
 * @returns Result with the reserved server info
 */
export function allocateServer(
  placeId: number,
  matchId: MatchId,
  players: PlayerId[]
): Result<ReservedServer> {
  // Check if server already allocated for this match
  const existingServer = activeServers.get(matchId as string);
  if (existingServer) {
    return ok(existingServer);
  }

  // Reserve the server
  const reserveResult = teleportService.reserveServer(placeId);
  if (!reserveResult.ok) {
    return err(reserveResult.code, {
      message: `Failed to reserve server: ${reserveResult.message ?? "unknown error"}`,
    });
  }

  const now = os.clock();
  const server: ReservedServer = {
    accessCode: reserveResult.value,
    placeId,
    matchId,
    createdAt: now,
    expectedPlayers: [...players],
    joinedPlayers: [],
  };

  activeServers.set(matchId as string, server);

  // Emit event
  if (currentConfig.logEvents) {
    const event: ServerAllocatedEvent = {
      matchId,
      accessCode: server.accessCode,
      placeId,
      timestamp: now,
    };
    for (const listener of serverAllocatedListeners) {
      listener(event);
    }
  }

  return ok(server);
}

/**
 * Get a reserved server by match ID.
 */
export function getReservedServer(matchId: MatchId): ReservedServer | undefined {
  return activeServers.get(matchId as string);
}

/**
 * Release a reserved server (e.g., when match ends).
 */
export function releaseServer(matchId: MatchId): boolean {
  return activeServers.delete(matchId as string);
}

/**
 * Get all active reserved servers.
 */
export function getActiveServers(): ReservedServer[] {
  const servers: ReservedServer[] = [];
  activeServers.forEach((server) => {
    servers.push(server);
  });
  return servers;
}

// ============================================================================
// Teleportation
// ============================================================================

/**
 * Teleport players to a match's reserved server.
 *
 * @param matchId - Match identifier
 * @param players - Players to teleport
 * @param teleportData - Optional data to send with teleport
 * @returns Result with the teleport request info
 */
export function teleportToMatch(
  matchId: MatchId,
  players: PlayerId[],
  teleportData?: Record<string, unknown>
): Result<TeleportRequest> {
  const server = activeServers.get(matchId as string);
  if (!server) {
    return err(ErrorCode.NotFound, { message: `No reserved server found for match: ${matchId}` });
  }

  if (arraySize(players) === 0) {
    return err(ErrorCode.InvalidPayload, { message: "No players to teleport" });
  }

  const now = os.clock();
  const requestId = generateRequestId();

  const request: TeleportRequest = {
    requestId,
    matchId,
    players: [...players],
    accessCode: server.accessCode,
    placeId: server.placeId,
    status: "pending",
    initiatedAt: now,
    retryCount: 0,
  };

  teleportRequests.set(requestId, request);

  // Emit initiated event
  if (currentConfig.logEvents) {
    const event: TeleportInitiatedEvent = {
      requestId,
      matchId,
      playerCount: arraySize(players),
      timestamp: now,
    };
    for (const listener of teleportInitiatedListeners) {
      listener(event);
    }
  }

  // Attempt teleport
  request.status = "teleporting";
  const teleportResult = teleportService.teleportToPrivateServer(
    server.placeId,
    server.accessCode,
    players,
    teleportData
  );

  if (!teleportResult.ok) {
    request.status = "failed";
    request.error = teleportResult.message ?? "Teleport failed";

    // Emit failure event
    if (currentConfig.logEvents) {
      for (const playerId of players) {
        const event: TeleportFailureEvent = {
          requestId,
          matchId,
          playerId,
          error: teleportResult.message ?? "Teleport failed",
          timestamp: os.clock(),
          willRetry: request.retryCount < currentConfig.maxRetries,
        };
        for (const listener of teleportFailureListeners) {
          listener(event);
        }
      }
    }

    return err(teleportResult.code, { message: teleportResult.message });
  }

  request.status = "success";
  return ok(request);
}

/**
 * Get a teleport request by ID.
 */
export function getTeleportRequest(requestId: string): TeleportRequest | undefined {
  return teleportRequests.get(requestId);
}

/**
 * Get all teleport requests for a match.
 */
export function getTeleportRequestsForMatch(matchId: MatchId): TeleportRequest[] {
  const requests: TeleportRequest[] = [];
  teleportRequests.forEach((request) => {
    if (request.matchId === matchId) {
      requests.push(request);
    }
  });
  return requests;
}

/**
 * Record that a player has joined the server.
 * Call this when a player connects to the reserved server.
 */
export function recordPlayerJoined(matchId: MatchId, playerId: PlayerId): boolean {
  const server = activeServers.get(matchId as string);
  if (!server) {
    return false;
  }

  // Check if player is expected
  let isExpected = false;
  for (const expected of server.expectedPlayers) {
    if (expected === playerId) {
      isExpected = true;
      break;
    }
  }
  if (!isExpected) {
    return false;
  }

  // Check if already joined
  for (const joined of server.joinedPlayers) {
    if (joined === playerId) {
      return true; // Already recorded
    }
  }

  server.joinedPlayers.push(playerId);
  return true;
}

/**
 * Check if all expected players have joined.
 */
export function allPlayersJoined(matchId: MatchId): boolean {
  const server = activeServers.get(matchId as string);
  if (!server) {
    return false;
  }

  return arraySize(server.joinedPlayers) >= arraySize(server.expectedPlayers);
}

/**
 * Get players who haven't joined yet.
 */
export function getMissingPlayers(matchId: MatchId): PlayerId[] {
  const server = activeServers.get(matchId as string);
  if (!server) {
    return [];
  }

  const missing: PlayerId[] = [];
  for (const expected of server.expectedPlayers) {
    let found = false;
    for (const joined of server.joinedPlayers) {
      if (joined === expected) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(expected);
    }
  }
  return missing;
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Clean up expired server reservations.
 * Call this periodically (e.g., every minute).
 *
 * @returns Number of servers cleaned up
 */
export function cleanupExpiredServers(): number {
  const now = os.clock();
  const timeout = currentConfig.reservationTimeoutSeconds;
  const expiredMatches: string[] = [];

  activeServers.forEach((server, matchId) => {
    if (now - server.createdAt > timeout) {
      expiredMatches.push(matchId);
    }
  });

  for (const matchId of expiredMatches) {
    activeServers.delete(matchId);
  }

  return arraySize(expiredMatches);
}

// ============================================================================
// Event Subscriptions
// ============================================================================

/**
 * Register a listener for server allocation events.
 */
export function onServerAllocated(listener: EventListener<ServerAllocatedEvent>): () => void {
  serverAllocatedListeners.push(listener);
  return () => {
    const index = serverAllocatedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(serverAllocatedListeners, index);
  };
}

/**
 * Register a listener for teleport initiated events.
 */
export function onTeleportInitiated(listener: EventListener<TeleportInitiatedEvent>): () => void {
  teleportInitiatedListeners.push(listener);
  return () => {
    const index = teleportInitiatedListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(teleportInitiatedListeners, index);
  };
}

/**
 * Register a listener for teleport failure events.
 */
export function onTeleportFailure(listener: EventListener<TeleportFailureEvent>): () => void {
  teleportFailureListeners.push(listener);
  return () => {
    const index = teleportFailureListeners.indexOf(listener);
    if (index >= 0) arrayRemoveAt(teleportFailureListeners, index);
  };
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Clear all server allocation state. For testing only.
 */
export function resetServerAllocation(): void {
  activeServers.clear();
  teleportRequests.clear();
  requestCounter = 0;
  currentConfig = { ...defaultConfig };
}
