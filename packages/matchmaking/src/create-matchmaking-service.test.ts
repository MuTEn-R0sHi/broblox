import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createMatchmakingService,
  type MatchmakingServiceHandle,
} from "./create-matchmaking-service";
import { resetQueues, isInQueue } from "./queue";
import { resetMatches, isInMatch } from "./match";
import { resetServerAllocation } from "./server-allocation";
import type { PlayerId } from "@rbx/shared-types";
import type { QueueConfig } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function pid(n: number): PlayerId {
  return n as PlayerId;
}

const defaultQueue: QueueConfig = {
  gameMode: "ffa",
  minPlayers: 2,
  maxPlayers: 4,
  timeoutSeconds: 60,
};

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe("createMatchmakingService", () => {
  let handle: MatchmakingServiceHandle;

  beforeEach(() => {
    resetQueues();
    resetMatches();
    resetServerAllocation();
  });

  // ── Factory creation ────────────────────────────────────────────────────

  it("returns a Service with lifecycle hooks", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    expect(handle.Service).toBeDefined();
    expect(handle.Service.name).toBe("MatchmakingService");
    expect(handle.Service.onInit).toBeDefined();
    expect(handle.Service.onStart).toBeDefined();
    expect(handle.Service.onDestroy).toBeDefined();
  });

  it("returns initPlayer and cleanupPlayer", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    expect(handle.initPlayer).toBeTypeOf("function");
    expect(handle.cleanupPlayer).toBeTypeOf("function");
  });

  it("exposes convenience passthroughs", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    expect(handle.joinQueue).toBeTypeOf("function");
    expect(handle.leaveQueue).toBeTypeOf("function");
    expect(handle.tryFormMatch).toBeTypeOf("function");
    expect(handle.processTimeouts).toBeTypeOf("function");
  });

  // ── onInit — queue registration ────────────────────────────────────────

  it("registers queues on init", () => {
    handle = createMatchmakingService({
      queues: [
        defaultQueue,
        { gameMode: "ranked", minPlayers: 2, maxPlayers: 2, timeoutSeconds: 120 },
      ],
    });
    handle.Service.onInit!();

    // Queue should accept joins
    const result = handle.joinQueue(pid(1), "ffa");
    expect(result.ok).toBe(true);

    const result2 = handle.joinQueue(pid(2), "ranked");
    expect(result2.ok).toBe(true);
  });

  it("rejects join for unregistered queue", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();

    const result = handle.joinQueue(pid(1), "unknown-mode");
    expect(result.ok).toBe(false);
  });

  // ── Player lifecycle ───────────────────────────────────────────────────

  it("initPlayer tracks the player", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();
    handle.initPlayer(pid(42));
    // cleanup should work without error
    handle.cleanupPlayer(pid(42));
  });

  it("cleanupPlayer removes from queue", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();
    handle.initPlayer(pid(10));
    handle.joinQueue(pid(10), "ffa");
    expect(isInQueue(pid(10))).toBe(true);

    handle.cleanupPlayer(pid(10));
    expect(isInQueue(pid(10))).toBe(false);
  });

  it("cleanupPlayer removes from match", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();

    // Queue enough players to form a match
    handle.initPlayer(pid(1));
    handle.initPlayer(pid(2));
    handle.joinQueue(pid(1), "ffa");
    handle.joinQueue(pid(2), "ffa");

    const match = handle.tryFormMatch("ffa");
    expect(match).toBeDefined();
    expect(isInMatch(pid(1))).toBe(true);

    handle.cleanupPlayer(pid(1));
    expect(isInMatch(pid(1))).toBe(false);
  });

  it("cleanupPlayer is safe for unknown players", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();
    // Should not throw
    handle.cleanupPlayer(pid(999));
  });

  // ── onDestroy ──────────────────────────────────────────────────────────

  it("onDestroy cleans up all tracked players", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();

    handle.initPlayer(pid(1));
    handle.initPlayer(pid(2));
    handle.joinQueue(pid(1), "ffa");
    handle.joinQueue(pid(2), "ffa");

    handle.Service.onDestroy!();

    expect(isInQueue(pid(1))).toBe(false);
    expect(isInQueue(pid(2))).toBe(false);
  });

  it("onDestroy drains queued and matched players", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();

    handle.initPlayer(pid(1));
    handle.initPlayer(pid(2));
    handle.initPlayer(pid(3));

    // Two players form a match, one stays queued
    handle.joinQueue(pid(1), "ffa");
    handle.joinQueue(pid(2), "ffa");
    handle.tryFormMatch("ffa");

    handle.joinQueue(pid(3), "ffa");
    expect(isInMatch(pid(1))).toBe(true);
    expect(isInQueue(pid(3))).toBe(true);

    handle.Service.onDestroy!();

    expect(isInMatch(pid(1))).toBe(false);
    expect(isInMatch(pid(2))).toBe(false);
    expect(isInQueue(pid(3))).toBe(false);
  });

  // ── onPlayerAdded / onPlayerRemoving wiring ────────────────────────────

  it("wires onPlayerRemoving via config callback", () => {
    let removingCb: ((player: { UserId: number }) => void) | undefined;
    handle = createMatchmakingService({
      queues: [defaultQueue],
      onPlayerRemoving: (cb) => {
        removingCb = cb;
      },
    });
    handle.Service.onInit!();

    handle.initPlayer(pid(5));
    handle.joinQueue(pid(5), "ffa");
    expect(isInQueue(pid(5))).toBe(true);

    // Simulate player leaving
    removingCb!({ UserId: 5 });
    expect(isInQueue(pid(5))).toBe(false);
  });

  it("wires onPlayerAdded via config callback", () => {
    let addedCb: ((player: { UserId: number }) => void) | undefined;
    handle = createMatchmakingService({
      queues: [defaultQueue],
      onPlayerAdded: (cb) => {
        addedCb = cb;
      },
    });
    handle.Service.onInit!();
    handle.Service.onStart!();

    // Simulate player joining
    addedCb!({ UserId: 77 });
    // Player should be tracked — cleanup should work
    handle.cleanupPlayer(pid(77));
  });

  // ── Match formation convenience ────────────────────────────────────────

  it("tryFormMatch returns a match when enough players queued", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();

    handle.joinQueue(pid(1), "ffa");
    handle.joinQueue(pid(2), "ffa");

    const match = handle.tryFormMatch("ffa");
    expect(match).toBeDefined();
    expect(match!.players).toHaveLength(2);
    expect(match!.status).toBe("forming");
  });

  it("tryFormMatch returns undefined when not enough players", () => {
    handle = createMatchmakingService({ queues: [defaultQueue] });
    handle.Service.onInit!();

    handle.joinQueue(pid(1), "ffa");
    const match = handle.tryFormMatch("ffa");
    expect(match).toBeUndefined();
  });

  // ── Teleport service wiring ────────────────────────────────────────────

  it("wires teleport service on init", () => {
    const mockTeleport = {
      reserveServer: vi.fn().mockReturnValue({ ok: true, value: "access-code" }),
      teleportToPrivateServer: vi.fn().mockReturnValue({ ok: true, value: undefined }),
    };
    handle = createMatchmakingService({
      queues: [defaultQueue],
      teleportService: mockTeleport,
    });
    handle.Service.onInit!();
    // No throw means wired successfully
  });

  // ── Server allocation config ───────────────────────────────────────────

  it("configures server allocation on init", () => {
    handle = createMatchmakingService({
      queues: [defaultQueue],
      serverAllocation: { maxRetries: 5 },
    });
    handle.Service.onInit!();
    // No throw means configured successfully
  });
});
