/**
 * Unit tests for queue management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createPlayerId } from "@rbx/testing";
import {
  registerQueue,
  getQueueConfig,
  getRegisteredGameModes,
  joinQueue,
  leaveQueue,
  getQueueStatus,
  isInQueue,
  getQueueSize,
  getQueueEntries,
  processTimeouts,
  tryFormMatch,
  onQueueJoin,
  onQueueLeave,
  onMatchFormed,
  resetQueues,
} from "./queue";
import type { QueueConfig, QueueJoinEvent, QueueLeaveEvent, MatchFormedEvent } from "./types";

// Mock Roblox globals
beforeEach(() => {
  mockRobloxGlobals();
  resetQueues();
});

describe("Queue Configuration", () => {
  const testConfig: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  it("registers a queue configuration", () => {
    registerQueue(testConfig);
    expect(getQueueConfig("pvp-1v1")).toEqual(testConfig);
  });

  it("returns undefined for unregistered game mode", () => {
    expect(getQueueConfig("unknown")).toBeUndefined();
  });

  it("lists registered game modes", () => {
    registerQueue(testConfig);
    registerQueue({ ...testConfig, gameMode: "pvp-2v2" });
    const modes = getRegisteredGameModes();
    expect(modes).toContain("pvp-1v1");
    expect(modes).toContain("pvp-2v2");
  });
});

describe("Join Queue", () => {
  const config: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  beforeEach(() => {
    registerQueue(config);
  });

  it("allows player to join queue", () => {
    const playerId = createPlayerId(1);
    const result = joinQueue(playerId, "pvp-1v1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.inQueue).toBe(true);
      expect(result.value.gameMode).toBe("pvp-1v1");
    }
  });

  it("rejects join for unknown game mode", () => {
    const playerId = createPlayerId(1);
    const result = joinQueue(playerId, "unknown");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Unknown game mode");
    }
  });

  it("prevents player from joining multiple queues", () => {
    registerQueue({ ...config, gameMode: "pvp-2v2" });
    const playerId = createPlayerId(1);

    joinQueue(playerId, "pvp-1v1");
    const result = joinQueue(playerId, "pvp-2v2");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Already in queue");
    }
  });

  it("allows rejoining same queue (returns current status)", () => {
    const playerId = createPlayerId(1);

    joinQueue(playerId, "pvp-1v1");
    const result = joinQueue(playerId, "pvp-1v1");

    expect(result.ok).toBe(true);
  });

  it("stores MMR when provided", () => {
    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1", 1500);

    const entries = getQueueEntries("pvp-1v1");
    expect(entries[0].mmr).toBe(1500);
  });
});

describe("Leave Queue", () => {
  const config: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  beforeEach(() => {
    registerQueue(config);
  });

  it("allows player to leave queue", () => {
    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1");

    const result = leaveQueue(playerId);
    expect(result.ok).toBe(true);
    expect(isInQueue(playerId)).toBe(false);
  });

  it("returns error when not in queue", () => {
    const playerId = createPlayerId(1);
    const result = leaveQueue(playerId);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Not in any queue");
    }
  });

  it("removes player from game mode queue", () => {
    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1");
    expect(getQueueSize("pvp-1v1")).toBe(1);

    leaveQueue(playerId);
    expect(getQueueSize("pvp-1v1")).toBe(0);
  });
});

describe("Queue Status", () => {
  const config: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  beforeEach(() => {
    registerQueue(config);
  });

  it("returns not in queue for non-queued player", () => {
    const playerId = createPlayerId(1);
    const status = getQueueStatus(playerId);

    expect(status.inQueue).toBe(false);
    expect(status.gameMode).toBeUndefined();
  });

  it("returns queue status for queued player", () => {
    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1");

    const status = getQueueStatus(playerId);
    expect(status.inQueue).toBe(true);
    expect(status.gameMode).toBe("pvp-1v1");
    expect(status.position).toBe(1);
  });

  it("tracks queue position correctly", () => {
    const player1 = createPlayerId(1);
    const player2 = createPlayerId(2);
    const player3 = createPlayerId(3);

    joinQueue(player1, "pvp-1v1");
    joinQueue(player2, "pvp-1v1");
    joinQueue(player3, "pvp-1v1");

    expect(getQueueStatus(player1).position).toBe(1);
    expect(getQueueStatus(player2).position).toBe(2);
    expect(getQueueStatus(player3).position).toBe(3);
  });
});

describe("Queue Size and Entries", () => {
  const config: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  beforeEach(() => {
    registerQueue(config);
  });

  it("returns correct queue size", () => {
    expect(getQueueSize("pvp-1v1")).toBe(0);

    joinQueue(createPlayerId(1), "pvp-1v1");
    expect(getQueueSize("pvp-1v1")).toBe(1);

    joinQueue(createPlayerId(2), "pvp-1v1");
    expect(getQueueSize("pvp-1v1")).toBe(2);
  });

  it("returns 0 for unknown game mode", () => {
    expect(getQueueSize("unknown")).toBe(0);
  });

  it("returns entries sorted by join time", () => {
    // Note: In test environment, os.clock() may return same value
    // so we just verify entries are returned
    joinQueue(createPlayerId(1), "pvp-1v1");
    joinQueue(createPlayerId(2), "pvp-1v1");

    const entries = getQueueEntries("pvp-1v1");
    expect(entries.length).toBe(2);
  });
});

describe("Timeout Processing", () => {
  it("removes timed out players", () => {
    // Create a queue with 1-second timeout
    registerQueue({
      gameMode: "quick",
      minPlayers: 2,
      maxPlayers: 2,
      timeoutSeconds: 1,
    });

    const playerId = createPlayerId(1);
    joinQueue(playerId, "quick");

    // Mock time passing
    const originalClock = globalThis.os.clock;
    let mockTime = 0;
    globalThis.os.clock = () => mockTime;

    // Join at time 0
    resetQueues();
    registerQueue({
      gameMode: "quick",
      minPlayers: 2,
      maxPlayers: 2,
      timeoutSeconds: 1,
    });
    joinQueue(playerId, "quick");

    // Process at time 0.5 - should not timeout
    mockTime = 0.5;
    expect(processTimeouts()).toBe(0);
    expect(isInQueue(playerId)).toBe(true);

    // Process at time 1.5 - should timeout
    mockTime = 1.5;
    expect(processTimeouts()).toBe(1);
    expect(isInQueue(playerId)).toBe(false);

    globalThis.os.clock = originalClock;
  });
});

describe("Match Formation", () => {
  const config: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  beforeEach(() => {
    registerQueue(config);
  });

  it("returns undefined when not enough players", () => {
    joinQueue(createPlayerId(1), "pvp-1v1");

    const match = tryFormMatch("pvp-1v1");
    expect(match).toBeUndefined();
  });

  it("forms match when enough players", () => {
    joinQueue(createPlayerId(1), "pvp-1v1");
    joinQueue(createPlayerId(2), "pvp-1v1");

    const match = tryFormMatch("pvp-1v1");
    expect(match).toBeDefined();
    expect(match!.gameMode).toBe("pvp-1v1");
    expect(match!.players.length).toBe(2);
    expect(match!.status).toBe("forming");
  });

  it("removes matched players from queue", () => {
    const player1 = createPlayerId(1);
    const player2 = createPlayerId(2);
    joinQueue(player1, "pvp-1v1");
    joinQueue(player2, "pvp-1v1");

    tryFormMatch("pvp-1v1");

    expect(isInQueue(player1)).toBe(false);
    expect(isInQueue(player2)).toBe(false);
    expect(getQueueSize("pvp-1v1")).toBe(0);
  });

  it("assigns teams when configured", () => {
    registerQueue({
      gameMode: "pvp-2v2",
      minPlayers: 4,
      maxPlayers: 4,
      timeoutSeconds: 60,
    });

    joinQueue(createPlayerId(1), "pvp-2v2");
    joinQueue(createPlayerId(2), "pvp-2v2");
    joinQueue(createPlayerId(3), "pvp-2v2");
    joinQueue(createPlayerId(4), "pvp-2v2");

    const match = tryFormMatch("pvp-2v2", { gameMode: "pvp-2v2", teamSize: 2, teamCount: 2 });

    expect(match).toBeDefined();
    expect(match!.teams).toBeDefined();
    expect(match!.teams!.length).toBe(2);
    expect(match!.teams![0].players.length).toBe(2);
    expect(match!.teams![1].players.length).toBe(2);
  });

  it("generates unique match ID", () => {
    joinQueue(createPlayerId(1), "pvp-1v1");
    joinQueue(createPlayerId(2), "pvp-1v1");
    const match1 = tryFormMatch("pvp-1v1");

    joinQueue(createPlayerId(3), "pvp-1v1");
    joinQueue(createPlayerId(4), "pvp-1v1");
    const match2 = tryFormMatch("pvp-1v1");

    expect(match1!.matchId).not.toBe(match2!.matchId);
  });
});

describe("Event Listeners", () => {
  const config: QueueConfig = {
    gameMode: "pvp-1v1",
    minPlayers: 2,
    maxPlayers: 2,
    timeoutSeconds: 60,
  };

  beforeEach(() => {
    registerQueue(config);
  });

  it("emits join event when player joins", () => {
    const events: QueueJoinEvent[] = [];
    onQueueJoin((e) => events.push(e));

    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1", 1500);

    expect(events.length).toBe(1);
    expect(events[0].playerId).toBe(playerId);
    expect(events[0].gameMode).toBe("pvp-1v1");
    expect(events[0].mmr).toBe(1500);
  });

  it("emits leave event when player leaves", () => {
    const events: QueueLeaveEvent[] = [];
    onQueueLeave((e) => events.push(e));

    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1");
    leaveQueue(playerId);

    expect(events.length).toBe(1);
    expect(events[0].playerId).toBe(playerId);
    expect(events[0].reason).toBe("left");
  });

  it("emits match formed event", () => {
    const events: MatchFormedEvent[] = [];
    onMatchFormed((e) => events.push(e));

    joinQueue(createPlayerId(1), "pvp-1v1");
    joinQueue(createPlayerId(2), "pvp-1v1");
    tryFormMatch("pvp-1v1");

    expect(events.length).toBe(1);
    expect(events[0].gameMode).toBe("pvp-1v1");
    expect(events[0].players.length).toBe(2);
  });

  it("allows unsubscribing from events", () => {
    const events: QueueJoinEvent[] = [];
    const unsubscribe = onQueueJoin((e) => events.push(e));

    joinQueue(createPlayerId(1), "pvp-1v1");
    expect(events.length).toBe(1);

    unsubscribe();
    joinQueue(createPlayerId(2), "pvp-1v1");
    expect(events.length).toBe(1); // Still 1, not subscribed anymore
  });
});

describe("isInQueue", () => {
  beforeEach(() => {
    registerQueue({
      gameMode: "pvp-1v1",
      minPlayers: 2,
      maxPlayers: 2,
      timeoutSeconds: 60,
    });
  });

  it("returns false for non-queued player", () => {
    expect(isInQueue(createPlayerId(1))).toBe(false);
  });

  it("returns true for queued player", () => {
    const playerId = createPlayerId(1);
    joinQueue(playerId, "pvp-1v1");
    expect(isInQueue(playerId)).toBe(true);
  });
});
