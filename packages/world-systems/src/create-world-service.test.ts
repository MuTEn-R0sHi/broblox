/**
 * Tests for createWorldService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createWorldService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockWorldManager: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockWorldManager = {
      onTimePeriodChanged: vi.fn(),
      onWeatherChanged: vi.fn(),
      start: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./world-manager", () => ({
      WorldManager: function () {
        return mockWorldManager;
      },
    }));
  });

  async function createService(overrides?: Record<string, unknown>) {
    const mod = await import("./create-world-service");
    return mod.createWorldService({
      cycleDurationSeconds: 600,
      startClockTime: 10,
      transitionDuration: 5,
      minChangeCooldown: 30,
      ...overrides,
    });
  }

  it("returns a Service with onInit and onStart", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("WorldService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
  });

  it("creates WorldManager with config", async () => {
    const handle = await createService();
    expect(handle.getWorldManager()).toBeDefined();
    expect(handle.getWorldManager().onTimePeriodChanged).toBeDefined();
  });

  it("applies default config values", async () => {
    const mod = await import("./create-world-service");
    const handle = mod.createWorldService({});
    expect(handle.getWorldManager()).toBeDefined();
  });

  it("registers time and weather listeners on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockWorldManager.onTimePeriodChanged).toHaveBeenCalledWith(expect.any(Function));
    expect(mockWorldManager.onWeatherChanged).toHaveBeenCalledWith(expect.any(Function));
  });

  it("time period listener logs transition", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    const cb = mockWorldManager.onTimePeriodChanged.mock.calls[0][0];
    cb({ previousPeriod: "Day", newPeriod: "Night" });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Day"));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Night"));
  });

  it("weather listener logs transition", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    const cb = mockWorldManager.onWeatherChanged.mock.calls[0][0];
    cb({ previousWeather: "Clear", newWeather: "Rain" });

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Clear"));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Rain"));
  });

  it("starts world manager on onStart", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockWorldManager.start).toHaveBeenCalled();
  });

  it("exposes getWorldManager", async () => {
    const handle = await createService();
    expect(handle.getWorldManager()).toBe(mockWorldManager);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-world-service");
    const h1 = mod.createWorldService({});
    const h2 = mod.createWorldService({});
    expect(h1.Service).not.toBe(h2.Service);
  });
});
