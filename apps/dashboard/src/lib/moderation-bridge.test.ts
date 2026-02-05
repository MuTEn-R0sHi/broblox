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
      datastoreName: "StarterModeration",
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
type MuteBridgeResult = import("@/lib/moderation-bridge").MuteBridgeResult;

beforeAll(async () => {
  const mod = await import("@/lib/moderation-bridge");
  bridgeCreateMuteToRoblox = mod.bridgeCreateMuteToRoblox;
  bridgeRevokeMuteToRoblox = mod.bridgeRevokeMuteToRoblox;
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
    expect(dsCall.datastore.datastoreName).toBe("StarterModeration_Mutes");
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
