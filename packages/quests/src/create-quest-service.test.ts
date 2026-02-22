/**
 * Tests for createQuestService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createQuestService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;
  let capturedQuestCompletedHandler: ((e: unknown) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    capturedQuestCompletedHandler = undefined;

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 3),
    };
    mockStore = {
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
      onQuestCompleted: vi.fn((cb: (e: unknown) => void) => {
        capturedQuestCompletedHandler = cb;
      }),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./quest-registry", () => ({
      QuestRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./quest-store", () => ({
      QuestStore: function () {
        return mockStore;
      },
    }));
  });

  async function createService(overrides?: Partial<{ maxActiveQuests: number }>) {
    const mod = await import("./create-quest-service");
    return mod.createQuestService({
      quests: [{ id: "q1" }, { id: "q2" }, { id: "q3" }] as never[],
      datastoreName: "TestQuests",
      ...overrides,
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("QuestService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers quests on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.register).toHaveBeenCalledTimes(3);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("3 quests"));
  });

  it("initPlayer creates store with default maxActiveQuests", async () => {
    const handle = await createService();
    handle.initPlayer(42);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("initPlayer applies custom maxActiveQuests", async () => {
    const handle = await createService({ maxActiveQuests: 5 });
    handle.initPlayer(1);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("getQuestStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getQuestStore(999)).toBeUndefined();
  });

  it("getQuestStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getQuestStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getQuestStore(1)).toBeUndefined();
  });

  it("cleanupPlayer skips save for clean store", async () => {
    mockStore.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).not.toHaveBeenCalled();
  });

  it("onDestroy saves dirty stores", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockStore.save).toHaveBeenCalled();
  });

  it("exposes getQuestRegistry", async () => {
    const handle = await createService();
    expect(handle.getQuestRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-quest-service");
    const h1 = mod.createQuestService({ quests: [], datastoreName: "A" });
    const h2 = mod.createQuestService({ quests: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });

  describe("onQuestCompleted config callback", () => {
    it("wires onQuestCompleted to store event on initPlayer", async () => {
      const onQuestCompleted = vi.fn();
      const mod = await import("./create-quest-service");
      const handle = mod.createQuestService({
        quests: [],
        datastoreName: "TestQuests",
        onQuestCompleted,
      });
      handle.initPlayer(42);

      expect(mockStore.onQuestCompleted).toHaveBeenCalled();
    });

    it("invokes onQuestCompleted with the full event when store fires", async () => {
      const onQuestCompleted = vi.fn();
      const mod = await import("./create-quest-service");
      const handle = mod.createQuestService({
        quests: [],
        datastoreName: "TestQuests",
        onQuestCompleted,
      });
      handle.initPlayer(7);

      const fakeEvent = {
        playerId: 7,
        questId: "daily_stages_5",
        rewards: [{ type: "xp", amount: 300 }],
      };
      capturedQuestCompletedHandler!(fakeEvent);

      expect(onQuestCompleted).toHaveBeenCalledWith(fakeEvent);
    });

    it("does not subscribe to store event when onQuestCompleted is not provided", async () => {
      const mod = await import("./create-quest-service");
      const handle = mod.createQuestService({ quests: [], datastoreName: "TestQuests" });
      handle.initPlayer(1);

      expect(mockStore.onQuestCompleted).not.toHaveBeenCalled();
    });
  });
});
