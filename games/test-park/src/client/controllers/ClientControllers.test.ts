/**
 * Client Controller Tests — Test Park
 *
 * Tests for all 7 client controllers:
 * - RemoteController: registry creation, event subscriptions
 * - UiController: GUI lifecycle, showStatus, showActionResult
 * - HandshakeController: device detection delegation, handshake flow
 * - ActionController: input action binding, DoAction invocation
 * - ChatModerationController: delegation to @broblox/moderation
 * - ScreenController: modal management, data cache
 * - HudController: sidebar creation, event notifications, menu keybind
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// RemoteController
// ============================================================================

describe("RemoteController (test-park client)", () => {
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
      GameRemotes: {},
    }));
  });

  it("exports RemoteController with lifecycle methods", async () => {
    const mod = await import("./RemoteController");
    expect(mod.RemoteController).toBeDefined();
    expect(typeof mod.RemoteController.onInit).toBe("function");
  });

  it("initialises registry on onInit", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    expect(mockRegistry.initialize).toHaveBeenCalled();
  });

  it("subscribes to all expected client events", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    const expectedEvents = [
      "PlayerDataSync",
      "LevelUp",
      "PrestigeUnlocked",
      "QuestCompleted",
      "AchievementCompleted",
      "DailyRewardClaimed",
      "EventStarted",
      "EventEnded",
    ];

    for (const event of expectedEvents) {
      expect(onEventHandlers.has(event)).toBe(true);
    }
  });

  it("fires onDataSync callbacks when PlayerDataSync received", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    const callback = vi.fn();
    mod.RemoteController.onDataSync(callback);

    const syncHandler = onEventHandlers.get("PlayerDataSync");
    syncHandler!({ coins: 100 });

    expect(callback).toHaveBeenCalledWith({ coins: 100 });
  });

  it("fires onLevelUp callbacks when LevelUp received", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();

    const callback = vi.fn();
    mod.RemoteController.onLevelUp(callback);

    const handler = onEventHandlers.get("LevelUp");
    handler!({ newLevel: 5 });

    expect(callback).toHaveBeenCalledWith({ newLevel: 5 });
  });

  it("getRegistry throws before init", async () => {
    const mod = await import("./RemoteController");
    expect(() => mod.RemoteController.getRegistry()).toThrow();
  });

  it("getRegistry returns registry after init", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    expect(mod.RemoteController.getRegistry()).toBe(mockRegistry);
  });

  it("buyProduct fires BuyProduct event with productId", async () => {
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    mod.RemoteController.buyProduct(1_000_001);
    expect(mockRegistry.fire).toHaveBeenCalledWith("BuyProduct", { productId: 1_000_001 });
  });

  it("checkGamePass invokes CheckGamePass and returns ownership", async () => {
    mockRegistry.invoke = vi.fn(() => ({
      ok: true,
      value: { passId: 2_000_001, owned: true },
    }));
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    const result = mod.RemoteController.checkGamePass(2_000_001);
    expect(result).toBe(true);
    expect(mockRegistry.invoke).toHaveBeenCalledWith("CheckGamePass", { passId: 2_000_001 });
  });

  it("checkGamePass returns false on failure", async () => {
    mockRegistry.invoke = vi.fn(() => ({
      ok: false,
      code: "RATE_LIMITED",
      message: "Too fast",
    }));
    const mod = await import("./RemoteController");
    mod.RemoteController.onInit!();
    const result = mod.RemoteController.checkGamePass(2_000_001);
    expect(result).toBe(false);
  });
});

// ============================================================================
// UiController
// ============================================================================

describe("UiController (test-park client)", () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock("@rbxts/services", () => ({
      Players: { LocalPlayer: { Name: "TestPlayer", UserId: 1, WaitForChild: vi.fn() } },
    }));

    vi.doMock("@broblox/core", () => ({
      Controller: {},
    }));

    vi.doMock("@broblox/net", () => ({
      PROTOCOL_VERSION: 2,
    }));
  });

  it("exports UiController with showStatus and showActionResult", async () => {
    const mod = await import("./UiController");
    expect(mod.UiController).toBeDefined();
    expect(typeof mod.UiController.showStatus).toBe("function");
    expect(typeof mod.UiController.showActionResult).toBe("function");
  });

  it("has ensureGui method for lazy GUI creation", async () => {
    const mod = await import("./UiController");
    expect(typeof mod.UiController.ensureGui).toBe("function");
  });

  it("cleans up GUI on onDestroy", async () => {
    const mod = await import("./UiController");
    // Create a mock GUI to destroy
    const mockGui = { Destroy: vi.fn() };
    (mod.UiController as Record<string, unknown>).screenGui = mockGui;
    mod.UiController.onDestroy!();
    expect(mockGui.Destroy).toHaveBeenCalled();
    expect(mod.UiController.screenGui).toBeUndefined();
  });
});

// ============================================================================
// HandshakeController
// ============================================================================

describe("HandshakeController (test-park client)", () => {
  let mockRegistryInvoke: ReturnType<typeof vi.fn>;
  let mockShowStatus: ReturnType<typeof vi.fn>;
  let mockDetectDeviceClass: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockRegistryInvoke = vi.fn(() => ({
      ok: true,
      value: { serverProtocolVersion: 2, serverTime: 100 },
    }));
    mockShowStatus = vi.fn();
    mockDetectDeviceClass = vi.fn(() => "kbm");

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/net", () => ({
      PROTOCOL_VERSION: 2,
      isOk: (r: { ok: boolean }) => r.ok,
      isErr: (r: { ok: boolean }) => !r.ok,
    }));

    vi.doMock("@broblox/input", () => ({
      detectDeviceClass: mockDetectDeviceClass,
    }));

    vi.doMock("@broblox/constants", () => ({
      BUILD_ID: "test-build-001",
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        getRegistry: () => ({
          invoke: mockRegistryInvoke,
        }),
      },
    }));

    vi.doMock("./UiController", () => ({
      UiController: { showStatus: mockShowStatus },
    }));

    vi.doMock("shared/remotes", () => ({}));
  });

  it("exports HandshakeController with onStart", async () => {
    const mod = await import("./HandshakeController");
    expect(mod.HandshakeController).toBeDefined();
    expect(typeof mod.HandshakeController.onStart).toBe("function");
  });

  it("uses @broblox/input detectDeviceClass instead of inline", async () => {
    const mod = await import("./HandshakeController");
    mod.HandshakeController.onStart!();
    expect(mockDetectDeviceClass).toHaveBeenCalled();
  });

  it("performs handshake and shows connected status on success", async () => {
    const mod = await import("./HandshakeController");
    mod.HandshakeController.onStart!();

    expect(mockRegistryInvoke).toHaveBeenCalledWith(
      "Handshake",
      expect.objectContaining({
        protocolVersion: 2,
        buildId: "test-build-001",
        deviceClass: "kbm",
      })
    );
    expect(mockShowStatus).toHaveBeenCalledWith(true);
  });

  it("shows disconnected status on handshake failure", async () => {
    mockRegistryInvoke.mockReturnValue({ ok: false, code: "ERR", message: "fail" });
    const mod = await import("./HandshakeController");
    mod.HandshakeController.onStart!();
    expect(mockShowStatus).toHaveBeenCalledWith(false);
  });
});

// ============================================================================
// ActionController
// ============================================================================

describe("ActionController (test-park client)", () => {
  let capturedActionCallback: ((state: { active: boolean }) => void) | undefined;
  let mockRegistryInvoke: ReturnType<typeof vi.fn>;
  let mockShowActionResult: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    capturedActionCallback = undefined;
    mockRegistryInvoke = vi.fn(() => ({ ok: true, value: { serverTimestamp: 12345 } }));
    mockShowActionResult = vi.fn();

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/input", () => ({
      onAction: vi.fn((name: string, cb: (state: { active: boolean }) => void) => {
        if (name === "interact") {
          capturedActionCallback = cb;
        }
        return vi.fn(); // unsubscribe
      }),
    }));

    vi.doMock("@broblox/net", () => ({
      isOk: (r: { ok: boolean }) => r.ok,
      isErr: (r: { ok: boolean }) => !r.ok,
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        getRegistry: () => ({
          invoke: mockRegistryInvoke,
        }),
      },
    }));

    vi.doMock("./UiController", () => ({
      UiController: { showActionResult: mockShowActionResult },
    }));

    vi.doMock("shared/remotes", () => ({}));
  });

  it("exports ActionController with lifecycle methods", async () => {
    const mod = await import("./ActionController");
    expect(mod.ActionController).toBeDefined();
    expect(typeof mod.ActionController.onStart).toBe("function");
    expect(typeof mod.ActionController.onDestroy).toBe("function");
  });

  it("registers interact action on start", async () => {
    const { onAction } = await import("@broblox/input");
    const mod = await import("./ActionController");
    mod.ActionController.onStart!();
    expect(onAction).toHaveBeenCalledWith("interact", expect.any(Function));
  });

  it("invokes DoAction on interact press", async () => {
    const mod = await import("./ActionController");
    mod.ActionController.onStart!();

    expect(capturedActionCallback).toBeDefined();
    capturedActionCallback!({ active: true });

    expect(mockRegistryInvoke).toHaveBeenCalledWith(
      "DoAction",
      expect.objectContaining({ actionId: "intent_ping" })
    );
  });

  it("ignores release events (active=false)", async () => {
    const mod = await import("./ActionController");
    mod.ActionController.onStart!();

    capturedActionCallback!({ active: false });
    expect(mockRegistryInvoke).not.toHaveBeenCalled();
  });

  it("shows success result on OK response", async () => {
    const mod = await import("./ActionController");
    mod.ActionController.onStart!();
    capturedActionCallback!({ active: true });
    expect(mockShowActionResult).toHaveBeenCalledWith(expect.stringContaining("Action:"), true);
  });

  it("shows error result on failure response", async () => {
    mockRegistryInvoke.mockReturnValue({ ok: false, code: "ERR", message: "nope" });
    const mod = await import("./ActionController");
    mod.ActionController.onStart!();
    capturedActionCallback!({ active: true });
    expect(mockShowActionResult).toHaveBeenCalledWith(expect.stringContaining("failed"), false);
  });

  it("cleans up subscription on destroy", async () => {
    const mod = await import("./ActionController");
    mod.ActionController.onStart!();
    expect(mod.ActionController.unsubscribe).toBeDefined();
    mod.ActionController.onDestroy!();
    expect(mod.ActionController.unsubscribe).toBeUndefined();
  });
});

// ============================================================================
// ChatModerationController
// ============================================================================

describe("ChatModerationController (test-park client)", () => {
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
// ScreenController
// ============================================================================

describe("ScreenController (test-park client)", () => {
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
      createShopScreen: vi.fn(() => ({
        mount: vi.fn(),
        destroy: vi.fn(),
        toggle: vi.fn(),
        isVisible: vi.fn(() => false),
      })),
    }));

    vi.doMock("./RemoteController", () => ({
      RemoteController: {
        getFullPlayerData: vi.fn(() => ({
          coins: 100,
          kills: 5,
          level: 1,
          xp: 0,
          xpForNext: 100,
          prestige: 0,
          items: [],
          maxSlots: 100,
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
        buyProduct: vi.fn(),
        checkGamePass: vi.fn(() => false),
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
    expect(typeof sc.toggleShop).toBe("function");
  });

  it("exports closeActiveModal method", async () => {
    const mod = await import("./ScreenController");
    const sc = mod.ScreenController as Record<string, unknown>;
    expect(typeof sc.closeActiveModal).toBe("function");
  });
});

// ============================================================================
// HudController
// ============================================================================

describe("HudController (test-park client)", () => {
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
        toggleShop: vi.fn(),
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

    // Find the menu action callback
    const menuCall = mockOnAction.mock.calls.find((call: unknown[]) => call[0] === "menu");
    expect(menuCall).toBeDefined();
    const menuCallback = menuCall![1] as (state: { active: boolean }) => void;

    // Simulate press
    menuCallback({ active: true });
    expect(ScreenController.closeActiveModal).toHaveBeenCalled();
  });

  it("does not close modal on menu release (active=false)", async () => {
    const { ScreenController } = await import("./ScreenController");
    const mod = await import("./HudController");
    mod.HudController.onStart!();

    const menuCall = mockOnAction.mock.calls.find((call: unknown[]) => call[0] === "menu");
    const menuCallback = menuCall![1] as (state: { active: boolean }) => void;

    menuCallback({ active: false });
    expect(ScreenController.closeActiveModal).not.toHaveBeenCalled();
  });
});
