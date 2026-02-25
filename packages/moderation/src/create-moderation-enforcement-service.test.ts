/**
 * Tests for createModerationEnforcementService factory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Roblox globals stub
// ============================================================================

const originalGlobals: Partial<Record<string, unknown>> = {};

function setGlobal(key: string, value: unknown) {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!(key in originalGlobals)) originalGlobals[key] = g[key];
  g[key] = value;
}

function resetGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(originalGlobals)) {
    if (value === undefined) delete g[key];
    else g[key] = value;
  }
  for (const key of Object.keys(originalGlobals)) delete originalGlobals[key];
}

// ============================================================================
// Tests
// ============================================================================

describe("createModerationEnforcementService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockModeration: Record<string, ReturnType<typeof vi.fn>>;
  let playersByUserId: Map<number, Record<string, unknown>>;

  // Track onBan / onMute callbacks
  let banCallbacks: Array<(record: unknown) => void>;
  let muteCallbacks: Array<(record: unknown) => void>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    playersByUserId = new Map();
    banCallbacks = [];
    muteCallbacks = [];

    mockModeration = {
      checkBan: vi.fn().mockReturnValue({ isBanned: false, message: "" }),
      checkMute: vi.fn().mockReturnValue({ isMuted: false }),
      onBan: vi.fn((cb: (record: unknown) => void) => banCallbacks.push(cb)),
      onMute: vi.fn((cb: (record: unknown) => void) => muteCallbacks.push(cb)),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));

    vi.doMock("./service", () => ({
      getModeration: () => mockModeration,
    }));

    // game.GetService delegates to globalThis so module-scope calls resolve
    setGlobal("game", {
      GetService: (name: string) => {
        const g = globalThis as unknown as Record<string, unknown>;
        return g[name] ?? { _service: name };
      },
      JobId: "test-job-id",
      PlaceId: 0,
    });

    // Players global
    setGlobal("Players", {
      GetPlayerByUserId: (userId: number) => playersByUserId.get(userId) ?? undefined,
    });
  });

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
  });

  async function createService(
    config?: Partial<{ datastoreName: string; onPlayerAdded: unknown }>
  ) {
    const mod = await import("./create-moderation-enforcement-service");
    return mod.createModerationEnforcementService({
      datastoreName: config?.datastoreName ?? "TestModeration",
      onPlayerAdded: (config?.onPlayerAdded ?? vi.fn()) as (cb: (player: Player) => void) => void,
    });
  }

  // --------------------------------------------------------------------------
  // Factory structure
  // --------------------------------------------------------------------------

  it("returns a handle with a Service", async () => {
    const handle = await createService();
    expect(handle).toBeDefined();
    expect(handle.Service).toBeDefined();
    expect(typeof handle.Service.onInit).toBe("function");
  });

  it("each call creates an independent service", async () => {
    const mod = await import("./create-moderation-enforcement-service");
    const a = mod.createModerationEnforcementService({
      datastoreName: "A",
      onPlayerAdded: vi.fn(),
    });
    const b = mod.createModerationEnforcementService({
      datastoreName: "B",
      onPlayerAdded: vi.fn(),
    });
    expect(a.Service).not.toBe(b.Service);
  });

  // --------------------------------------------------------------------------
  // onInit — player added
  // --------------------------------------------------------------------------

  it("registers a player-added callback on init", async () => {
    const onPlayerAdded = vi.fn();
    const handle = await createService({ onPlayerAdded });
    handle.Service.onInit!();
    expect(onPlayerAdded).toHaveBeenCalledOnce();
    expect(typeof onPlayerAdded.mock.calls[0][0]).toBe("function");
  });

  it("kicks a banned player on join", async () => {
    const onPlayerAdded = vi.fn();
    mockModeration.checkBan.mockReturnValue({ isBanned: true, message: "Banned!" });
    mockModeration.checkMute.mockReturnValue({ isMuted: false });

    const handle = await createService({ onPlayerAdded });
    handle.Service.onInit!();

    const playerAddedCb = onPlayerAdded.mock.calls[0][0] as (
      player: Record<string, unknown>
    ) => void;

    const mockPlayer = {
      UserId: 42,
      Name: "TestPlayer",
      Kick: vi.fn(),
      SetAttribute: vi.fn(),
    };
    playerAddedCb(mockPlayer);

    expect(mockModeration.checkBan).toHaveBeenCalledWith(42);
    expect(mockPlayer.Kick).toHaveBeenCalledWith("Banned!");
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Kicking banned player"));
  });

  it("sets muted attributes for a muted player on join", async () => {
    const onPlayerAdded = vi.fn();
    mockModeration.checkBan.mockReturnValue({ isBanned: false, message: "" });
    mockModeration.checkMute.mockReturnValue({
      isMuted: true,
      mute: { type: "chat" },
      expiresIn: 3600,
    });

    const handle = await createService({ onPlayerAdded });
    handle.Service.onInit!();

    const playerAddedCb = onPlayerAdded.mock.calls[0][0] as (
      player: Record<string, unknown>
    ) => void;
    const mockPlayer = {
      UserId: 7,
      Name: "Muted",
      Kick: vi.fn(),
      SetAttribute: vi.fn(),
    };
    playerAddedCb(mockPlayer);

    expect(mockPlayer.Kick).not.toHaveBeenCalled();
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muted", true);
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteType", "chat");
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteExpiresIn", 3600);
  });

  it("clears muted attributes for a non-muted player on join", async () => {
    const onPlayerAdded = vi.fn();
    mockModeration.checkBan.mockReturnValue({ isBanned: false, message: "" });
    mockModeration.checkMute.mockReturnValue({ isMuted: false });

    const handle = await createService({ onPlayerAdded });
    handle.Service.onInit!();

    const playerAddedCb = onPlayerAdded.mock.calls[0][0] as (
      player: Record<string, unknown>
    ) => void;
    const mockPlayer = {
      UserId: 3,
      Name: "Clean",
      Kick: vi.fn(),
      SetAttribute: vi.fn(),
    };
    playerAddedCb(mockPlayer);

    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muted", false);
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteType", undefined);
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteExpiresIn", undefined);
  });

  // --------------------------------------------------------------------------
  // Cross-server ban sync
  // --------------------------------------------------------------------------

  it("registers an onBan callback", async () => {
    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();
    expect(mockModeration.onBan).toHaveBeenCalledOnce();
  });

  it("kicks the player on cross-server ban if online", async () => {
    const mockPlayer = { UserId: 10, Name: "Target", Kick: vi.fn(), SetAttribute: vi.fn() };
    playersByUserId.set(10, mockPlayer);
    mockModeration.checkBan.mockReturnValue({ isBanned: true, message: "CrossBan" });

    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();

    // Fire the ban callback
    expect(banCallbacks).toHaveLength(1);
    banCallbacks[0]({ playerId: 10 });

    expect(mockPlayer.Kick).toHaveBeenCalledWith("CrossBan");
  });

  it("does nothing on cross-server ban if player is offline", async () => {
    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();

    // Player 999 is not online
    banCallbacks[0]({ playerId: 999 });
    // No error thrown, nothing happens
    expect(mockModeration.checkBan).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Cross-server mute sync
  // --------------------------------------------------------------------------

  it("registers an onMute callback", async () => {
    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();
    expect(mockModeration.onMute).toHaveBeenCalledOnce();
  });

  it("applies mute attributes on cross-server mute if online", async () => {
    const mockPlayer = { UserId: 20, Name: "MuteTarget", Kick: vi.fn(), SetAttribute: vi.fn() };
    playersByUserId.set(20, mockPlayer);
    mockModeration.checkMute.mockReturnValue({
      isMuted: true,
      mute: { type: "voice" },
      expiresIn: 600,
    });

    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();

    muteCallbacks[0]({ playerId: 20 });

    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muted", true);
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteType", "voice");
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteExpiresIn", 600);
  });

  it("does nothing on cross-server mute if player is offline", async () => {
    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();

    muteCallbacks[0]({ playerId: 404 });
    expect(mockModeration.checkMute).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  it("falls back to unknown mute type when mute has no type", async () => {
    const onPlayerAdded = vi.fn();
    mockModeration.checkBan.mockReturnValue({ isBanned: false, message: "" });
    mockModeration.checkMute.mockReturnValue({
      isMuted: true,
      mute: {},
      expiresIn: undefined,
    });

    const handle = await createService({ onPlayerAdded });
    handle.Service.onInit!();

    const playerAddedCb = onPlayerAdded.mock.calls[0][0] as (
      player: Record<string, unknown>
    ) => void;
    const mockPlayer = { UserId: 1, Name: "P", Kick: vi.fn(), SetAttribute: vi.fn() };
    playerAddedCb(mockPlayer);

    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteType", "unknown");
    expect(mockPlayer.SetAttribute).toHaveBeenCalledWith("rbx.moderation.muteExpiresIn", 0);
  });

  it("logs info when moderation enforcement is enabled", async () => {
    const handle = await createService({ onPlayerAdded: vi.fn() });
    handle.Service.onInit!();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Moderation enforcement enabled")
    );
  });
});
