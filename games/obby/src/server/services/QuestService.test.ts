/**
 * QuestService Tests (Obby)
 *
 * Tests the quest-completed remote firing performed by the game-level
 * QuestService config callback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("QuestService (obby)", () => {
  // Captured config callback, set by the mocked createQuestService
  let capturedOnQuestCompleted:
    | ((event: { playerId: number; questId: string; rewards: unknown[] }) => void)
    | undefined;

  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayers: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayer: { UserId: number; Name: string };

  beforeEach(() => {
    vi.resetModules();

    capturedOnQuestCompleted = undefined;
    mockPlayer = { UserId: 42, Name: "TestPlayer" };
    mockRegistry = { fireClient: vi.fn() };

    mockHandle = {
      Service: { name: "QuestService", onInit: vi.fn(), onStart: vi.fn(), onDestroy: vi.fn() },
      getQuestRegistry: vi.fn(),
      getQuestStore: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    mockPlayers = {
      GetPlayerByUserId: vi.fn(() => mockPlayer),
    };

    vi.doMock("@rbx/quests", () => ({
      createQuestService: vi.fn((config: Record<string, unknown>) => {
        capturedOnQuestCompleted = config["onQuestCompleted"] as typeof capturedOnQuestCompleted;
        return mockHandle;
      }),
    }));

    vi.doMock("@rbxts/services", () => ({ Players: mockPlayers }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerAdded: vi.fn(), onPlayerRemoving: vi.fn() },
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));
  });

  async function loadService() {
    return import("./QuestService");
  }

  it("exports QuestService, getQuestRegistry, getQuests, and cleanupPlayerQuests", async () => {
    const mod = await loadService();
    expect(mod.QuestService).toBe(mockHandle.Service);
    expect(typeof mod.getQuestRegistry).toBe("function");
    expect(typeof mod.getQuests).toBe("function");
    expect(typeof mod.cleanupPlayerQuests).toBe("function");
  });

  describe("onQuestCompleted callback", () => {
    const fakeEvent = {
      playerId: 42,
      questId: "daily_stages_5",
      rewards: [
        { type: "xp", amount: 300 },
        { type: "currency", amount: 75 },
      ],
    };

    it("fires QuestCompleted remote with correct payload", async () => {
      await loadService();
      capturedOnQuestCompleted!(fakeEvent);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(42);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("QuestCompleted", mockPlayer, {
        questId: "daily_stages_5",
        rewards: fakeEvent.rewards,
      });
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnQuestCompleted!(fakeEvent);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("passes full rewards array through to the remote payload", async () => {
      await loadService();
      const eventWithItem = {
        ...fakeEvent,
        rewards: [{ type: "item", amount: 1, itemId: "skip_stage" }],
      };
      capturedOnQuestCompleted!(eventWithItem);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "QuestCompleted",
        mockPlayer,
        expect.objectContaining({ rewards: eventWithItem.rewards })
      );
    });
  });
});
