/**
 * TelemetryService Tests — Test Park
 *
 * Verifies that the telemetry service:
 * - Registers lifecycle hooks on start
 * - Emits player_joined / player_left events via observability
 * - Emits server_started game event
 * - Exposes trackPurchase / trackCoinSpend helpers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("TelemetryService (test-park)", () => {
  let mockEmitPlayer: ReturnType<typeof vi.fn>;
  let mockEmitGame: ReturnType<typeof vi.fn>;
  let mockGaugeSet: ReturnType<typeof vi.fn>;
  let mockGaugeGet: ReturnType<typeof vi.fn>;
  let mockCounterInc: ReturnType<typeof vi.fn>;
  let mockCounterAdd: ReturnType<typeof vi.fn>;

  let onPlayerAddedCb: ((player: { UserId: number; Name: string }) => void) | undefined;
  let onPlayerRemovingCb: ((player: { UserId: number; Name: string }) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();

    mockEmitPlayer = vi.fn();
    mockEmitGame = vi.fn();
    mockGaugeSet = vi.fn();
    mockGaugeGet = vi.fn(() => 0);
    mockCounterInc = vi.fn();
    mockCounterAdd = vi.fn();

    onPlayerAddedCb = undefined;
    onPlayerRemovingCb = undefined;

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/observability", () => ({
      emitPlayer: mockEmitPlayer,
      emitGame: mockEmitGame,
      Counter: class {
        inc = mockCounterInc;
        add = mockCounterAdd;
      },
      Gauge: class {
        set = mockGaugeSet;
        get = mockGaugeGet;
      },
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: {
        onPlayerAdded: vi.fn((cb: (player: { UserId: number; Name: string }) => void) => {
          onPlayerAddedCb = cb;
        }),
        onPlayerRemoving: vi.fn((cb: (player: { UserId: number; Name: string }) => void) => {
          onPlayerRemovingCb = cb;
        }),
      },
    }));
  });

  async function loadAndStart() {
    const mod = await import("./TelemetryService");
    mod.TelemetryService.onStart?.();
    return mod;
  }

  it("registers lifecycle hooks on start", async () => {
    await loadAndStart();
    expect(onPlayerAddedCb).toBeDefined();
    expect(onPlayerRemovingCb).toBeDefined();
  });

  it("emits server_started game event on start", async () => {
    await loadAndStart();
    expect(mockEmitGame).toHaveBeenCalledWith(
      "server_started",
      expect.objectContaining({
        game: "test-park",
      })
    );
  });

  it("emits player_joined when player connects", async () => {
    await loadAndStart();
    const player = { UserId: 42, Name: "TestPlayer" };
    onPlayerAddedCb!(player);

    expect(mockEmitPlayer).toHaveBeenCalledWith(
      player,
      "player_joined",
      expect.objectContaining({
        userId: 42,
        playerName: "TestPlayer",
      })
    );
    expect(mockGaugeSet).toHaveBeenCalled();
  });

  it("emits player_left when player disconnects", async () => {
    await loadAndStart();
    const player = { UserId: 42, Name: "TestPlayer" };
    onPlayerRemovingCb!(player);

    expect(mockEmitPlayer).toHaveBeenCalledWith(
      player,
      "player_left",
      expect.objectContaining({
        userId: 42,
        playerName: "TestPlayer",
      })
    );
    expect(mockGaugeSet).toHaveBeenCalled();
  });

  it("trackPurchase emits economy event and increments counter", async () => {
    const mod = await loadAndStart();
    const player = { UserId: 42, Name: "TestPlayer" } as unknown as Player;
    mod.trackPurchase(player, "100 Coins", 1_000_001, 25);

    expect(mockEmitPlayer).toHaveBeenCalledWith(
      player,
      "purchase_granted",
      expect.objectContaining({
        productName: "100 Coins",
        productId: 1_000_001,
        robuxPrice: 25,
      })
    );
    expect(mockCounterInc).toHaveBeenCalled();
  });

  it("trackCoinSpend emits event and increments counter", async () => {
    const mod = await loadAndStart();
    const player = { UserId: 42, Name: "TestPlayer" } as unknown as Player;
    mod.trackCoinSpend(player, 100, "egg_hatch");

    expect(mockEmitPlayer).toHaveBeenCalledWith(
      player,
      "coins_spent",
      expect.objectContaining({
        amount: 100,
        reason: "egg_hatch",
      })
    );
    expect(mockCounterAdd).toHaveBeenCalledWith(100);
  });
});
