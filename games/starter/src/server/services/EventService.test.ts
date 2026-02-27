/**
 * EventService Tests (Starter)
 *
 * Tests that the game-level EventService fires EventStarted / EventEnded
 * remotes to all clients when a scheduled event transitions state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("EventService (starter)", () => {
  let capturedOnEventStart:
    | ((ev: { id: string; label: string; modifiers?: unknown }) => void)
    | undefined;
  let capturedOnEventEnd:
    | ((ev: { id: string; label: string; modifiers?: unknown }) => void)
    | undefined;

  let mockFireAllClients: ReturnType<typeof vi.fn>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockOnPlayerAdded: ReturnType<typeof vi.fn>;
  let mockOnPlayerRemoving: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    capturedOnEventStart = undefined;
    capturedOnEventEnd = undefined;

    mockFireAllClients = vi.fn();
    mockRegistry = { fireAllClients: mockFireAllClients };
    mockOnPlayerAdded = vi.fn();
    mockOnPlayerRemoving = vi.fn();

    mockHandle = {
      Service: { name: "EventService", onInit: vi.fn(), onStart: vi.fn() },
      getActiveEvents: vi.fn(() => []),
      isEventActive: vi.fn(() => false),
      getScheduler: vi.fn(() => ({})),
    };

    vi.doMock("@broblox/events", () => ({
      createEventService: vi.fn((config: Record<string, unknown>) => {
        capturedOnEventStart = config["onEventStart"] as typeof capturedOnEventStart;
        capturedOnEventEnd = config["onEventEnd"] as typeof capturedOnEventEnd;
        // wire lifecycle so PlayerLifecycleService callbacks are invoked
        if (typeof config["onPlayerAdded"] === "function") {
          (config["onPlayerAdded"] as (cb: unknown) => void)(vi.fn());
        }
        if (typeof config["onPlayerRemoving"] === "function") {
          (config["onPlayerRemoving"] as (cb: unknown) => void)(vi.fn());
        }
        return mockHandle;
      }),
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: {
        onPlayerAdded: mockOnPlayerAdded,
        onPlayerRemoving: mockOnPlayerRemoving,
      },
    }));
  });

  async function loadModule() {
    return import("./EventService");
  }

  const fakeEvent = {
    id: "double-xp-2026-q1",
    label: "Double XP Weekend",
    modifiers: { xpMultiplier: 2 },
  };

  const fakeEventNoModifiers = {
    id: "bonus-coins-2026-q1",
    label: "Bonus Coins Event",
  };

  it("exports EventService, getActiveEvents, isEventActive, getEventScheduler", async () => {
    const mod = await loadModule();
    expect(mod.EventService).toBe(mockHandle.Service);
    expect(typeof mod.getActiveEvents).toBe("function");
    expect(typeof mod.isEventActive).toBe("function");
    expect(typeof mod.getEventScheduler).toBe("function");
  });

  it("wires onPlayerAdded and onPlayerRemoving to PlayerLifecycleService", async () => {
    await loadModule();
    expect(mockOnPlayerAdded).toHaveBeenCalled();
    expect(mockOnPlayerRemoving).toHaveBeenCalled();
  });

  describe("onEventStart", () => {
    it("fires EventStarted to all clients with id, label, and modifiers", async () => {
      await loadModule();
      capturedOnEventStart!(fakeEvent);
      expect(mockFireAllClients).toHaveBeenCalledWith("EventStarted", {
        id: fakeEvent.id,
        label: fakeEvent.label,
        modifiers: fakeEvent.modifiers,
      });
    });

    it("fires EventStarted with undefined modifiers when not set", async () => {
      await loadModule();
      capturedOnEventStart!(fakeEventNoModifiers);
      expect(mockFireAllClients).toHaveBeenCalledWith("EventStarted", {
        id: fakeEventNoModifiers.id,
        label: fakeEventNoModifiers.label,
        modifiers: undefined,
      });
    });
  });

  describe("onEventEnd", () => {
    it("fires EventEnded to all clients with id, label, and modifiers", async () => {
      await loadModule();
      capturedOnEventEnd!(fakeEvent);
      expect(mockFireAllClients).toHaveBeenCalledWith("EventEnded", {
        id: fakeEvent.id,
        label: fakeEvent.label,
        modifiers: fakeEvent.modifiers,
      });
    });

    it("fires EventEnded with undefined modifiers when not set", async () => {
      await loadModule();
      capturedOnEventEnd!(fakeEventNoModifiers);
      expect(mockFireAllClients).toHaveBeenCalledWith("EventEnded", {
        id: fakeEventNoModifiers.id,
        label: fakeEventNoModifiers.label,
        modifiers: undefined,
      });
    });
  });

  describe("getter delegation", () => {
    it("getActiveEvents delegates to handle", async () => {
      const mod = await loadModule();
      mod.getActiveEvents();
      expect(mockHandle.getActiveEvents).toHaveBeenCalled();
    });

    it("isEventActive delegates to handle", async () => {
      const mod = await loadModule();
      mod.isEventActive("test-event");
      expect(mockHandle.isEventActive).toHaveBeenCalledWith("test-event");
    });

    it("getEventScheduler delegates to handle.getScheduler", async () => {
      const mod = await loadModule();
      mod.getEventScheduler();
      expect(mockHandle.getScheduler).toHaveBeenCalled();
    });
  });
});
