/**
 * Unit tests for match lifecycle management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createPlayerId, createMatchId } from "@rbx/testing";
import {
  registerMatch,
  getMatch,
  getPlayerMatch,
  isInMatch,
  getActiveMatches,
  playerReady,
  isPlayerReady,
  getReadyStatus,
  transitionToStarting,
  startMatch,
  endMatch,
  cancelMatch,
  removePlayerFromMatch,
  onMatchStatusChanged,
  onPlayerReady,
  onAllPlayersReady,
  onMatchStarted,
  onMatchEnded,
  resetMatches,
} from "./match";
import type {
  Match,
  MatchStatusChangedEvent,
  PlayerReadyEvent,
  MatchStartedEvent,
  MatchEndedEvent,
} from "./types";

// Mock Roblox globals
beforeEach(() => {
  mockRobloxGlobals();
  resetMatches();
});

// Helper to create a test match
function createTestMatch(overrides?: Partial<Match>): Match {
  return {
    matchId: createMatchId("test-match-1"),
    gameMode: "pvp-1v1",
    players: [createPlayerId(1), createPlayerId(2)],
    status: "forming",
    createdAt: 1000,
    ...overrides,
  };
}

describe("Match Registration", () => {
  it("registers a match", () => {
    const match = createTestMatch();
    registerMatch(match);

    expect(getMatch(match.matchId)).toEqual(match);
  });

  it("maps players to their match", () => {
    const match = createTestMatch();
    registerMatch(match);

    expect(getPlayerMatch(createPlayerId(1))).toEqual(match);
    expect(getPlayerMatch(createPlayerId(2))).toEqual(match);
  });

  it("returns undefined for unknown match ID", () => {
    expect(getMatch(createMatchId("unknown"))).toBeUndefined();
  });

  it("returns undefined for player not in match", () => {
    expect(getPlayerMatch(createPlayerId(999))).toBeUndefined();
  });
});

describe("isInMatch", () => {
  it("returns false for player not in match", () => {
    expect(isInMatch(createPlayerId(1))).toBe(false);
  });

  it("returns true for player in match", () => {
    const match = createTestMatch();
    registerMatch(match);

    expect(isInMatch(createPlayerId(1))).toBe(true);
    expect(isInMatch(createPlayerId(2))).toBe(true);
  });
});

describe("getActiveMatches", () => {
  it("returns empty array when no matches", () => {
    expect(getActiveMatches()).toEqual([]);
  });

  it("returns forming matches", () => {
    const match = createTestMatch({ status: "forming" });
    registerMatch(match);

    expect(getActiveMatches()).toHaveLength(1);
  });

  it("returns starting matches", () => {
    const match = createTestMatch({ status: "starting" });
    registerMatch(match);

    expect(getActiveMatches()).toHaveLength(1);
  });

  it("returns active matches", () => {
    const match = createTestMatch({ status: "active" });
    registerMatch(match);

    expect(getActiveMatches()).toHaveLength(1);
  });

  it("excludes ended matches", () => {
    const match = createTestMatch({ status: "ended" });
    registerMatch(match);

    expect(getActiveMatches()).toHaveLength(0);
  });

  it("excludes cancelled matches", () => {
    const match = createTestMatch({ status: "cancelled" });
    registerMatch(match);

    expect(getActiveMatches()).toHaveLength(0);
  });
});

describe("Ready-Up System", () => {
  it("allows player to ready up", () => {
    const match = createTestMatch();
    registerMatch(match);

    const result = playerReady(createPlayerId(1));
    expect(result.ok).toBe(true);
    expect(result.value?.allReady).toBe(false);
  });

  it("detects when all players are ready", () => {
    const match = createTestMatch();
    registerMatch(match);

    playerReady(createPlayerId(1));
    const result = playerReady(createPlayerId(2));

    expect(result.ok).toBe(true);
    expect(result.value?.allReady).toBe(true);
  });

  it("rejects ready when player not in match", () => {
    const result = playerReady(createPlayerId(999));
    expect(result.ok).toBe(false);
  });

  it("rejects ready when match not in forming state", () => {
    const match = createTestMatch({ status: "active" });
    registerMatch(match);

    const result = playerReady(createPlayerId(1));
    expect(result.ok).toBe(false);
  });

  it("tracks player ready status", () => {
    const match = createTestMatch();
    registerMatch(match);

    expect(isPlayerReady(createPlayerId(1))).toBe(false);

    playerReady(createPlayerId(1));

    expect(isPlayerReady(createPlayerId(1))).toBe(true);
    expect(isPlayerReady(createPlayerId(2))).toBe(false);
  });

  it("returns ready status for match", () => {
    const match = createTestMatch();
    registerMatch(match);

    expect(getReadyStatus(match.matchId)).toEqual({ ready: 0, total: 2 });

    playerReady(createPlayerId(1));

    expect(getReadyStatus(match.matchId)).toEqual({ ready: 1, total: 2 });
  });

  it("returns undefined for unknown match", () => {
    expect(getReadyStatus(createMatchId("unknown"))).toBeUndefined();
  });
});

describe("Match State Transitions", () => {
  describe("transitionToStarting", () => {
    it("transitions from forming to starting", () => {
      const match = createTestMatch({ status: "forming" });
      registerMatch(match);

      const result = transitionToStarting(match.matchId);

      expect(result.ok).toBe(true);
      expect(result.value?.status).toBe("starting");
    });

    it("rejects transition from non-forming state", () => {
      const match = createTestMatch({ status: "active" });
      registerMatch(match);

      const result = transitionToStarting(match.matchId);

      expect(result.ok).toBe(false);
    });

    it("rejects unknown match", () => {
      const result = transitionToStarting(createMatchId("unknown"));
      expect(result.ok).toBe(false);
    });
  });

  describe("startMatch", () => {
    it("transitions from starting to active", () => {
      const match = createTestMatch({ status: "starting" });
      registerMatch(match);

      const result = startMatch(match.matchId);

      expect(result.ok).toBe(true);
      expect(result.value?.status).toBe("active");
      expect(result.value?.startedAt).toBeDefined();
    });

    it("rejects start from non-starting state", () => {
      const match = createTestMatch({ status: "forming" });
      registerMatch(match);

      const result = startMatch(match.matchId);

      expect(result.ok).toBe(false);
    });
  });

  describe("endMatch", () => {
    it("transitions from active to ended", () => {
      const match = createTestMatch({ status: "active", startedAt: 1000 });
      registerMatch(match);

      const result = endMatch(match.matchId);

      expect(result.ok).toBe(true);
      expect(result.value?.status).toBe("ended");
      expect(result.value?.endedAt).toBeDefined();
    });

    it("rejects end from non-active state", () => {
      const match = createTestMatch({ status: "forming" });
      registerMatch(match);

      const result = endMatch(match.matchId);

      expect(result.ok).toBe(false);
    });

    it("cleans up player mappings", () => {
      const match = createTestMatch({ status: "active", startedAt: 1000 });
      registerMatch(match);

      endMatch(match.matchId);

      expect(isInMatch(createPlayerId(1))).toBe(false);
      expect(isInMatch(createPlayerId(2))).toBe(false);
    });
  });

  describe("cancelMatch", () => {
    it("cancels a forming match", () => {
      const match = createTestMatch({ status: "forming" });
      registerMatch(match);

      const result = cancelMatch(match.matchId, "timeout");

      expect(result.ok).toBe(true);
      expect(result.value?.status).toBe("cancelled");
    });

    it("cancels an active match", () => {
      const match = createTestMatch({ status: "active", startedAt: 1000 });
      registerMatch(match);

      const result = cancelMatch(match.matchId, "player_left");

      expect(result.ok).toBe(true);
      expect(result.value?.status).toBe("cancelled");
    });

    it("rejects cancel of already ended match", () => {
      const match = createTestMatch({ status: "ended" });
      registerMatch(match);

      const result = cancelMatch(match.matchId);

      expect(result.ok).toBe(false);
    });
  });
});

describe("removePlayerFromMatch", () => {
  it("removes player from match", () => {
    const match = createTestMatch();
    registerMatch(match);

    const result = removePlayerFromMatch(createPlayerId(1), 1);

    expect(result.ok).toBe(true);
    expect(result.value?.matchCancelled).toBe(false);
    expect(isInMatch(createPlayerId(1))).toBe(false);
  });

  it("cancels match when below minimum players", () => {
    const match = createTestMatch();
    registerMatch(match);

    const result = removePlayerFromMatch(createPlayerId(1), 2);

    expect(result.ok).toBe(true);
    expect(result.value?.matchCancelled).toBe(true);
  });

  it("rejects removal of player not in match", () => {
    const result = removePlayerFromMatch(createPlayerId(999));

    expect(result.ok).toBe(false);
  });

  it("clears player ready status", () => {
    const match = createTestMatch();
    registerMatch(match);
    playerReady(createPlayerId(1));

    expect(isPlayerReady(createPlayerId(1))).toBe(true);

    removePlayerFromMatch(createPlayerId(1), 1);

    expect(isPlayerReady(createPlayerId(1))).toBe(false);
  });
});

describe("Event Listeners", () => {
  it("emits status changed event", () => {
    const events: MatchStatusChangedEvent[] = [];
    onMatchStatusChanged((e) => events.push(e));

    const match = createTestMatch({ status: "forming" });
    registerMatch(match);
    transitionToStarting(match.matchId);

    expect(events).toHaveLength(1);
    expect(events[0].previousStatus).toBe("forming");
    expect(events[0].newStatus).toBe("starting");
  });

  it("emits player ready event", () => {
    const events: PlayerReadyEvent[] = [];
    onPlayerReady((e) => events.push(e));

    const match = createTestMatch();
    registerMatch(match);
    playerReady(createPlayerId(1));

    expect(events).toHaveLength(1);
    expect(events[0].playerId).toBe(createPlayerId(1));
    expect(events[0].readyCount).toBe(1);
    expect(events[0].totalPlayers).toBe(2);
  });

  it("emits all players ready event", () => {
    const events: { matchId: unknown; players: unknown[] }[] = [];
    onAllPlayersReady((e) => events.push(e));

    const match = createTestMatch();
    registerMatch(match);
    playerReady(createPlayerId(1));
    playerReady(createPlayerId(2));

    expect(events).toHaveLength(1);
    expect(events[0].players).toHaveLength(2);
  });

  it("emits match started event", () => {
    const events: MatchStartedEvent[] = [];
    onMatchStarted((e) => events.push(e));

    const match = createTestMatch({ status: "starting" });
    registerMatch(match);
    startMatch(match.matchId);

    expect(events).toHaveLength(1);
    expect(events[0].gameMode).toBe("pvp-1v1");
  });

  it("emits match ended event", () => {
    const events: MatchEndedEvent[] = [];
    onMatchEnded((e) => events.push(e));

    const match = createTestMatch({ status: "active", startedAt: 1000 });
    registerMatch(match);
    endMatch(match.matchId);

    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe("completed");
  });

  it("emits cancelled reason on cancel", () => {
    const events: MatchEndedEvent[] = [];
    onMatchEnded((e) => events.push(e));

    const match = createTestMatch({ status: "active", startedAt: 1000 });
    registerMatch(match);
    cancelMatch(match.matchId, "player_left");

    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe("player_left");
  });

  it("allows unsubscribing from events", () => {
    const events: MatchStatusChangedEvent[] = [];
    const unsubscribe = onMatchStatusChanged((e) => events.push(e));

    const match1 = createTestMatch({ matchId: createMatchId("m1"), status: "forming" });
    registerMatch(match1);
    transitionToStarting(match1.matchId);

    expect(events).toHaveLength(1);

    unsubscribe();

    const match2 = createTestMatch({
      matchId: createMatchId("m2"),
      status: "forming",
      players: [createPlayerId(3), createPlayerId(4)],
    });
    registerMatch(match2);
    transitionToStarting(match2.matchId);

    expect(events).toHaveLength(1); // Still 1
  });
});

describe("Full Match Lifecycle", () => {
  it("completes full lifecycle: forming → starting → active → ended", () => {
    const match = createTestMatch();
    registerMatch(match);

    // Players ready up
    playerReady(createPlayerId(1));
    const readyResult = playerReady(createPlayerId(2));
    expect(readyResult.value?.allReady).toBe(true);

    // Transition to starting
    transitionToStarting(match.matchId);
    expect(getMatch(match.matchId)?.status).toBe("starting");

    // Start match
    startMatch(match.matchId);
    expect(getMatch(match.matchId)?.status).toBe("active");

    // End match
    endMatch(match.matchId);
    expect(getMatch(match.matchId)?.status).toBe("ended");

    // Players are no longer in match
    expect(isInMatch(createPlayerId(1))).toBe(false);
    expect(isInMatch(createPlayerId(2))).toBe(false);
  });

  it("handles cancellation at any stage", () => {
    const match = createTestMatch({ status: "forming" });
    registerMatch(match);

    cancelMatch(match.matchId, "timeout");

    expect(getMatch(match.matchId)?.status).toBe("cancelled");
    expect(isInMatch(createPlayerId(1))).toBe(false);
  });
});
