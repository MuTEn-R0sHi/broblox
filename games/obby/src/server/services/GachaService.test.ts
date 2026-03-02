/**
 * GachaService Tests (Obby)
 *
 * Tests the createGachaService wrapper config and export delegation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("GachaService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getEggRegistry: ReturnType<typeof vi.fn>;
    getGachaStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };
  let mockPlayerLifecycle: Record<string, unknown> & {
    onPlayerRemoving: ReturnType<typeof vi.fn>;
    onPlayerAdded: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "GachaService" },
      getEggRegistry: vi.fn(() => "egg-registry"),
      getGachaStore: vi.fn(() => "gacha-store"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    mockPlayerLifecycle = { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() };

    vi.doMock("@broblox/gacha", () => ({
      createGachaService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  async function loadService() {
    return import("./GachaService");
  }

  it("exports GachaService and getter functions", async () => {
    const mod = await loadService();
    expect(mod.GachaService).toBe(mockHandle.Service);
    expect(typeof mod.getEggRegistry).toBe("function");
    expect(typeof mod.getGachaStore).toBe("function");
    expect(typeof mod.initPlayerGacha).toBe("function");
    expect(typeof mod.cleanupPlayerGacha).toBe("function");
  });

  it("configures sky_egg with coins currency", async () => {
    await loadService();
    const eggs = capturedConfig!["eggs"] as Array<{ id: string; currency: string }>;
    expect(eggs).toHaveLength(1);
    expect(eggs[0].id).toBe("sky_egg");
    expect(eggs[0].currency).toBe("coins");
  });

  it("delegates getEggRegistry to handle", async () => {
    const mod = await loadService();
    expect(mod.getEggRegistry()).toBe("egg-registry");
  });

  it("delegates getGachaStore to handle", async () => {
    const mod = await loadService();
    mod.getGachaStore(42);
    expect(mockHandle.getGachaStore).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerGacha to handle.initPlayer", async () => {
    const mod = await loadService();
    mod.initPlayerGacha(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerGacha to handle.cleanupPlayer", async () => {
    const mod = await loadService();
    mod.cleanupPlayerGacha(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("wires lifecycle callbacks to PlayerLifecycleService", async () => {
    await loadService();
    const onRemovingCb = vi.fn();
    (capturedConfig!["onPlayerRemoving"] as (cb: unknown) => void)(onRemovingCb);
    expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalledWith(onRemovingCb);

    const onAddedCb = vi.fn();
    (capturedConfig!["onPlayerAdded"] as (cb: unknown) => void)(onAddedCb);
    expect(mockPlayerLifecycle.onPlayerAdded).toHaveBeenCalledWith(onAddedCb);
  });
});
