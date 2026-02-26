/**
 * Tests for createAnalyticsService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createAnalyticsService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockEventTracker: Record<string, ReturnType<typeof vi.fn>>;
  let mockFunnelTracker: Record<string, ReturnType<typeof vi.fn>>;
  let mockSessionTracker: Record<string, ReturnType<typeof vi.fn>>;
  let mockRetentionTracker: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockEventTracker = {
      registerEvent: vi.fn(),
      registerEvents: vi.fn(),
      track: vi.fn(),
    };

    mockFunnelTracker = {
      registerFunnel: vi.fn(),
      advanceStep: vi.fn(),
    };

    mockSessionTracker = {
      startSession: vi.fn(),
      endSession: vi.fn(),
    };

    mockRetentionTracker = {
      init: vi.fn(),
      recordVisit: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./event-tracker", () => ({
      EventTracker: function () {
        return mockEventTracker;
      },
    }));
    vi.doMock("./funnel-tracker", () => ({
      FunnelTracker: function () {
        return mockFunnelTracker;
      },
    }));
    vi.doMock("./session-tracker", () => ({
      SessionTracker: function () {
        return mockSessionTracker;
      },
    }));
    vi.doMock("./retention-tracker", () => ({
      RetentionTracker: function () {
        return mockRetentionTracker;
      },
    }));
  });

  function makeConfig() {
    return {
      eventDefinitions: [{ name: "test_event", category: "game" }] as never[],
      funnelDefinitions: [{ name: "onboarding", steps: ["a", "b"] }] as never[],
    };
  }

  async function createService(
    cfg?: Parameters<typeof import("./create-analytics-service").createAnalyticsService>[0]
  ) {
    const mod = await import("./create-analytics-service");
    return mod.createAnalyticsService(cfg ?? makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("AnalyticsService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers event and funnel definitions on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockEventTracker.registerEvents).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "test_event" })])
    );
    expect(mockFunnelTracker.registerFunnel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "onboarding" })
    );
    expect(mockRetentionTracker.init).toHaveBeenCalled();
  });

  it("skips registration when no definitions provided", async () => {
    const handle = await createService({});
    handle.Service.onInit!();

    expect(mockEventTracker.registerEvents).not.toHaveBeenCalled();
    expect(mockFunnelTracker.registerFunnel).not.toHaveBeenCalled();
    expect(mockRetentionTracker.init).toHaveBeenCalled();
  });

  it("logs on start and destroy", async () => {
    const handle = await createService();
    handle.Service.onStart!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));

    handle.Service.onDestroy!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stopped"));
  });

  it("initPlayer starts session and records retention visit", async () => {
    const handle = await createService();
    handle.initPlayer(42);

    expect(mockSessionTracker.startSession).toHaveBeenCalledWith(42);
    expect(mockRetentionTracker.recordVisit).toHaveBeenCalledWith(42);
  });

  it("cleanupPlayer ends session", async () => {
    const handle = await createService();
    handle.cleanupPlayer(42);

    expect(mockSessionTracker.endSession).toHaveBeenCalledWith(42);
  });

  it("exposes all four trackers", async () => {
    const handle = await createService();
    expect(handle.getEventTracker()).toBe(mockEventTracker);
    expect(handle.getFunnelTracker()).toBe(mockFunnelTracker);
    expect(handle.getSessionTracker()).toBe(mockSessionTracker);
    expect(handle.getRetentionTracker()).toBe(mockRetentionTracker);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-analytics-service");
    const h1 = mod.createAnalyticsService(makeConfig());
    const h2 = mod.createAnalyticsService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });
});
