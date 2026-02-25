/**
 * Tests for createPlayerLifecycleService factory.
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

describe("createPlayerLifecycleService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;

  // Simulated Players events
  let playerAddedCallbacks: Array<(player: unknown) => void>;
  let playerRemovingCallbacks: Array<(player: unknown) => void>;
  let mockGetPlayers: ReturnType<typeof vi.fn>;

  // Connection tracking
  let connections: Array<{ Disconnect: ReturnType<typeof vi.fn> }>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    playerAddedCallbacks = [];
    playerRemovingCallbacks = [];
    connections = [];
    mockGetPlayers = vi.fn().mockReturnValue([]);

    vi.doMock("./logger", () => ({
      createLogger: () => mockLogger,
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

    // Players global with RBXScriptSignal-like Connect
    setGlobal("Players", {
      PlayerAdded: {
        Connect: vi.fn((cb: (player: unknown) => void) => {
          playerAddedCallbacks.push(cb);
          const conn = { Disconnect: vi.fn() };
          connections.push(conn);
          return conn;
        }),
      },
      PlayerRemoving: {
        Connect: vi.fn((cb: (player: unknown) => void) => {
          playerRemovingCallbacks.push(cb);
          const conn = { Disconnect: vi.fn() };
          connections.push(conn);
          return conn;
        }),
      },
      GetPlayers: mockGetPlayers,
    });

    // pcall mock — executes the function and returns [true, result] or [false, error]
    setGlobal("pcall", (fn: () => unknown) => {
      try {
        const result = fn();
        return [true, result];
      } catch (e) {
        return [false, String(e)];
      }
    });
  });

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
  });

  async function createService(config?: {
    loggerName?: string;
    catchUpPhase?: "onInit" | "onStart";
  }) {
    const mod = await import("./create-player-lifecycle-service");
    return mod.createPlayerLifecycleService(config);
  }

  // --------------------------------------------------------------------------
  // Factory structure
  // --------------------------------------------------------------------------

  it("returns a handle with a Service", async () => {
    const handle = await createService();
    expect(handle).toBeDefined();
    expect(handle.Service).toBeDefined();
  });

  it("Service has lifecycle methods", async () => {
    const handle = await createService();
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("Service has API methods", async () => {
    const handle = await createService();
    expect(typeof handle.Service.onPlayerAdded).toBe("function");
    expect(typeof handle.Service.onPlayerRemoving).toBe("function");
    expect(typeof handle.Service.getPlayers).toBe("function");
  });

  it("each call creates an independent service", async () => {
    const mod = await import("./create-player-lifecycle-service");
    const a = mod.createPlayerLifecycleService();
    const b = mod.createPlayerLifecycleService();
    expect(a.Service).not.toBe(b.Service);
  });

  // --------------------------------------------------------------------------
  // onInit — connects to Players events
  // --------------------------------------------------------------------------

  it("connects to PlayerAdded on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    const Players = (globalThis as unknown as Record<string, unknown>).Players as Record<
      string,
      unknown
    >;
    const signal = Players.PlayerAdded as Record<string, ReturnType<typeof vi.fn>>;
    expect(signal.Connect).toHaveBeenCalledOnce();
  });

  it("connects to PlayerRemoving on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    const Players = (globalThis as unknown as Record<string, unknown>).Players as Record<
      string,
      unknown
    >;
    const signal = Players.PlayerRemoving as Record<string, ReturnType<typeof vi.fn>>;
    expect(signal.Connect).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // onPlayerAdded / onPlayerRemoving registration
  // --------------------------------------------------------------------------

  it("fires registered onPlayerAdded callbacks when a player joins", async () => {
    const handle = await createService();
    const cb = vi.fn();
    handle.Service.onPlayerAdded(cb);
    handle.Service.onInit!();

    const mockPlayer = { UserId: 1, Name: "Alice" };
    playerAddedCallbacks[0](mockPlayer);

    expect(cb).toHaveBeenCalledWith(mockPlayer);
  });

  it("fires multiple onPlayerAdded callbacks", async () => {
    const handle = await createService();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    handle.Service.onPlayerAdded(cb1);
    handle.Service.onPlayerAdded(cb2);
    handle.Service.onInit!();

    const mockPlayer = { UserId: 2, Name: "Bob" };
    playerAddedCallbacks[0](mockPlayer);

    expect(cb1).toHaveBeenCalledWith(mockPlayer);
    expect(cb2).toHaveBeenCalledWith(mockPlayer);
  });

  it("fires registered onPlayerRemoving callbacks when a player leaves", async () => {
    const handle = await createService();
    const cb = vi.fn();
    handle.Service.onPlayerRemoving(cb);
    handle.Service.onInit!();

    const mockPlayer = { UserId: 3, Name: "Charlie" };
    playerRemovingCallbacks[0](mockPlayer);

    expect(cb).toHaveBeenCalledWith(mockPlayer);
  });

  // --------------------------------------------------------------------------
  // catchUpPhase
  // --------------------------------------------------------------------------

  it("fires callbacks for existing players during onInit by default", async () => {
    const existingPlayer = { UserId: 100, Name: "Existing" };
    mockGetPlayers.mockReturnValue([existingPlayer]);

    const handle = await createService();
    const cb = vi.fn();
    handle.Service.onPlayerAdded(cb);
    handle.Service.onInit!();

    expect(cb).toHaveBeenCalledWith(existingPlayer);
  });

  it("does not fire callbacks for existing players during onInit when catchUpPhase is onStart", async () => {
    const existingPlayer = { UserId: 100, Name: "Existing" };
    mockGetPlayers.mockReturnValue([existingPlayer]);

    const handle = await createService({ catchUpPhase: "onStart" });
    const cb = vi.fn();
    handle.Service.onPlayerAdded(cb);
    handle.Service.onInit!();

    expect(cb).not.toHaveBeenCalled();
  });

  it("fires callbacks for existing players during onStart when catchUpPhase is onStart", async () => {
    const existingPlayer = { UserId: 100, Name: "Existing" };
    mockGetPlayers.mockReturnValue([existingPlayer]);

    const handle = await createService({ catchUpPhase: "onStart" });
    const cb = vi.fn();
    handle.Service.onPlayerAdded(cb);
    handle.Service.onInit!(); // connects signals but does not catch up
    handle.Service.onStart!();

    expect(cb).toHaveBeenCalledWith(existingPlayer);
  });

  it("does not fire catch-up during onStart when catchUpPhase is onInit", async () => {
    const existingPlayer = { UserId: 100, Name: "Existing" };
    mockGetPlayers.mockReturnValue([existingPlayer]);

    const handle = await createService({ catchUpPhase: "onInit" });
    const cb = vi.fn();
    handle.Service.onPlayerAdded(cb);
    handle.Service.onInit!();

    cb.mockClear();
    handle.Service.onStart!();

    // Should not fire again during onStart
    expect(cb).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Error isolation via pcall
  // --------------------------------------------------------------------------

  it("isolates errors in onPlayerAdded callbacks", async () => {
    const handle = await createService();
    const badCb = vi.fn(() => {
      throw new Error("boom");
    });
    const goodCb = vi.fn();
    handle.Service.onPlayerAdded(badCb);
    handle.Service.onPlayerAdded(goodCb);
    handle.Service.onInit!();

    const mockPlayer = { UserId: 5, Name: "Eve" };
    playerAddedCallbacks[0](mockPlayer);

    // Bad callback threw, but good callback still ran
    expect(badCb).toHaveBeenCalled();
    expect(goodCb).toHaveBeenCalledWith(mockPlayer);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("PlayerAdded callback failed")
    );
  });

  it("isolates errors in onPlayerRemoving callbacks", async () => {
    const handle = await createService();
    const badCb = vi.fn(() => {
      throw new Error("oops");
    });
    const goodCb = vi.fn();
    handle.Service.onPlayerRemoving(badCb);
    handle.Service.onPlayerRemoving(goodCb);
    handle.Service.onInit!();

    const mockPlayer = { UserId: 6, Name: "Frank" };
    playerRemovingCallbacks[0](mockPlayer);

    expect(goodCb).toHaveBeenCalledWith(mockPlayer);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("PlayerRemoving callback failed")
    );
  });

  it("isolates errors in catch-up for existing players", async () => {
    const existingPlayer = { UserId: 99, Name: "Old" };
    mockGetPlayers.mockReturnValue([existingPlayer]);

    const handle = await createService();
    const badCb = vi.fn(() => {
      throw new Error("catch-up error");
    });
    const goodCb = vi.fn();
    handle.Service.onPlayerAdded(badCb);
    handle.Service.onPlayerAdded(goodCb);
    handle.Service.onInit!();

    expect(goodCb).toHaveBeenCalledWith(existingPlayer);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("existing player"));
  });

  // --------------------------------------------------------------------------
  // getPlayers delegation
  // --------------------------------------------------------------------------

  it("getPlayers delegates to Players.GetPlayers()", async () => {
    const players = [{ UserId: 1 }, { UserId: 2 }];
    mockGetPlayers.mockReturnValue(players);

    const handle = await createService();
    const result = handle.Service.getPlayers();

    expect(result).toBe(players);
    expect(mockGetPlayers).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // onDestroy — cleanup
  // --------------------------------------------------------------------------

  it("disconnects all connections on destroy", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(connections).toHaveLength(2); // PlayerAdded + PlayerRemoving
    handle.Service.onDestroy!();

    for (const conn of connections) {
      expect(conn.Disconnect).toHaveBeenCalled();
    }
  });

  it("logs cleanup on destroy", async () => {
    const handle = await createService();
    handle.Service.onInit!();
    handle.Service.onDestroy!();

    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Cleaning up"));
  });
});
