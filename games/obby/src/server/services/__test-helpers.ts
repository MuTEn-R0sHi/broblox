/**
 * Shared test helpers for the obby game service tests.
 *
 * Centralises the `Player` stub type, `makePlayer()`, and `makeDefaultData()`
 * so every test file reuses the same definitions.
 */

import { vi } from "vitest";

// ── Player type stub ───────────────────────────────────────────────────────
// Full type lives in `@rbxts/types` (excluded from test tsconfigs).

export interface Player {
  Name: string;
  UserId: number;
  Character?: { FindFirstChild(name: string): unknown };
}

// ── Player factory ─────────────────────────────────────────────────────────

interface MakePlayerOverrides {
  Name?: string;
  UserId?: number;
  /** Pass `undefined` explicitly to create a character-less player. */
  Character?: unknown;
}

/**
 * Creates a mock Player.
 *
 * By default the player has a `Character` with `HumanoidRootPart` and
 * `Humanoid` stubs.  Pass `{ Character: undefined }` to create a
 * character-less player.
 */
export function makePlayer(overrides: MakePlayerOverrides = {}): Player {
  const humanoidRootPart = {
    AssemblyLinearVelocity: { X: 0, Y: 0, Z: 0 },
    CFrame: {},
  };
  const character = {
    FindFirstChild: vi.fn((name: string) =>
      name === "HumanoidRootPart" ? humanoidRootPart : undefined
    ),
    FindFirstChildOfClass: vi.fn(() => ({ Health: 100, MaxHealth: 100 })),
  };
  return {
    Name: overrides.Name ?? "TestPlayer",
    UserId: overrides.UserId ?? 42,
    Character: "Character" in overrides ? overrides.Character : character,
  } as unknown as Player;
}

// ── Default data factory ───────────────────────────────────────────────────

/**
 * Creates a default `ObbyPlayerData` object, optionally overriding fields.
 */
export function makeDefaultData(overrides: Record<string, unknown> = {}) {
  return {
    __version: 1,
    currentCheckpoint: 0,
    currentStage: 1,
    coins: 0,
    totalDeaths: 0,
    totalCompletions: 0,
    bestFullRunTime: undefined,
    stageProgress: {},
    unlockedItems: [],
    equippedTrail: undefined,
    lastPlayedAt: 0,
    ...overrides,
  };
}
