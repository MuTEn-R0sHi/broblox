/**
 * @rbx/audio — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SoundDefinition, Playlist } from "./types";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;

function setupGlobals() {
  mockTime = 1000;
  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.pcall = (fn: (...a: unknown[]) => unknown) => {
    try {
      return [true, fn()];
    } catch (e) {
      return [false, e];
    }
  };
}

// ---------------------------------------------------------------------------

import { SoundRegistry } from "./sound-registry";
import { AudioManager } from "./audio-manager";

const swordSwing: SoundDefinition = {
  id: "sword_swing",
  assetId: "rbxassetid://12345",
  channel: "sfx",
  volume: 1.0,
  playbackSpeed: 1.0,
  looped: false,
  maxInstances: 3,
};

const bgMusic: SoundDefinition = {
  id: "bg_music",
  assetId: "rbxassetid://67890",
  channel: "music",
  volume: 0.8,
  playbackSpeed: 1.0,
  looped: true,
  maxInstances: 1,
  group: "background",
};

const ambient: SoundDefinition = {
  id: "forest_ambient",
  assetId: "rbxassetid://11111",
  channel: "ambient",
  volume: 0.6,
  playbackSpeed: 1.0,
  looped: true,
  maxInstances: 0,
};

const uiClick: SoundDefinition = {
  id: "ui_click",
  assetId: "rbxassetid://22222",
  channel: "ui",
  volume: 0.5,
  playbackSpeed: 1.0,
  looped: false,
  maxInstances: 5,
};

// ---------------------------------------------------------------------------

describe("SoundRegistry", () => {
  let reg: SoundRegistry;

  beforeEach(() => {
    setupGlobals();
    reg = new SoundRegistry();
  });

  it("registers and retrieves a sound", () => {
    expect(reg.register(swordSwing)).toBe(true);
    expect(reg.get("sword_swing")).toEqual(swordSwing);
  });

  it("prevents duplicate registration", () => {
    reg.register(swordSwing);
    expect(reg.register(swordSwing)).toBe(false);
  });

  it("registerAll adds multiple", () => {
    const count = reg.registerAll([swordSwing, bgMusic, ambient]);
    expect(count).toBe(3);
    expect(reg.count()).toBe(3);
  });

  it("getByChannel filters correctly", () => {
    reg.registerAll([swordSwing, bgMusic, ambient, uiClick]);
    expect(reg.getByChannel("sfx")).toHaveLength(1);
    expect(reg.getByChannel("music")).toHaveLength(1);
    expect(reg.getByChannel("ambient")).toHaveLength(1);
  });

  it("getByGroup filters correctly", () => {
    reg.registerAll([swordSwing, bgMusic, ambient]);
    expect(reg.getByGroup("background")).toHaveLength(1);
    expect(reg.getByGroup("nonexistent")).toHaveLength(0);
  });

  it("getAll returns everything", () => {
    reg.registerAll([swordSwing, bgMusic]);
    expect(reg.getAll()).toHaveLength(2);
  });

  it("remove deletes a sound", () => {
    reg.register(swordSwing);
    expect(reg.remove("sword_swing")).toBe(true);
    expect(reg.has("sword_swing")).toBe(false);
  });

  it("clear removes all", () => {
    reg.registerAll([swordSwing, bgMusic]);
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});

describe("AudioManager", () => {
  let reg: SoundRegistry;
  let mgr: AudioManager;

  beforeEach(() => {
    setupGlobals();
    reg = new SoundRegistry();
    reg.registerAll([swordSwing, bgMusic, ambient, uiClick]);
    mgr = new AudioManager(reg, { enableLogging: true });
  });

  // Playback
  it("plays a sound", () => {
    const result = mgr.play("sword_swing");
    expect(result.ok).toBe(true);
    expect(result.instanceId).toBeDefined();
    expect(mgr.activeInstanceCount()).toBe(1);
  });

  it("rejects unknown sound", () => {
    const result = mgr.play("nope");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("sound_not_found");
  });

  it("enforces max instances", () => {
    mgr.play("bg_music");
    const result = mgr.play("bg_music");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("max_instances");
  });

  it("allows unlimited when maxInstances is 0", () => {
    mgr.play("forest_ambient");
    mgr.play("forest_ambient");
    mgr.play("forest_ambient");
    expect(mgr.instanceCountOf("forest_ambient")).toBe(3);
  });

  it("pauses a playing instance", () => {
    const { instanceId } = mgr.play("sword_swing");
    const result = mgr.pause(instanceId!);
    expect(result.ok).toBe(true);
    expect(mgr.getInstance(instanceId!)?.state).toBe("paused");
  });

  it("resumes a paused instance", () => {
    const { instanceId } = mgr.play("sword_swing");
    mgr.pause(instanceId!);
    const result = mgr.resume(instanceId!);
    expect(result.ok).toBe(true);
    expect(mgr.getInstance(instanceId!)?.state).toBe("playing");
  });

  it("stops a playing instance", () => {
    const { instanceId } = mgr.play("sword_swing");
    const result = mgr.stop(instanceId!);
    expect(result.ok).toBe(true);
    expect(mgr.activeInstanceCount()).toBe(0);
  });

  it("stopAll stops all instances of a sound", () => {
    mgr.play("forest_ambient");
    mgr.play("forest_ambient");
    const stopped = mgr.stopAll("forest_ambient");
    expect(stopped).toBe(2);
    expect(mgr.activeInstanceCount()).toBe(0);
  });

  it("stopChannel stops all on a channel", () => {
    mgr.play("sword_swing");
    mgr.play("ui_click");
    mgr.play("forest_ambient");
    const stopped = mgr.stopChannel("sfx");
    expect(stopped).toBe(1);
    expect(mgr.activeInstanceCount()).toBe(2);
  });

  it("stopEverything clears all", () => {
    mgr.play("sword_swing");
    mgr.play("bg_music");
    mgr.play("forest_ambient");
    const stopped = mgr.stopEverything();
    expect(stopped).toBe(3);
    expect(mgr.activeInstanceCount()).toBe(0);
  });

  // Edge cases
  it("pause on stopped returns error", () => {
    const { instanceId } = mgr.play("sword_swing");
    mgr.stop(instanceId!);
    const result = mgr.pause(instanceId!);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("instance_not_found");
  });

  it("resume already playing returns error", () => {
    const { instanceId } = mgr.play("sword_swing");
    const result = mgr.resume(instanceId!);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("already_playing");
  });

  // Volume
  it("setMasterVolume updates and fires callback", () => {
    const cb = vi.fn();
    mgr.onVolumeChanged(cb);
    const result = mgr.setMasterVolume(0.5);
    expect(result.ok).toBe(true);
    expect(mgr.getMasterVolume()).toBe(0.5);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ channel: "master", newVolume: 0.5 }));
  });

  it("setChannelVolume updates and fires callback", () => {
    const cb = vi.fn();
    mgr.onVolumeChanged(cb);
    mgr.setChannelVolume("sfx", 0.3);
    expect(mgr.getChannelVolume("sfx")).toBe(0.3);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ channel: "sfx", newVolume: 0.3 }));
  });

  it("rejects invalid volume", () => {
    expect(mgr.setMasterVolume(-1).ok).toBe(false);
    expect(mgr.setMasterVolume(2).ok).toBe(false);
    expect(mgr.setChannelVolume("sfx", -0.1).ok).toBe(false);
  });

  it("volume recalculates on playing instances", () => {
    const { instanceId } = mgr.play("sword_swing");
    mgr.setMasterVolume(0.5);
    // sfx default 1.0, sound volume 1.0, master 0.5 → 0.5
    expect(mgr.getInstance(instanceId!)?.volume).toBe(0.5);
  });

  // Sound ended callback
  it("fires sound ended callback on stop", () => {
    const cb = vi.fn();
    mgr.onSoundEnded(cb);
    const { instanceId } = mgr.play("sword_swing");
    mgr.stop(instanceId!);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ soundId: "sword_swing", channel: "sfx" })
    );
  });

  // Playlists
  it("registers and starts a playlist", () => {
    const pl: Playlist = {
      id: "main_bgm",
      name: "Main BGM",
      tracks: [{ id: "t1", soundId: "bg_music", crossfadeDuration: 1.0 }],
      loop: true,
      shuffle: false,
    };
    expect(mgr.registerPlaylist(pl)).toBe(true);
    const result = mgr.startPlaylist("main_bgm");
    expect(result.ok).toBe(true);
    expect(mgr.getActivePlaylist()).toBe("main_bgm");
  });

  it("rejects unknown playlist", () => {
    expect(mgr.startPlaylist("nope").ok).toBe(false);
  });

  it("stopPlaylist stops music", () => {
    const pl: Playlist = {
      id: "bgm",
      name: "BGM",
      tracks: [{ id: "t1", soundId: "bg_music", crossfadeDuration: 0 }],
      loop: false,
      shuffle: false,
    };
    mgr.registerPlaylist(pl);
    mgr.startPlaylist("bgm");
    mgr.stopPlaylist();
    expect(mgr.getActivePlaylist()).toBeUndefined();
  });

  it("nextTrack advances and loops", () => {
    // Register a second music sound
    reg.register({
      id: "bg_music2",
      assetId: "rbxassetid://99999",
      channel: "music",
      volume: 0.8,
      playbackSpeed: 1.0,
      looped: true,
      maxInstances: 1,
    });
    const pl: Playlist = {
      id: "bgm",
      name: "BGM",
      tracks: [
        { id: "t1", soundId: "bg_music", crossfadeDuration: 0 },
        { id: "t2", soundId: "bg_music2", crossfadeDuration: 0 },
      ],
      loop: true,
      shuffle: false,
    };
    mgr.registerPlaylist(pl);
    mgr.startPlaylist("bgm");
    expect(mgr.getCurrentTrackIndex()).toBe(0);
    mgr.nextTrack();
    expect(mgr.getCurrentTrackIndex()).toBe(1);
    mgr.nextTrack(); // should loop back to 0
    expect(mgr.getCurrentTrackIndex()).toBe(0);
  });

  it("prevents duplicate playlist registration", () => {
    const pl: Playlist = {
      id: "bgm",
      name: "BGM",
      tracks: [],
      loop: false,
      shuffle: false,
    };
    mgr.registerPlaylist(pl);
    expect(mgr.registerPlaylist(pl)).toBe(false);
  });

  it("rejects empty playlist", () => {
    const pl: Playlist = {
      id: "empty",
      name: "Empty",
      tracks: [],
      loop: false,
      shuffle: false,
    };
    mgr.registerPlaylist(pl);
    expect(mgr.startPlaylist("empty").status).toBe("playlist_empty");
  });
});
