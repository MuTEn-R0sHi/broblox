/**
 * QuestService Tests (Starter)
 *
 * Tests that the quest-completed Notification remote is fired correctly
 * via the game-level QuestService config callback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("QuestService (starter)", () => {
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
    mockPlayer = { UserId: 7, Name: "StarterPlayer" };
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
      playerId: 7,
      questId: "daily_kill_10",
      rewards: [
        { type: "xp", amount: 500 },
        { type: "currency", amount: 100 },
      ],
    };

    it("fires Notification remote with type quest_completed", async () => {
      await loadService();
      capturedOnQuestCompleted!(fakeEvent);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(7);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("Notification", mockPlayer, {
        type: "quest_completed",
        message: "Quest completed!",
        data: { questId: "daily_kill_10", rewards: fakeEvent.rewards },
      });
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnQuestCompleted!(fakeEvent);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("includes the full rewards array in the notification data", async () => {
      await loadService();
      const eventWithItem = {
        ...fakeEvent,
        rewards: [
          { type: "xp", amount: 2500 },
          { type: "currency", amount: 500 },
          { type: "item", amount: 1, itemId: "health_potion" },
        ],
      };
      capturedOnQuestCompleted!(eventWithItem);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "Notification",
        mockPlayer,
        expect.objectContaining({
          data: expect.objectContaining({ rewards: eventWithItem.rewards }),
        })
      );
    });
  });
});
