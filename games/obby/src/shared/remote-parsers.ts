/**
 * Remote payload parsers
 *
 * These functions validate untyped RemoteEvent payloads at runtime.
 * They are written to work in both Roblox-TS (Luau runtime) and in Node-based unit tests.
 */

import { LeaderboardEntryDto, LeaderboardUpdatePayload } from "./types";
import { LeaderboardRefreshStatusPayload } from "./types";

type RuntimeGuards = {
  isTable: (value: unknown) => value is Record<string, unknown>;
  isArray: (value: unknown) => value is unknown[];
  isNumber: (value: unknown) => value is number;
  isString: (value: unknown) => value is string;
  isBoolean: (value: unknown) => value is boolean;
};

export function createRemoteParsers(guards: RuntimeGuards) {
  const parsePlayerDataSyncPayload = (data: unknown): PlayerDataSyncPayload | undefined => {
    if (!guards.isTable(data)) return undefined;
    const raw = data as {
      coins?: unknown;
      currentStage?: unknown;
      currentCheckpoint?: unknown;
    };

    if (!guards.isNumber(raw.coins)) return undefined;
    if (!guards.isNumber(raw.currentStage)) return undefined;
    if (!guards.isNumber(raw.currentCheckpoint)) return undefined;

    return {
      coins: raw.coins,
      currentStage: raw.currentStage,
      currentCheckpoint: raw.currentCheckpoint,
    };
  };

  const parseLeaderboardEntryDto = (data: unknown): LeaderboardEntryDto | undefined => {
    if (!guards.isTable(data)) return undefined;

    const raw = data as {
      userId?: unknown;
      playerName?: unknown;
      completions?: unknown;
      bestTime?: unknown;
      rank?: unknown;
    };

    if (!guards.isNumber(raw.userId)) return undefined;
    if (!guards.isString(raw.playerName)) return undefined;
    if (!guards.isNumber(raw.completions)) return undefined;
    if (!guards.isNumber(raw.rank)) return undefined;
    if (raw.bestTime !== undefined && !guards.isNumber(raw.bestTime)) return undefined;

    return {
      userId: raw.userId,
      playerName: raw.playerName,
      completions: raw.completions,
      bestTime: raw.bestTime as number | undefined,
      rank: raw.rank,
    };
  };

  const parseLeaderboardUpdatePayload = (data: unknown): LeaderboardUpdatePayload | undefined => {
    if (!guards.isTable(data)) return undefined;

    const raw = data as {
      updatedAt?: unknown;
      entries?: unknown;
    };

    if (!guards.isNumber(raw.updatedAt)) return undefined;
    if (!guards.isArray(raw.entries)) return undefined;

    const entriesOut: LeaderboardEntryDto[] = [];
    for (const entry of raw.entries as unknown[]) {
      const parsed = parseLeaderboardEntryDto(entry);
      if (parsed) entriesOut.push(parsed);
    }

    return {
      updatedAt: raw.updatedAt,
      entries: entriesOut,
    };
  };

  const parseLeaderboardRefreshStatusPayload = (
    data: unknown
  ): LeaderboardRefreshStatusPayload | undefined => {
    if (!guards.isTable(data)) return undefined;

    const raw = data as { ok?: unknown; retryAfter?: unknown };
    if (!guards.isBoolean(raw.ok)) return undefined;
    if (raw.retryAfter !== undefined && !guards.isNumber(raw.retryAfter)) return undefined;

    return {
      ok: raw.ok,
      retryAfter: raw.retryAfter as number | undefined,
    };
  };

  return {
    parsePlayerDataSyncPayload,
    parseLeaderboardEntryDto,
    parseLeaderboardUpdatePayload,
    parseLeaderboardRefreshStatusPayload,
  };
}

// Roblox runtime wrappers (use Roblox globals).
// These identifiers exist in Luau; in Node tests we avoid calling them.
declare function typeIs(value: unknown, type: string): boolean;

const robloxGuards: RuntimeGuards = {
  isTable: (v): v is Record<string, unknown> => typeIs(v, "table"),
  isArray: (v): v is unknown[] => typeIs(v, "table"),
  isNumber: (v): v is number => typeIs(v, "number"),
  isString: (v): v is string => typeIs(v, "string"),
  isBoolean: (v): v is boolean => typeIs(v, "boolean"),
};

const robloxParsers = createRemoteParsers(robloxGuards);

export type PlayerDataSyncPayload = {
  coins: number;
  currentStage: number;
  currentCheckpoint: number;
};

export const parsePlayerDataSyncPayload = robloxParsers.parsePlayerDataSyncPayload;
export const parseLeaderboardEntryDto = robloxParsers.parseLeaderboardEntryDto;
export const parseLeaderboardUpdatePayload = robloxParsers.parseLeaderboardUpdatePayload;
export const parseLeaderboardRefreshStatusPayload =
  robloxParsers.parseLeaderboardRefreshStatusPayload;
