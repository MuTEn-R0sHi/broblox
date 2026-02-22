/**
 * Tests for createEventService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createEventService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockIsFlagEnabled: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };

    mockIsFlagEnabled = vi.fn(() => true);

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));

    vi.doMock("@rbx/config-featureflags", () => ({
      isFlagEnabled: mockIsFlagEnabled,
    }));

    // Stub Roblox globals used by the factory.
    vi.stubGlobal("os", { time: vi.fn(() => 1_000_000) });
    vi.stubGlobal("task", { delay: vi.fn() }); // swallow recursive poll
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const NOW = 1_000_000;

  function makeActiveEvent(id = "evt-active") {
    return {
      id,
      label: `Active ${id}`,
      startTime: NOW - 100,
      endTime: NOW + 100,
    };
  }

  function makeFutureEvent(id = "evt-future") {
    return {
      id,
      label: `Future ${id}`,
      startTime: NOW + 100,
      endTime: NOW + 200,
    };
  }

  async function createService(
    cfg?: Parameters<typeof import("./create-event-service").createEventService>[0]
  ) {
    const mod = await import("./create-event-service");
    return mod.createEventService(cfg ?? { events: [] });
  }

  // ---------------------------------------------------------------------------
  // Handle shape
  // ---------------------------------------------------------------------------

  it("returns a handle with Service and query methods", async () => {
    const handle = await createService();
    expect(handle.Service).toBeDefined();
    expect(typeof handle.getScheduler).toBe("function");
    expect(typeof handle.getActiveEvents).toBe("function");
    expect(typeof handle.isEventActive).toBe("function");
  });

  it("Service has correct name and lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("EventService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("each factory call returns an independent service", async () => {
    const mod = await import("./create-event-service");
    const h1 = mod.createEventService({ events: [] });
    const h2 = mod.createEventService({ events: [] });
    expect(h1.Service).not.toBe(h2.Service);
    expect(h1.getScheduler()).not.toBe(h2.getScheduler());
  });

  // ---------------------------------------------------------------------------
  // onInit
  // ---------------------------------------------------------------------------

  it("logs on init", async () => {
    const handle = await createService({ events: [makeActiveEvent()] });
    handle.Service.onInit!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("initialized"));
  });

  it("wires onPlayerRemoving callback on init", async () => {
    const onPlayerRemoving = vi.fn();
    const handle = await createService({
      events: [],
      onPlayerRemoving,
    });
    handle.Service.onInit!();
    expect(onPlayerRemoving).toHaveBeenCalledWith(expect.any(Function));
  });

  // ---------------------------------------------------------------------------
  // onStart
  // ---------------------------------------------------------------------------

  it("logs on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
  });

  it("fires onEventStart for events already active at start", async () => {
    const onEventStart = vi.fn();
    const handle = await createService({
      events: [makeActiveEvent("live")],
      onEventStart,
    });
    handle.Service.onStart!();
    expect(onEventStart).toHaveBeenCalledWith(expect.objectContaining({ id: "live" }));
  });

  it("does not fire onEventStart for future events", async () => {
    const onEventStart = vi.fn();
    const handle = await createService({
      events: [makeFutureEvent("future")],
      onEventStart,
    });
    handle.Service.onStart!();
    expect(onEventStart).not.toHaveBeenCalled();
  });

  it("schedules recurring poll via task.delay on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();
    // @ts-expect-error stubbed global
    expect(task.delay).toHaveBeenCalledWith(expect.any(Number), expect.any(Function));
  });

  it("wires onPlayerAdded callback on start", async () => {
    const onPlayerAdded = vi.fn();
    const handle = await createService({
      events: [],
      onPlayerAdded,
    });
    handle.Service.onStart!();
    expect(onPlayerAdded).toHaveBeenCalledWith(expect.any(Function));
  });

  // ---------------------------------------------------------------------------
  // onDestroy
  // ---------------------------------------------------------------------------

  it("resets the scheduler on destroy", async () => {
    const handle = await createService({ events: [makeActiveEvent()] });
    handle.Service.onStart!(); // seeds active events
    handle.Service.onDestroy!();
    expect(handle.getScheduler().getActiveIds().size).toBe(0);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stopped"));
  });

  // ---------------------------------------------------------------------------
  // getActiveEvents / isEventActive
  // ---------------------------------------------------------------------------

  it("getActiveEvents returns events active at os.time()", async () => {
    const handle = await createService({ events: [makeActiveEvent("live")] });
    handle.Service.onStart!(); // tick initialises activeIds
    const active = handle.getActiveEvents();
    expect(active.map((e) => e.id)).toContain("live");
  });

  it("isEventActive returns true for active event", async () => {
    const handle = await createService({ events: [makeActiveEvent("live")] });
    handle.Service.onStart!();
    expect(handle.isEventActive("live")).toBe(true);
  });

  it("isEventActive returns false for unknown event", async () => {
    const handle = await createService({ events: [] });
    expect(handle.isEventActive("nope")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Feature flag gate
  // ---------------------------------------------------------------------------

  it("does not start flagged event when flag is disabled", async () => {
    mockIsFlagEnabled.mockReturnValue(false);
    const onEventStart = vi.fn();
    const handle = await createService({
      events: [{ ...makeActiveEvent("flagged"), featureFlagId: "kill-switch" }],
      onEventStart,
    });
    handle.Service.onStart!();
    expect(onEventStart).not.toHaveBeenCalled();
  });

  it("starts flagged event when flag is enabled", async () => {
    mockIsFlagEnabled.mockReturnValue(true);
    const onEventStart = vi.fn();
    const handle = await createService({
      events: [{ ...makeActiveEvent("flagged"), featureFlagId: "kill-switch" }],
      onEventStart,
    });
    handle.Service.onStart!();
    expect(onEventStart).toHaveBeenCalledWith(expect.objectContaining({ id: "flagged" }));
  });

  // ---------------------------------------------------------------------------
  // pollIntervalSeconds
  // ---------------------------------------------------------------------------

  it("uses default poll interval of 60s", async () => {
    const handle = await createService({ events: [] });
    handle.Service.onStart!();
    // @ts-expect-error stubbed global
    expect(task.delay).toHaveBeenCalledWith(60, expect.any(Function));
  });

  it("respects custom pollIntervalSeconds", async () => {
    const handle = await createService({
      events: [],
      pollIntervalSeconds: 30,
    });
    handle.Service.onStart!();
    // @ts-expect-error stubbed global
    expect(task.delay).toHaveBeenCalledWith(30, expect.any(Function));
  });
});
