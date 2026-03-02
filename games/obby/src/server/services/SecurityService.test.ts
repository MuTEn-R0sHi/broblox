/**
 * SecurityService Tests (Obby)
 *
 * Tests the createSecurityService wrapper, onBan callback bridging
 * to moderation, and enforcer export.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("SecurityService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockEnforcer: Record<string, ReturnType<typeof vi.fn>>;
  let mockModeration: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockEnforcer = { handleViolation: vi.fn() };
    mockModeration = { ban: vi.fn() };

    mockPlayerLifecycle = {
      onPlayerRemoving: vi.fn(),
      onPlayerAdded: vi.fn(),
    };

    vi.doMock("@broblox/security", () => ({
      createSecurityService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return {
          Service: { name: "SecurityService", onInit: vi.fn(), onStart: vi.fn() },
          getEnforcer: () => mockEnforcer,
        };
      }),
    }));

    vi.doMock("@broblox/moderation", () => ({
      getModeration: vi.fn(() => mockModeration),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  async function loadService() {
    return import("./SecurityService");
  }

  it("exports SecurityService and enforcer", async () => {
    const mod = await loadService();
    expect(mod.SecurityService).toBeDefined();
    expect(mod.enforcer).toBe(mockEnforcer);
  });

  it("passes onPlayerRemoving to createSecurityService", async () => {
    await loadService();
    expect(capturedConfig).toBeDefined();
    expect(typeof capturedConfig!["onPlayerRemoving"]).toBe("function");

    const cb = vi.fn();
    (capturedConfig!["onPlayerRemoving"] as (cb: unknown) => void)(cb);
    expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalledWith(cb);
  });

  it("onBan bridges to moderation with correct args", async () => {
    await loadService();
    const enfConfig = capturedConfig!["enforcementConfig"] as Record<string, unknown>;
    const onBan = enfConfig["onBan"] as (
      player: { UserId: number; Name: string },
      banType: string,
      reason: string,
      durationHours: number
    ) => void;

    const player = { UserId: 42, Name: "TestPlayer" };
    onBan(player, "temporary", "speed hacking", 24);

    expect(mockModeration.ban).toHaveBeenCalledWith({
      playerId: 42,
      playerName: "TestPlayer",
      type: "temporary",
      reason: "speed hacking",
      durationHours: 24,
      moderatorId: "system:security",
    });
  });
});
