import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const publishMessagingService = vi
  .fn<(opts: { topic: string; message: string }) => Promise<void>>()
  .mockResolvedValue(undefined);

const updateStandardDataStoreEntry = vi
  .fn<
    <TCurrent, TNext>(opts: {
      datastore: { datastoreName: string; scope?: string };
      entryKey: string;
      update: (current: TCurrent | undefined) => TNext;
    }) => Promise<void>
  >()
  .mockResolvedValue(undefined);

vi.mock("@/lib/roblox-open-cloud", () => {
  return {
    getOpenCloudModerationBridgeConfig: () => ({
      enabled: true,
      datastoreName: "TestParkModeration",
      scope: undefined,
      banTopic: "ModBanSync",
      muteTopic: "ModMuteSync",
    }),
    publishMessagingService,
    updateStandardDataStoreEntry,
    summarizeOpenCloudError: (error: unknown) => String(error),
  };
});

let bridgeCreateMuteToRoblox: typeof import("@/lib/moderation-bridge").bridgeCreateMuteToRoblox;
let bridgeRevokeMuteToRoblox: typeof import("@/lib/moderation-bridge").bridgeRevokeMuteToRoblox;
let bridgeCreateBanToRoblox: typeof import("@/lib/moderation-bridge").bridgeCreateBanToRoblox;
let bridgeRevokeBanToRoblox: typeof import("@/lib/moderation-bridge").bridgeRevokeBanToRoblox;
type MuteBridgeResult = import("@/lib/moderation-bridge").MuteBridgeResult;
type BanBridgeResult = import("@/lib/moderation-bridge").BanBridgeResult;

beforeAll(async () => {
  const mod = await import("@/lib/moderation-bridge");
  bridgeCreateMuteToRoblox = mod.bridgeCreateMuteToRoblox;
  bridgeRevokeMuteToRoblox = mod.bridgeRevokeMuteToRoblox;
  bridgeCreateBanToRoblox = mod.bridgeCreateBanToRoblox;
  bridgeRevokeBanToRoblox = mod.bridgeRevokeBanToRoblox;
});

describe("moderation-bridge (mutes)", () => {
  beforeEach(() => {
    publishMessagingService.mockClear();
    updateStandardDataStoreEntry.mockClear();
  });

  it("publishes mute create as a JSON string and writes to the _Mutes DataStore", async () => {
    const result = await bridgeCreateMuteToRoblox({
      muteId: "mute_1",
      playerId: BigInt(123),
      type: "CHAT",
      reason: "Spamming",
      durationMinutes: 10,
      expiresAt: new Date("2026-02-05T00:10:00Z"),
      moderatorId: "user_1",
      createdAt: new Date("2026-02-05T00:00:00Z"),
    });

    expect((result as MuteBridgeResult).ok).toBe(true);

    expect(updateStandardDataStoreEntry).toHaveBeenCalledTimes(1);
    const dsCall = updateStandardDataStoreEntry.mock.calls[0]?.[0];
    expect(dsCall.datastore.datastoreName).toBe("TestParkModeration_Mutes");
    expect(dsCall.entryKey).toBe("mutes_123");

    expect(publishMessagingService).toHaveBeenCalledTimes(1);
    const publishCall = publishMessagingService.mock.calls[0]?.[0];
    expect(publishCall.topic).toBe("ModMuteSync");
    expect(typeof publishCall.message).toBe("string");

    const payload = JSON.parse(publishCall.message) as {
      type: string;
      isActive: boolean;
      playerId: number;
    };
    expect(payload.playerId).toBe(123);
    expect(payload.type).toBe("chat");
    expect(payload.isActive).toBe(true);
  });

  it("publishes mute revoke as a JSON string and deactivates the record when found", async () => {
    updateStandardDataStoreEntry.mockImplementationOnce(async (opts) => {
      const existing = [
        {
          id: "mute_1",
          playerId: 123,
          type: "chat",
          isActive: true,
          reason: "Spamming",
          durationMinutes: 10,
          expiresAt: 1,
          moderatorId: "user_1",
          createdAt: 1,
        },
      ];

      // Exercise the update function to ensure it can deactivate the record.
      const next = opts.update(existing as never);
      expect(Array.isArray(next)).toBe(true);
      const [first] = next as Array<{ isActive: boolean }>;
      expect(first.isActive).toBe(false);
    });

    const result = await bridgeRevokeMuteToRoblox({
      muteId: "mute_1",
      playerId: BigInt(123),
      revokedById: "user_2",
      revokedAt: new Date("2026-02-05T00:05:00Z"),
    });

    expect((result as MuteBridgeResult).ok).toBe(true);
    expect(publishMessagingService).toHaveBeenCalledTimes(1);

    const publishCall = publishMessagingService.mock.calls[0]?.[0];
    const payload = JSON.parse(publishCall.message) as { id: string; isActive: boolean };
    expect(payload.id).toBe("mute_1");
    expect(payload.isActive).toBe(false);
  });
});

