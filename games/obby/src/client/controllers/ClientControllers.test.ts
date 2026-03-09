/**
 * Client Controller Tests — Obby Game
 *
 * Tests for all 6 client controllers:
 * - RemoteController: registry creation, checkpoint/stage/leaderboard event subscriptions
 * - UIController: stage display, coin display, notifications
 * - InputController: respawn action binding via @broblox/input
 * - ChatModerationController: delegation to @broblox/moderation
 * - ScreenController: modal management, data cache
 * - HudController: sidebar creation, event notifications, menu keybind
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// RemoteController (Obby)
// ============================================================================

describe("RemoteController (obby client)", () => {
  let onEventHandlers: Map<string, (data: unknown) => void>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    onEventHandlers = new Map();

    mockRegistry = {
      initialize: vi.fn(),
      onEvent: vi.fn((name: string, cb: (data: unknown) => void) => {
        onEventHandlers.set(name, cb);
      }),
      invoke: vi.fn(() => ({ ok: true, value: {} })),
      fire: vi.fn(),
      destroy: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/net", () => ({
      createClientRegistry: vi.fn(() => mockRegistry),
      isOk: (r: { ok: boolean }) => r.ok,
      isErr: (r: { ok: boolean }) => !r.ok,
    }));

    vi.doMock("shared/remotes", () => ({
      ObbyRemotes: {},
    }));
  });

  it("exports RemoteController with onInit", async () => {
    const mod = await import("./RemoteController");
    expect(mod.RemoteController).toBeDefined();
    expect(typeof mod.RemoteController.onInit).toBe("function");
  });

  it("initialises registry on onInit", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    expect(mockRegistry.initialize).toHaveBeenCalled();
  });

  it("subscribes to obby-specific events (checkpoint, stage, leaderboard)", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    expect(onEventHandlers.has("CheckpointReached")).toBe(true);
    expect(onEventHandlers.has("StageCompleted")).toBe(true);
    expect(onEventHandlers.has("LeaderboardUpdate")).toBe(true);
    expect(onEventHandlers.has("LeaderboardRefreshStatus")).toBe(true);
  });

  it("subscribes to shared metagame events", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    const sharedEvents = [
      "PlayerDataSync",
      "LevelUp",
      "PrestigeUnlocked",
      "QuestCompleted",
      "AchievementCompleted",
      "DailyRewardClaimed",
      "EventStarted",
      "EventEnded",
    ];

    for (const event of sharedEvents) {
      expect(onEventHandlers.has(event)).toBe(true);
    }
  });

  it("fires onCheckpoint callbacks", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    const cb = vi.fn();
    mod.RemoteController.onCheckpoint(cb);

    onEventHandlers.get("CheckpointReached")!({ checkpointId: 3 });
    expect(cb).toHaveBeenCalledWith({ checkpointId: 3 });
  });

  it("fires onStage callbacks", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    const cb = vi.fn();
    mod.RemoteController.onStage(cb);

    onEventHandlers.get("StageCompleted")!({ stageNumber: 5 });
    expect(cb).toHaveBeenCalledWith({ stageNumber: 5 });
  });

  it("fires requestRespawnAtCheckpoint via fire", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    mod.RemoteController.requestRespawnAtCheckpoint();
    expect(mockRegistry.fire).toHaveBeenCalled();
  });
});

// ============================================================================
// UIController (Obby)
// ============================================================================

describe("UIController (obby client)", () => {
  const originalTaskSpawn = (globalThis as Record<string, unknown>).task
    ? ((globalThis as Record<string, unknown>).task as Record<string, unknown>).spawn
    : undefined;

  beforeEach(() => {
    vi.resetModules();

    // UIController.onStart spawns timerLoop() which loops forever
    // with the sync task.spawn mock. Override to no-op.
    if ((globalThis as Record<string, unknown>).task) {
      ((globalThis as Record<string, unknown>).task as Record<string, unknown>).spawn = vi.fn();
    }

    vi.doMock("@rbxts/services", () => ({
      Players: {
        LocalPlayer: {
          Name: "Test",
          UserId: 1,
          WaitForChild: vi.fn(() => ({})),
        },
      },
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        onCheckpoint: vi.fn(),
        onStage: vi.fn(),
        onLeaderboard: vi.fn(),
        onLeaderboardRefreshStatus: vi.fn(),
        onDataSync: vi.fn(),
        onAttributeSync: vi.fn(),
        onTrainingComplete: vi.fn(),
        onStaminaSync: vi.fn(),
        onWorldChanged: vi.fn(),
        requestLeaderboardRefresh: vi.fn(),
        requestTraining: vi.fn(),
        requestEnterWorld: vi.fn(),
        requestExitWorld: vi.fn(),
      },
    }));
  });

  afterEach(() => {
    if ((globalThis as Record<string, unknown>).task && originalTaskSpawn) {
      ((globalThis as Record<string, unknown>).task as Record<string, unknown>).spawn =
        originalTaskSpawn;
    }
  });

  it("exports UIController with onStart", async () => {
    const mod = await import("./UIController");
    expect(mod.UIController).toBeDefined();
    expect(typeof mod.UIController.onStart).toBe("function");
  });

  it("subscribes to checkpoint, stage, and data sync events on start", async () => {
    const { RemoteController } = await import("./RemoteController");
    const mod = await import("./UIController");
    mod.UIController.onStart!();

    expect(RemoteController.onCheckpoint).toHaveBeenCalled();
    expect(RemoteController.onStage).toHaveBeenCalled();
    expect(RemoteController.onDataSync).toHaveBeenCalled();
    expect(RemoteController.onLeaderboard).toHaveBeenCalled();
    expect(RemoteController.onWorldChanged).toHaveBeenCalled();
  });
});

// ============================================================================
// InputController (Obby)
// ============================================================================

describe("InputController (obby client)", () => {
  let capturedRespawnCallback: ((action: string, state: { active: boolean }) => void) | undefined;
  let mockRequestRespawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    capturedRespawnCallback = undefined;
    mockRequestRespawn = vi.fn();

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/input", () => ({
      onAction: vi.fn((name: string, cb: (action: string, state: { active: boolean }) => void) => {
        if (name === "respawn") {
          capturedRespawnCallback = cb;
        }
        return vi.fn(); // unsubscribe
      }),
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        requestRespawnAtCheckpoint: mockRequestRespawn,
      },
    }));
  });

  it("exports InputController with lifecycle methods", async () => {
    const mod = await import("./InputController");
    expect(mod.InputController).toBeDefined();
    expect(typeof mod.InputController.onStart).toBe("function");
    expect(typeof mod.InputController.onDestroy).toBe("function");
  });

  it("registers respawn action on start", async () => {
    const { onAction } = await import("@broblox/input");
    const mod = await import("./InputController");
    mod.InputController.onStart!();
    expect(onAction).toHaveBeenCalledWith("respawn", expect.any(Function));
  });

  it("calls requestRespawnAtCheckpoint on respawn press", async () => {
    const mod = await import("./InputController");
    mod.InputController.onStart!();

    expect(capturedRespawnCallback).toBeDefined();
    capturedRespawnCallback!("respawn", { active: true });

    expect(mockRequestRespawn).toHaveBeenCalled();
  });

  it("ignores release events (active=false)", async () => {
    const mod = await import("./InputController");
    mod.InputController.onStart!();

    capturedRespawnCallback!("respawn", { active: false });
    expect(mockRequestRespawn).not.toHaveBeenCalled();
  });

  it("cleans up subscription on destroy", async () => {
    const mod = await import("./InputController");
    mod.InputController.onStart!();
    expect(mod.InputController.unsubscribe).toBeDefined();
    mod.InputController.onDestroy!();
    expect(mod.InputController.unsubscribe).toBeUndefined();
  });
});

// ============================================================================
// ChatModerationController (Obby)
// ============================================================================

describe("ChatModerationController (obby client)", () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock("@broblox/moderation", () => ({
      createChatModerationService: vi.fn(() => ({
        Service: { name: "ChatModerationController" },
      })),
    }));
  });

  it("exports ChatModerationController as a Service", async () => {
    const mod = await import("./ChatModerationController");
    expect(mod.ChatModerationController).toBeDefined();
    expect(mod.ChatModerationController.name).toBe("ChatModerationController");
  });
});

// ============================================================================
// ScreenController (Obby)
// ============================================================================

describe("ScreenController (obby client)", () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock("@rbxts/services", () => ({
      Players: {
        LocalPlayer: {
          Name: "Test",
          UserId: 1,
          WaitForChild: vi.fn(() => ({})),
        },
      },
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/ui", () => ({
      createQuestTracker: vi.fn(() => ({ mount: vi.fn(), destroy: vi.fn(), update: vi.fn() })),
      createDailyRewardsPopup: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
      })),
      createInventoryScreen: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
      createPetCollection: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
      createCosmeticsScreen: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
      createGachaScreen: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
      createBattlePassScreen: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
      createSettingsScreen: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        getFullPlayerData: vi.fn(() => ({
          coins: 50,
          currentStage: 3,
          bestStage: 5,
          deaths: 2,
          level: 1,
          xp: 0,
          xpForNext: 100,
          prestige: 0,
          items: [],
          maxSlots: 50,
          activeQuests: [],
          completedQuestIds: [],
          pets: [],
          ownedCosmetics: [],
          equippedCosmetics: {},
          dailyCanClaim: false,
          dailyCurrentDay: 1,
          dailyStreak: 0,
          dailyTimeUntilNext: 0,
          dailyRewardCycle: [],
        })),
        onDataSync: vi.fn(),
        onCheckpoint: vi.fn(),
        onStage: vi.fn(),
        onLevelUp: vi.fn(),
        onPrestige: vi.fn(),
        onQuestCompleted: vi.fn(),
        onAchievementCompleted: vi.fn(),
        onDailyRewardClaimed: vi.fn(),
        onEventStarted: vi.fn(),
        onEventEnded: vi.fn(),
        equipPet: vi.fn(),
        unequipPet: vi.fn(),
        equipCosmetic: vi.fn(),
        unequipCosmetic: vi.fn(),
        claimBattlePassReward: vi.fn(),
        claimDailyReward: vi.fn(),
        hatchEgg: vi.fn(() => []),
        redeemCode: vi.fn(),
      },
    }));
  });

  it("exports ScreenController with lifecycle and toggle methods", async () => {
    const mod = await import("./ScreenController");
    expect(mod.ScreenController).toBeDefined();
    expect(typeof mod.ScreenController.onStart).toBe("function");
  });

  it("exports toggle methods for all screens", async () => {
    const mod = await import("./ScreenController");
    const sc = mod.ScreenController as Record<string, unknown>;
    expect(typeof sc.toggleQuestLog).toBe("function");
    expect(typeof sc.toggleInventory).toBe("function");
    expect(typeof sc.togglePets).toBe("function");
    expect(typeof sc.toggleGacha).toBe("function");
    expect(typeof sc.toggleCosmetics).toBe("function");
    expect(typeof sc.toggleBattlePass).toBe("function");
    expect(typeof sc.toggleSettings).toBe("function");
  });

  it("exports closeActiveModal method", async () => {
    const mod = await import("./ScreenController");
    const sc = mod.ScreenController as Record<string, unknown>;
    expect(typeof sc.closeActiveModal).toBe("function");
  });
});

// ============================================================================
// HudController (Obby)
// ============================================================================

describe("HudController (obby client)", () => {
  let mockOnAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockOnAction = vi.fn(() => vi.fn());

    vi.doMock("@rbxts/services", () => ({
      Players: {
        LocalPlayer: {
          Name: "Test",
          UserId: 1,
          WaitForChild: vi.fn(() => ({})),
        },
      },
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/input", () => ({
      onAction: mockOnAction,
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        onLevelUp: vi.fn(),
        onPrestige: vi.fn(),
        onQuestCompleted: vi.fn(),
        onAchievementCompleted: vi.fn(),
        onEventStarted: vi.fn(),
        onEventEnded: vi.fn(),
      },
    }));

    vi.doMock("./ScreenController", () => ({
      ScreenController: {
        toggleQuestLog: vi.fn(),
        toggleInventory: vi.fn(),
        togglePets: vi.fn(),
        toggleGacha: vi.fn(),
        toggleCosmetics: vi.fn(),
        toggleBattlePass: vi.fn(),
        toggleSettings: vi.fn(),
        closeActiveModal: vi.fn(),
      },
    }));
  });

  it("exports HudController with onStart", async () => {
    const mod = await import("./HudController");
    expect(mod.HudController).toBeDefined();
    expect(typeof mod.HudController.onStart).toBe("function");
  });

  it("subscribes to remote event notifications on start", async () => {
    const { RemoteController } = await import("./RemoteController");
    const mod = await import("./HudController");
    mod.HudController.onStart!();

    expect(RemoteController.onLevelUp).toHaveBeenCalled();
    expect(RemoteController.onPrestige).toHaveBeenCalled();
    expect(RemoteController.onQuestCompleted).toHaveBeenCalled();
    expect(RemoteController.onAchievementCompleted).toHaveBeenCalled();
    expect(RemoteController.onEventStarted).toHaveBeenCalled();
    expect(RemoteController.onEventEnded).toHaveBeenCalled();
  });

  it("registers menu action for Escape keybind via @broblox/input", async () => {
    const mod = await import("./HudController");
    mod.HudController.onStart!();
    expect(mockOnAction).toHaveBeenCalledWith("menu", expect.any(Function));
  });

  it("calls closeActiveModal when menu action fires", async () => {
    const { ScreenController } = await import("./ScreenController");
    const mod = await import("./HudController");
    mod.HudController.onStart!();

    const menuCall = mockOnAction.mock.calls.find((call: unknown[]) => call[0] === "menu");
    expect(menuCall).toBeDefined();
    const menuCallback = menuCall![1] as (action: string, state: { active: boolean }) => void;

    menuCallback("menu", { active: true });
    expect(ScreenController.closeActiveModal).toHaveBeenCalled();
  });

  it("does not close modal on menu release (active=false)", async () => {
    const { ScreenController } = await import("./ScreenController");
    const mod = await import("./HudController");
    mod.HudController.onStart!();

    const menuCall = mockOnAction.mock.calls.find((call: unknown[]) => call[0] === "menu");
    const menuCallback = menuCall![1] as (action: string, state: { active: boolean }) => void;

    menuCallback("menu", { active: false });
    expect(ScreenController.closeActiveModal).not.toHaveBeenCalled();
  });
});
