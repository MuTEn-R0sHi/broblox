/**
 * QuestService Tests (Test Park)
 *
 * Tests that the quest-completed Notification remote is fired correctly
 * via the game-level QuestService config callback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("QuestService (test-park)", () => {
  let capturedOnQuestCompleted:
    | ((event: { playerId: number; questId: string; rewards: unknown[] }) => void)
    | undefined;
  let capturedOnPlayerRemoving: ((cb: unknown) => void) | undefined;
  let capturedOnPlayerAdded: ((cb: unknown) => void) | undefined;

  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayers: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayer: { UserId: number; Name: string };

  beforeEach(() => {
    vi.resetModules();

    capturedOnQuestCompleted = undefined;
    capturedOnPlayerRemoving = undefined;
    capturedOnPlayerAdded = undefined;
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

    vi.doMock("@broblox/quests", () => ({
      createQuestService: vi.fn((config: Record<string, unknown>) => {
        capturedOnQuestCompleted = config["onQuestCompleted"] as typeof capturedOnQuestCompleted;
        capturedOnPlayerRemoving = config["onPlayerRemoving"] as typeof capturedOnPlayerRemoving;
        capturedOnPlayerAdded = config["onPlayerAdded"] as typeof capturedOnPlayerAdded;
        return mockHandle;
      }),
    }));

    vi.doMock("@rbxts/services", () => ({ Players: mockPlayers }));

    mockPlayerLifecycle = { onPlayerAdded: vi.fn(), onPlayerRemoving: vi.fn() };
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
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

  describe("getter delegation", () => {
    it("getQuestRegistry delegates to handle", async () => {
      const mod = await loadService();
      mod.getQuestRegistry();
      expect(mockHandle.getQuestRegistry).toHaveBeenCalled();
    });

    it("getQuests delegates to handle.getQuestStore", async () => {
      const mod = await loadService();
      mod.getQuests(42);
      expect(mockHandle.getQuestStore).toHaveBeenCalledWith(42);
    });

    it("cleanupPlayerQuests delegates to handle.cleanupPlayer", async () => {
      const mod = await loadService();
      mod.cleanupPlayerQuests(42);
      expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
    });
  });

  describe("lifecycle config callbacks", () => {
    it("onPlayerRemoving delegates to PlayerLifecycleService", async () => {
      await loadService();
      const dummyCb = vi.fn();
      capturedOnPlayerRemoving!(dummyCb);
      expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalledWith(dummyCb);
    });

    it("onPlayerAdded delegates to PlayerLifecycleService", async () => {
      await loadService();
      const dummyCb = vi.fn();
      capturedOnPlayerAdded!(dummyCb);
      expect(mockPlayerLifecycle.onPlayerAdded).toHaveBeenCalledWith(dummyCb);
    });
  });
});