describe("moderation-bridge (bans)", () => {
  beforeEach(() => {
    publishMessagingService.mockClear();
    updateStandardDataStoreEntry.mockClear();
  });

  it("publishes ban create and writes to the _Bans DataStore", async () => {
    const result = await bridgeCreateBanToRoblox({
      banId: "ban_1",
      playerId: BigInt(456),
      playerName: "BadPlayer",
      type: "TEMPORARY",
      reason: "Exploiting",
      internalNote: "Caught on camera",
      durationHours: 24,
      expiresAt: new Date("2026-02-06T00:00:00Z"),
      moderatorId: "mod_1",
      createdAt: new Date("2026-02-05T00:00:00Z"),
    });

    expect((result as BanBridgeResult).ok).toBe(true);

    expect(updateStandardDataStoreEntry).toHaveBeenCalledTimes(1);
    const dsCall = updateStandardDataStoreEntry.mock.calls[0]?.[0];
    expect(dsCall.datastore.datastoreName).toBe("TestParkModeration_Bans");
    expect(dsCall.entryKey).toBe("bans_456");

    expect(publishMessagingService).toHaveBeenCalledTimes(1);
    const publishCall = publishMessagingService.mock.calls[0]?.[0];
    expect(publishCall.topic).toBe("ModBanSync");
    expect(typeof publishCall.message).toBe("string");

    const payload = JSON.parse(publishCall.message) as {
      id: string;
      playerId: number;
      status: string;
      type: string;
    };
    expect(payload.id).toBe("ban_1");
    expect(payload.playerId).toBe(456);
    expect(payload.status).toBe("ACTIVE");
    expect(payload.type).toBe("TEMPORARY");
  });

  it("revokes a ban and deactivates the record when found", async () => {
    updateStandardDataStoreEntry.mockImplementationOnce(async (opts) => {
      const existing = [
        {
          id: "ban_1",
          playerId: 456,
          type: "TEMPORARY",
          status: "ACTIVE",
          reason: "Exploiting",
          moderatorId: "mod_1",
          createdAt: 1000,
        },
      ];

      const next = opts.update(existing as never);
      expect(Array.isArray(next)).toBe(true);
      const [first] = next as Array<{ status: string; revokedById: string; revokeReason: string }>;
      expect(first.status).toBe("REVOKED");
      expect(first.revokedById).toBe("mod_2");
      expect(first.revokeReason).toBe("Appeal approved");
    });

    const result = await bridgeRevokeBanToRoblox({
      banId: "ban_1",
      playerId: BigInt(456),
      revokedById: "mod_2",
      revokeReason: "Appeal approved",
      revokedAt: new Date("2026-02-05T12:00:00Z"),
    });

    expect((result as BanBridgeResult).ok).toBe(true);
    expect(publishMessagingService).toHaveBeenCalledTimes(1);

    const publishCall = publishMessagingService.mock.calls[0]?.[0];
    const payload = JSON.parse(publishCall.message) as { id: string; status: string };
    expect(payload.id).toBe("ban_1");
    expect(payload.status).toBe("REVOKED");
  });

  it("returns error string for unsafe BigInt conversion", async () => {
    const result = await bridgeCreateBanToRoblox({
      banId: "ban_big",
      playerId: BigInt("99007199254740993"),
      type: "PERMANENT",
      reason: "Test",
      moderatorId: "mod_1",
      createdAt: new Date("2026-02-05T00:00:00Z"),
    });

    expect((result as BanBridgeResult).ok).toBe(false);
    expect((result as Extract<BanBridgeResult, { ok: false }>).error).toBeDefined();
  });

  it("revoke still publishes when ban record not found in DataStore", async () => {
    updateStandardDataStoreEntry.mockImplementationOnce(async (opts) => {
      // Return empty array — ban not found in DataStore
      const next = opts.update([] as never);
      expect(Array.isArray(next)).toBe(true);
      expect((next as unknown[]).length).toBe(0);
    });

    const result = await bridgeRevokeBanToRoblox({
      banId: "ban_missing",
      playerId: BigInt(789),
      revokedById: "mod_1",
      revokeReason: "Cleanup",
      revokedAt: new Date("2026-02-05T12:00:00Z"),
    });

    expect((result as BanBridgeResult).ok).toBe(true);
    // Should still publish a minimal revoke message for cross-server invalidation
    expect(publishMessagingService).toHaveBeenCalledTimes(1);
    const publishCall = publishMessagingService.mock.calls[0]?.[0];
    const payload = JSON.parse(publishCall.message) as { id: string; status: string };
    expect(payload.id).toBe("ban_missing");
    expect(payload.status).toBe("REVOKED");
  });
});
