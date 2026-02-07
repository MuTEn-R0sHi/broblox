/**
 * Tests for createAudioService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createAudioService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockSoundRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockAudioManager: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockSoundRegistry = {
      registerAll: vi.fn(),
      count: vi.fn(() => 3),
    };
    mockAudioManager = {
      registerPlaylist: vi.fn(),
      startPlaylist: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./sound-registry", () => ({
      SoundRegistry: function () {
        return mockSoundRegistry;
      },
    }));
    vi.doMock("./audio-manager", () => ({
      AudioManager: function () {
        return mockAudioManager;
      },
    }));
  });

  async function createService(overrides?: Partial<{ startupPlaylist: string }>) {
    const mod = await import("./create-audio-service");
    return mod.createAudioService({
      sounds: [{ id: "s1" }, { id: "s2" }, { id: "s3" }] as never[],
      playlists: [{ name: "bgm", tracks: [] }] as never[],
      ...overrides,
    });
  }

  it("returns a Service with onInit and onStart", async () => {
    const handle = await createService();
    expect(handle.Service).toBeDefined();
    expect(handle.Service.name).toBe("AudioService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
  });

  it("registers sounds and playlists on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockSoundRegistry.registerAll).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "s1" })])
    );
    expect(mockAudioManager.registerPlaylist).toHaveBeenCalledTimes(1);
  });

  it("logs sound count on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("3 sounds registered"));
  });

  it("starts startup playlist on onStart when configured", async () => {
    const handle = await createService({ startupPlaylist: "bgm" });
    handle.Service.onStart!();

    expect(mockAudioManager.startPlaylist).toHaveBeenCalledWith("bgm");
  });

  it("does not start playlist on onStart when not configured", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockAudioManager.startPlaylist).not.toHaveBeenCalled();
  });

  it("exposes getSoundRegistry and getAudioManager", async () => {
    const handle = await createService();
    expect(handle.getSoundRegistry()).toBe(mockSoundRegistry);
    expect(handle.getAudioManager()).toBe(mockAudioManager);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-audio-service");
    const h1 = mod.createAudioService({ sounds: [], playlists: [] });
    const h2 = mod.createAudioService({ sounds: [], playlists: [] });
    expect(h1.Service).not.toBe(h2.Service);
  });
});
