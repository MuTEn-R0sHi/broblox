/**
 * HandshakeService Tests (Test Park)
 *
 * Tests the client-server handshake handler including:
 * - Protocol version validation
 * - Session ID generation
 * - Error on protocol mismatch
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("HandshakeService (test-park)", () => {
  let handshakeHandler: ((player: unknown, request: unknown) => unknown) | undefined;
  let mockValidation: {
    compatible: boolean;
    reason?: string;
    minVersion?: number;
    serverVersion: number;
  };

  beforeEach(() => {
    vi.resetModules();
    handshakeHandler = undefined;
    mockValidation = { compatible: true, serverVersion: 2 };

    const mockRegistry = {
      onFunction: vi.fn((name: string, handler: (...args: unknown[]) => unknown) => {
        if (name === "Handshake") {
          handshakeHandler = handler;
        }
      }),
    };

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("@broblox/net", () => ({
      ok: (val: unknown) => ({ ok: true, value: val }),
      err: (code: string, meta: unknown) => ({ ok: false, code, meta }),
      ErrorCode: { ProtocolMismatch: "PROTOCOL_MISMATCH" },
      validateProtocolVersion: vi.fn(() => mockValidation),
      getCurrentProtocolVersion: vi.fn(() => 2),
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("shared/remotes", () => ({
      HandshakeRequest: {},
    }));
  });

  async function loadAndStart() {
    const mod = await import("./HandshakeService");
    mod.HandshakeService.onStart!();
    return mod;
  }

  it("exports HandshakeService with onStart", async () => {
    const mod = await import("./HandshakeService");
    expect(mod.HandshakeService).toBeDefined();
    expect(typeof mod.HandshakeService.onStart).toBe("function");
  });

  it("returns session info on compatible handshake", async () => {
    await loadAndStart();
    const player = { Name: "TestPlayer", UserId: 42 };
    const result = handshakeHandler!(player, {
      protocolVersion: 2,
      deviceClass: "Desktop",
    }) as { ok: boolean; value: Record<string, unknown> };

    expect(result.ok).toBe(true);
    expect(result.value.serverProtocolVersion).toBe(2);
    expect(result.value.sessionId).toBeDefined();
    expect(typeof result.value.sessionId).toBe("string");
  });

  it("returns error on protocol mismatch", async () => {
    mockValidation = {
      compatible: false,
      reason: "Client too old",
      minVersion: 1,
      serverVersion: 2,
    };
    await loadAndStart();
    const player = { Name: "TestPlayer", UserId: 42 };
    const result = handshakeHandler!(player, {
      protocolVersion: 0,
      deviceClass: "Desktop",
    }) as { ok: boolean; code: string };

    expect(result.ok).toBe(false);
    expect(result.code).toBe("PROTOCOL_MISMATCH");
  });

  it("generates unique session IDs", async () => {
    await loadAndStart();
    const player = { Name: "TestPlayer", UserId: 42 };
    const r1 = handshakeHandler!(player, {
      protocolVersion: 2,
      deviceClass: "Desktop",
    }) as { ok: boolean; value: Record<string, unknown> };
    const r2 = handshakeHandler!(player, {
      protocolVersion: 2,
      deviceClass: "Desktop",
    }) as { ok: boolean; value: Record<string, unknown> };

    expect(r1.value.sessionId).not.toBe(r2.value.sessionId);
  });
});
