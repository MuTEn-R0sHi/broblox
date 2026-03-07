/**
 * ActionService Tests (Test Park – service level)
 *
 * Tests kill-action routing to quest objectives and achievement progress
 * trackers in the game-level ActionService.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ActionService (test-park)", () => {
  let capturedDoAction:
    | ((
        player: { UserId: number; Name: string },
        request: { actionId: string; timestamp: number }
      ) => unknown)
    | undefined;

  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockGetQuests: ReturnType<typeof vi.fn>;
  let mockGetAchievements: ReturnType<typeof vi.fn>;
  let mockIncrementObjective: ReturnType<typeof vi.fn>;
  let mockIncrementProgress: ReturnType<typeof vi.fn>;
  let mockValidateActionRequest: ReturnType<typeof vi.fn>;
  let mockTrack: ReturnType<typeof vi.fn>;

  const mockPlayer = { UserId: 99, Name: "TestPlayer" };

  beforeEach(() => {
    vi.resetModules();
    capturedDoAction = undefined;

    mockIncrementObjective = vi.fn();
    mockIncrementProgress = vi.fn();
    mockGetQuests = vi.fn(() => ({ incrementObjective: mockIncrementObjective }));
    mockGetAchievements = vi.fn(() => ({ incrementProgress: mockIncrementProgress }));
    mockValidateActionRequest = vi.fn(() => ({ ok: true }));
    mockTrack = vi.fn();

    mockRegistry = {
      onFunction: vi.fn((name: string, cb: unknown) => {
        if (name === "DoAction") {
          capturedDoAction = cb as typeof capturedDoAction;
        }
      }),
    };

    vi.doMock("@broblox/core", () => ({
      Service: {},
      createLogger: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    }));

    vi.doMock("@broblox/net", () => ({
      ok: vi.fn((v: unknown) => ({ ok: true, value: v })),
      err: vi.fn((code: unknown, meta: unknown) => ({ ok: false, code, meta })),
      ErrorCode: { FeatureDisabled: "FeatureDisabled", InvalidPayload: "InvalidPayload" },
    }));

    vi.doMock("@broblox/config-featureflags", () => ({
      isFlagEnabled: vi.fn(() => true),
    }));

    vi.doMock("@broblox/constants", () => ({
      TIMESTAMP_TOLERANCE_MS: 5000,
    }));

    vi.doMock("shared/remotes", () => ({}));

    vi.doMock("shared/action-validation", () => ({
      validateActionRequest: mockValidateActionRequest,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./QuestService", () => ({
      getQuests: mockGetQuests,
    }));

    vi.doMock("./RewardsService", () => ({
      getAchievements: mockGetAchievements,
    }));

    vi.doMock("./AnalyticsService", () => ({
      getEventTracker: () => ({ track: mockTrack }),
    }));
  });

  async function loadService() {
    const mod = await import("./ActionService");
    (mod.ActionService as unknown as { onStart(): void }).onStart();
    return mod;
  }

  function fireAction(actionId: string) {
    return capturedDoAction!(mockPlayer, { actionId, timestamp: 0 });
  }

  it("exports ActionService", async () => {
    const mod = await loadService();
    expect(mod.ActionService).toBeDefined();
  });

  it("registers a DoAction handler on start", async () => {
    await loadService();
    expect(mockRegistry.onFunction).toHaveBeenCalledWith("DoAction", expect.any(Function));
    expect(capturedDoAction).toBeTypeOf("function");
  });

  describe("kill action routing", () => {
    it("increments the kill quest objective by 1 on a kill action", async () => {
      await loadService();
      fireAction("kill");
      expect(mockIncrementObjective).toHaveBeenCalledWith("kill", 1);
    });

    it("increments ach_first_kill progress by 1 on a kill action", async () => {
      await loadService();
      fireAction("kill");
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_first_kill", 1);
    });

    it("increments ach_kill_100 progress by 1 on a kill action", async () => {
      await loadService();
      fireAction("kill");
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_kill_100", 1);
    });

    it("tracks action.kill analytics event on a kill action", async () => {
      await loadService();
      fireAction("kill");
      expect(mockTrack).toHaveBeenCalledWith("action.kill", mockPlayer.UserId, {});
    });

    it("does not call quest, achievement, or analytics services for non-kill actions", async () => {
      await loadService();
      fireAction("jump");
      expect(mockGetQuests).not.toHaveBeenCalled();
      expect(mockGetAchievements).not.toHaveBeenCalled();
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it("does not route kill when validation fails", async () => {
      mockValidateActionRequest.mockReturnValue({ ok: false, reason: "feature_disabled" });
      await loadService();
      fireAction("kill");
      expect(mockIncrementObjective).not.toHaveBeenCalled();
      expect(mockIncrementProgress).not.toHaveBeenCalled();
    });

    it("is graceful when quest store is unavailable", async () => {
      mockGetQuests.mockReturnValue(undefined);
      await loadService();
      expect(() => fireAction("kill")).not.toThrow();
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_first_kill", 1);
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_kill_100", 1);
    });

    it("is graceful when achievement store is unavailable", async () => {
      mockGetAchievements.mockReturnValue(undefined);
      await loadService();
      expect(() => fireAction("kill")).not.toThrow();
      expect(mockIncrementObjective).toHaveBeenCalledWith("kill", 1);
    });
  });
});
