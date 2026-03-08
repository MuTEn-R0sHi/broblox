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
 * Creates a default `ObbyPlayerData` object (v2), optionally overriding fields.
 *
 * For backwards-compatibility with existing tests, top-level `currentStage`,
 * `currentCheckpoint`, `bestFullRunTime`, and `stageProgress` overrides are
 * routed into the grasslands world entry.
 */
export function makeDefaultData(overrides: Record<string, unknown> = {}) {
  // Pull world-scoped fields out of overrides so they end up in the right place
  const { currentStage, currentCheckpoint, bestFullRunTime, stageProgress, ...rest } = overrides;

  return {
    __version: 2,
    attributes: { speed: 10, jump: 30, stamina: 5 },
    trainingReps: { speed: 0, jump: 0, stamina: 0 },
    coins: 0,
    worlds: {
      grasslands: {
        currentStage: (currentStage as number) ?? 1,
        currentCheckpoint: (currentCheckpoint as number) ?? 0,
        completions: 0,
        bestFullRunTime: bestFullRunTime ?? undefined,
        stageProgress: stageProgress ?? {},
      },
    },
    inventory: [],
    equipped: {},
    totalDeaths: 0,
    totalCompletions: 0,
    unlockedItems: [],
    equippedTrail: undefined,
    lastPlayedAt: 0,
    ...rest,
  };
}

/**
 * Get world progress helper for tests — mirrors DataService.getWorldProgress.
 */
export function getWorldProgress(data: ReturnType<typeof makeDefaultData>, worldId: string) {
  const worlds = data.worlds as Record<string, Record<string, unknown>>;
  return worlds[worldId];
}
