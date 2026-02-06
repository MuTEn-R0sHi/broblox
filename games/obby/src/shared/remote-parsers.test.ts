import { describe, expect, it } from "vitest";
import { createRemoteParsers } from "./remote-parsers";

const parsers = createRemoteParsers({
  isTable: (v): v is Record<string, unknown> => typeof v === "object" && v !== null,
  isArray: (v): v is unknown[] => Array.isArray(v),
  isNumber: (v): v is number => typeof v === "number",
  isString: (v): v is string => typeof v === "string",
  isBoolean: (v): v is boolean => typeof v === "boolean",
});

describe("remote-parsers", () => {
  it("parses valid PlayerDataSync payload", () => {
    const parsed = parsers.parsePlayerDataSyncPayload({
      coins: 10,
      currentStage: 2,
      currentCheckpoint: 5,
    });

    expect(parsed).toEqual({
      coins: 10,
      currentStage: 2,
      currentCheckpoint: 5,
    });
  });

  it("rejects invalid PlayerDataSync payload", () => {
    expect(parsers.parsePlayerDataSyncPayload({ coins: 10, currentStage: 2 })).toBeUndefined();
    expect(parsers.parsePlayerDataSyncPayload(null)).toBeUndefined();
  });

  it("parses valid leaderboard entry", () => {
    const entry = parsers.parseLeaderboardEntryDto({
      userId: 123,
      playerName: "Alice",
      completions: 4,
      bestTime: 12.34,
      rank: 1,
    });

    expect(entry).toEqual({
      userId: 123,
      playerName: "Alice",
      completions: 4,
      bestTime: 12.34,
      rank: 1,
    });
  });

  it("rejects invalid leaderboard entry", () => {
    expect(
      parsers.parseLeaderboardEntryDto({
        playerName: "Alice",
        completions: 4,
        rank: 1,
      })
    ).toBeUndefined();

    expect(
      parsers.parseLeaderboardEntryDto({
        userId: 123,
        playerName: "Alice",
        completions: 4,
        bestTime: "nope",
        rank: 1,
      })
    ).toBeUndefined();
  });

  it("parses leaderboard payload and drops invalid entries", () => {
    const payload = parsers.parseLeaderboardUpdatePayload({
      updatedAt: 1000,
      entries: [
        {
          userId: 123,
          playerName: "Alice",
          completions: 4,
          bestTime: 12.34,
          rank: 1,
        },
        {
          // invalid: missing userId
          playerName: "Bob",
          completions: 1,
          rank: 2,
        },
      ],
    });

    expect(payload).toEqual({
      updatedAt: 1000,
      entries: [
        {
          userId: 123,
          playerName: "Alice",
          completions: 4,
          bestTime: 12.34,
          rank: 1,
        },
      ],
    });
  });

  it("rejects invalid leaderboard payload", () => {
    expect(
      parsers.parseLeaderboardUpdatePayload({ updatedAt: "nope", entries: [] })
    ).toBeUndefined();
    expect(parsers.parseLeaderboardUpdatePayload({ updatedAt: 1000, entries: {} })).toBeUndefined();
  });

  it("parses refresh status payload", () => {
    expect(parsers.parseLeaderboardRefreshStatusPayload({ ok: true })).toEqual({ ok: true });
    expect(parsers.parseLeaderboardRefreshStatusPayload({ ok: false, retryAfter: 0.5 })).toEqual({
      ok: false,
      retryAfter: 0.5,
    });
  });

  it("rejects invalid refresh status payload", () => {
    expect(parsers.parseLeaderboardRefreshStatusPayload({ ok: "yes" })).toBeUndefined();
    expect(
      parsers.parseLeaderboardRefreshStatusPayload({ ok: false, retryAfter: "soon" })
    ).toBeUndefined();
  });
});
