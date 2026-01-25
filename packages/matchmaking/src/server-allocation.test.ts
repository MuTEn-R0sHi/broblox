/**
 * Unit tests for server allocation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createPlayerId, createMatchId } from "@rbx/testing";
import { ok, err, ErrorCode } from "@rbx/shared-types";
import type { PlayerId, MatchId, Result } from "@rbx/shared-types";
import {
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
  recordPlayerJoined,
  allPlayersJoined,
  getMissingPlayers,
  // Cleanup
  cleanupExpiredServers,
  // Events
  onServerAllocated,
  onTeleportInitiated,
  onTeleportFailure,
  // Service injection
  setTeleportService,
  // Reset
  resetServerAllocation,
  // Types
  type ITeleportService,
  type ServerAllocatedEvent,
  type TeleportInitiatedEvent,
  type TeleportFailureEvent,
} from "./server-allocation";

// Mock time
let mockTime = 0;

// Mock teleport service
function createMockTeleportService(options?: {
  reserveServerFails?: boolean;
  teleportFails?: boolean;
  accessCode?: string;
}): ITeleportService {
  let accessCodeCounter = 0;
  return {
    reserveServer: (_placeId: number): Result<string> => {
      if (options?.reserveServerFails) {
        return err(ErrorCode.ServiceUnavailable, { message: "Reserve server failed" });
      }
      accessCodeCounter++;
      return ok(options?.accessCode ?? `access-code-${accessCodeCounter}`);
    },
    teleportToPrivateServer: (
      _placeId: number,
      _accessCode: string,
      _players: PlayerId[],
      _teleportData?: Record<string, unknown>
    ): Result<void> => {
      if (options?.teleportFails) {
        return err(ErrorCode.ServiceUnavailable, { message: "Teleport failed" });
      }
      return ok(undefined);
    },
  };
}

beforeEach(() => {
  mockTime = 0;
  mockRobloxGlobals();
  (globalThis as Record<string, unknown>).os = {
    clock: () => mockTime,
    time: () => Math.floor(mockTime),
  };
  resetServerAllocation();
  // Set up default mock service
  setTeleportService(createMockTeleportService());
});

function advanceTime(seconds: number): void {
  mockTime += seconds;
}

// ID counter for unique IDs per test
let idCounter = 0;
function nextMatchId(): MatchId {
  idCounter++;
  return createMatchId(`match-${idCounter}`);
}
function nextPlayerId(): PlayerId {
  idCounter++;
  return createPlayerId(idCounter);
}

describe("server-allocation", () => {
  // ==========================================================================
  // Configuration
  // ==========================================================================

  describe("configuration", () => {
    it("should have default configuration", () => {
      const config = getServerAllocationConfig();
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelaySeconds).toBe(2);
      expect(config.reservationTimeoutSeconds).toBe(300);
      expect(config.logEvents).toBe(true);
    });

    it("should update configuration partially", () => {
      configureServerAllocation({ maxRetries: 5 });
      const config = getServerAllocationConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.retryDelaySeconds).toBe(2); // Unchanged
    });

    it("should reset to defaults", () => {
      configureServerAllocation({ maxRetries: 10, retryDelaySeconds: 5 });
      resetServerAllocationConfig();
      const config = getServerAllocationConfig();
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelaySeconds).toBe(2);
    });
  });

  // ==========================================================================
  // Server Allocation
  // ==========================================================================

  describe("allocateServer", () => {
    const placeId = 123456;

    it("should allocate a server successfully", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId(), nextPlayerId()];
      const result = allocateServer(placeId, matchId, players);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.placeId).toBe(placeId);
        expect(result.value.matchId).toBe(matchId);
        expect(result.value.accessCode).toBeDefined();
        expect(result.value.expectedPlayers).toHaveLength(2);
        expect(result.value.joinedPlayers).toHaveLength(0);
      }
    });

    it("should return existing server if already allocated", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId(), nextPlayerId()];
      const result1 = allocateServer(placeId, matchId, players);
      const result2 = allocateServer(placeId, matchId, players);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.value.accessCode).toBe(result2.value.accessCode);
      }
    });

    it("should fail when TeleportService fails", () => {
      setTeleportService(createMockTeleportService({ reserveServerFails: true }));
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId()];

      const result = allocateServer(placeId, matchId, players);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.ServiceUnavailable);
      }
    });

    it("should emit server allocated event", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId()];
      const events: ServerAllocatedEvent[] = [];
      const unsubscribe = onServerAllocated((event) => events.push(event));

      allocateServer(placeId, matchId, players);

      expect(events).toHaveLength(1);
      expect(events[0]!.matchId).toBe(matchId);
      expect(events[0]!.placeId).toBe(placeId);

      unsubscribe();
    });
  });

  describe("getReservedServer", () => {
    it("should return allocated server", () => {
      const matchId = nextMatchId();
      allocateServer(123456, matchId, [nextPlayerId()]);

      const server = getReservedServer(matchId);

      expect(server).toBeDefined();
      expect(server?.matchId).toBe(matchId);
    });

    it("should return undefined for unknown match", () => {
      const server = getReservedServer(createMatchId("unknown-match"));
      expect(server).toBeUndefined();
    });
  });

  describe("releaseServer", () => {
    it("should release allocated server", () => {
      const matchId = nextMatchId();
      allocateServer(123456, matchId, [nextPlayerId()]);

      const released = releaseServer(matchId);

      expect(released).toBe(true);
      expect(getReservedServer(matchId)).toBeUndefined();
    });

    it("should return false for unknown match", () => {
      const released = releaseServer(createMatchId("unknown-match"));
      expect(released).toBe(false);
    });
  });

  describe("getActiveServers", () => {
    it("should return all active servers", () => {
      const match1 = nextMatchId();
      const match2 = nextMatchId();
      allocateServer(123456, match1, [nextPlayerId()]);
      allocateServer(123456, match2, [nextPlayerId()]);

      const servers = getActiveServers();

      expect(servers).toHaveLength(2);
    });

    it("should return empty array when no servers", () => {
      const servers = getActiveServers();
      expect(servers).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Teleportation
  // ==========================================================================

  describe("teleportToMatch", () => {
    const placeId = 123456;

    it("should teleport players successfully", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId(), nextPlayerId()];
      allocateServer(placeId, matchId, players);

      const result = teleportToMatch(matchId, players);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("success");
        expect(result.value.matchId).toBe(matchId);
        expect(result.value.players).toHaveLength(2);
      }
    });

    it("should fail when no server allocated", () => {
      const result = teleportToMatch(createMatchId("no-server"), [nextPlayerId()]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.NotFound);
      }
    });

    it("should fail when no players provided", () => {
      const matchId = nextMatchId();
      allocateServer(placeId, matchId, [nextPlayerId()]);

      const result = teleportToMatch(matchId, []);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.InvalidPayload);
      }
    });

    it("should fail when teleport service fails", () => {
      setTeleportService(createMockTeleportService({ teleportFails: true }));

      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId()];
      allocateServer(placeId, matchId, players);

      const result = teleportToMatch(matchId, players);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.ServiceUnavailable);
      }
    });

    it("should emit teleport initiated event", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId(), nextPlayerId()];
      allocateServer(placeId, matchId, players);

      const events: TeleportInitiatedEvent[] = [];
      const unsubscribe = onTeleportInitiated((event) => events.push(event));

      teleportToMatch(matchId, players);

      expect(events).toHaveLength(1);
      expect(events[0]!.matchId).toBe(matchId);
      expect(events[0]!.playerCount).toBe(2);

      unsubscribe();
    });

    it("should emit teleport failure events on failure", () => {
      setTeleportService(createMockTeleportService({ teleportFails: true }));

      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId(), nextPlayerId()];
      allocateServer(placeId, matchId, players);

      const events: TeleportFailureEvent[] = [];
      const unsubscribe = onTeleportFailure((event) => events.push(event));

      teleportToMatch(matchId, players);

      expect(events).toHaveLength(2); // One per player
      expect(events[0]!.matchId).toBe(matchId);
      expect(events[0]!.error).toBeDefined();

      unsubscribe();
    });
  });

  describe("getTeleportRequest", () => {
    it("should return teleport request by ID", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId()];
      allocateServer(123456, matchId, players);

      const teleportResult = teleportToMatch(matchId, players);
      expect(teleportResult.ok).toBe(true);
      if (!teleportResult.ok) return;

      const request = getTeleportRequest(teleportResult.value.requestId);

      expect(request).toBeDefined();
      expect(request?.matchId).toBe(matchId);
    });

    it("should return undefined for unknown request", () => {
      const request = getTeleportRequest("unknown-request");
      expect(request).toBeUndefined();
    });
  });

  describe("getTeleportRequestsForMatch", () => {
    it("should return all requests for a match", () => {
      const matchId = nextMatchId();
      const players: PlayerId[] = [nextPlayerId()];
      allocateServer(123456, matchId, players);

      teleportToMatch(matchId, players);
      teleportToMatch(matchId, players);

      const requests = getTeleportRequestsForMatch(matchId);

      expect(requests).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Player Tracking
  // ==========================================================================

  describe("player tracking", () => {
    const placeId = 123456;

    it("should record player joined", () => {
      const matchId = nextMatchId();
      const player = nextPlayerId();
      allocateServer(placeId, matchId, [player]);

      const recorded = recordPlayerJoined(matchId, player);

      expect(recorded).toBe(true);
    });

    it("should not record unexpected player", () => {
      const matchId = nextMatchId();
      const expectedPlayer = nextPlayerId();
      const unexpectedPlayer = nextPlayerId();
      allocateServer(placeId, matchId, [expectedPlayer]);

      const recorded = recordPlayerJoined(matchId, unexpectedPlayer);

      expect(recorded).toBe(false);
    });

    it("should handle duplicate join recording", () => {
      const matchId = nextMatchId();
      const player = nextPlayerId();
      allocateServer(placeId, matchId, [player]);

      recordPlayerJoined(matchId, player);
      const recorded = recordPlayerJoined(matchId, player);

      expect(recorded).toBe(true); // Still true, idempotent
    });

    it("should return false for unknown match", () => {
      const recorded = recordPlayerJoined(createMatchId("unknown-match"), nextPlayerId());
      expect(recorded).toBe(false);
    });

    it("should track when all players joined", () => {
      const matchId = nextMatchId();
      const player1 = nextPlayerId();
      const player2 = nextPlayerId();
      allocateServer(placeId, matchId, [player1, player2]);

      expect(allPlayersJoined(matchId)).toBe(false);

      recordPlayerJoined(matchId, player1);
      expect(allPlayersJoined(matchId)).toBe(false);

      recordPlayerJoined(matchId, player2);
      expect(allPlayersJoined(matchId)).toBe(true);
    });

    it("should return missing players", () => {
      const matchId = nextMatchId();
      const player1 = nextPlayerId();
      const player2 = nextPlayerId();
      allocateServer(placeId, matchId, [player1, player2]);

      let missing = getMissingPlayers(matchId);
      expect(missing).toHaveLength(2);

      recordPlayerJoined(matchId, player1);
      missing = getMissingPlayers(matchId);
      expect(missing).toHaveLength(1);
      expect(missing[0]).toBe(player2);
    });

    it("should return empty array for unknown match", () => {
      const missing = getMissingPlayers(createMatchId("unknown-match"));
      expect(missing).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe("cleanupExpiredServers", () => {
    it("should cleanup expired servers", () => {
      const matchId = nextMatchId();
      allocateServer(123456, matchId, [nextPlayerId()]);

      expect(getActiveServers()).toHaveLength(1);

      // Advance past timeout
      advanceTime(301);
      const cleaned = cleanupExpiredServers();

      expect(cleaned).toBe(1);
      expect(getActiveServers()).toHaveLength(0);
    });

    it("should not cleanup non-expired servers", () => {
      const matchId = nextMatchId();
      allocateServer(123456, matchId, [nextPlayerId()]);

      advanceTime(100); // Less than timeout
      const cleaned = cleanupExpiredServers();

      expect(cleaned).toBe(0);
      expect(getActiveServers()).toHaveLength(1);
    });

    it("should cleanup only expired servers", () => {
      const match1 = nextMatchId();
      allocateServer(123456, match1, [nextPlayerId()]);

      advanceTime(200);

      const match2 = nextMatchId();
      allocateServer(123456, match2, [nextPlayerId()]);

      advanceTime(150); // match1 is now 350s old, match2 is 150s old
      const cleaned = cleanupExpiredServers();

      expect(cleaned).toBe(1);
      expect(getActiveServers()).toHaveLength(1);
      expect(getReservedServer(match2)).toBeDefined();
    });
  });

  // ==========================================================================
  // Event Unsubscription
  // ==========================================================================

  describe("event unsubscription", () => {
    it("should unsubscribe from server allocated events", () => {
      const events: ServerAllocatedEvent[] = [];
      const unsubscribe = onServerAllocated((event) => events.push(event));
      unsubscribe();

      allocateServer(123456, nextMatchId(), [nextPlayerId()]);

      expect(events).toHaveLength(0);
    });

    it("should unsubscribe from teleport initiated events", () => {
      const events: TeleportInitiatedEvent[] = [];
      const unsubscribe = onTeleportInitiated((event) => events.push(event));
      unsubscribe();

      const matchId = nextMatchId();
      const players = [nextPlayerId()];
      allocateServer(123456, matchId, players);
      teleportToMatch(matchId, players);

      expect(events).toHaveLength(0);
    });

    it("should unsubscribe from teleport failure events", () => {
      setTeleportService(createMockTeleportService({ teleportFails: true }));

      const events: TeleportFailureEvent[] = [];
      const unsubscribe = onTeleportFailure((event) => events.push(event));
      unsubscribe();

      const matchId = nextMatchId();
      const players = [nextPlayerId()];
      allocateServer(123456, matchId, players);
      teleportToMatch(matchId, players);

      expect(events).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe("resetServerAllocation", () => {
    it("should clear all state", () => {
      const matchId = nextMatchId();
      allocateServer(123456, matchId, [nextPlayerId()]);
      configureServerAllocation({ maxRetries: 10 });

      resetServerAllocation();

      expect(getActiveServers()).toHaveLength(0);
      expect(getServerAllocationConfig().maxRetries).toBe(3);
    });
  });
});
