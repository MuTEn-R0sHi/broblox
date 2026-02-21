import crypto from "node:crypto";

import {
  getOpenCloudModerationBridgeConfig,
  publishMessagingService,
  summarizeOpenCloudError,
  updateStandardDataStoreEntry,
} from "@/lib/roblox-open-cloud";

type BanRecord = {
  id: string;
  playerId: number;
  playerName?: string;
  type: "TEMPORARY" | "PERMANENT";
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "APPEALED";
  reason: string;
  internalNote?: string;
  durationHours?: number;
  expiresAt?: number;
  moderatorId: string;
  createdAt: number;
  revokedAt?: number;
  revokedById?: string;
  revokeReason?: string;
};

type MuteRecord = {
  id: string;
  playerId: number;
  type: "chat" | "voice" | "all";
  isActive: boolean;
  reason: string;
  durationMinutes: number;
  expiresAt: number;
  moderatorId: string;
  createdAt: number;
};

function toSafeNumber(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || BigInt(n) !== value) {
    throw new Error("PlayerId is too large to safely represent as a number");
  }
  return n;
}

function sanitizeText(input: string | undefined, maxLen: number): string | undefined {
  const normalized = input?.trim();
  if (!normalized) return undefined;
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLen - 3))}...`;
}

export type BanBridgeResult = { ok: true } | { ok: false; error: string };

export type MuteBridgeResult = { ok: true } | { ok: false; error: string };

function toMuteType(value: "CHAT" | "VOICE" | "ALL"): MuteRecord["type"] {
  switch (value) {
    case "CHAT":
      return "chat";
    case "VOICE":
      return "voice";
    case "ALL":
      return "all";
  }
}

export async function bridgeCreateBanToRoblox(opts: {
  banId: string;
  playerId: bigint;
  playerName?: string | null;
  type: "TEMPORARY" | "PERMANENT";
  reason: string;
  internalNote?: string | null;
  durationHours?: number | null;
  expiresAt?: Date | null;
  moderatorId: string;
  createdAt: Date;
  /** Route to a specific game's universe instead of the global fallback. */
  universeId?: number;
}): Promise<BanBridgeResult> {
  const cfg = getOpenCloudModerationBridgeConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      error:
        "Moderation bridge is disabled (set MODERATION_OPEN_CLOUD_ENABLED=true to propagate bans to live servers)",
    };
  }

  try {
    const playerId = toSafeNumber(opts.playerId);
    const nowUnix = Math.floor(opts.createdAt.getTime() / 1000);

    const record: BanRecord = {
      id: opts.banId,
      playerId,
      playerName: sanitizeText(opts.playerName ?? undefined, 100),
      type: opts.type,
      status: "ACTIVE",
      reason: sanitizeText(opts.reason, 500) ?? "(no reason)",
      internalNote: sanitizeText(opts.internalNote ?? undefined, 500),
      durationHours: opts.durationHours ?? undefined,
      expiresAt: opts.expiresAt ? Math.floor(opts.expiresAt.getTime() / 1000) : undefined,
      moderatorId: opts.moderatorId,
      createdAt: nowUnix,
    };

    await updateStandardDataStoreEntry<BanRecord[], BanRecord[]>({
      universeIdOverride: opts.universeId,
      datastore: {
        datastoreName: `${cfg.datastoreName}_Bans`,
        scope: cfg.scope,
      },
      entryKey: `bans_${playerId}`,
      update: (current) => {
        const bans = Array.isArray(current) ? [...current] : [];
        bans.push(record);
        return bans;
      },
    });

    // Publish cross-server invalidation/event (Open Cloud requires a string payload).
    await publishMessagingService({
      universeIdOverride: opts.universeId,
      topic: cfg.banTopic,
      message: JSON.stringify(record),
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: summarizeOpenCloudError(error) };
  }
}

export async function bridgeRevokeBanToRoblox(opts: {
  banId: string;
  playerId: bigint;
  revokedById: string;
  revokeReason: string;
  revokedAt: Date;
  /** Route to a specific game's universe instead of the global fallback. */
  universeId?: number;
}): Promise<BanBridgeResult> {
  const cfg = getOpenCloudModerationBridgeConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      error:
        "Moderation bridge is disabled (set MODERATION_OPEN_CLOUD_ENABLED=true to propagate ban revocations to live servers)",
    };
  }

  try {
    const playerId = toSafeNumber(opts.playerId);
    const revokedAtUnix = Math.floor(opts.revokedAt.getTime() / 1000);
    const revokeReason = sanitizeText(opts.revokeReason, 500) ?? "(no reason)";

    let updatedRecord: BanRecord | undefined;

    await updateStandardDataStoreEntry<BanRecord[], BanRecord[]>({
      universeIdOverride: opts.universeId,
      datastore: {
        datastoreName: `${cfg.datastoreName}_Bans`,
        scope: cfg.scope,
      },
      entryKey: `bans_${playerId}`,
      update: (current) => {
        const bans = Array.isArray(current) ? [...current] : [];
        let found = false;
        for (const ban of bans) {
          if (ban.id === opts.banId) {
            ban.status = "REVOKED";
            ban.revokedAt = revokedAtUnix;
            ban.revokedById = opts.revokedById;
            ban.revokeReason = revokeReason;
            found = true;
            updatedRecord = ban;
            break;
          }
        }
        if (!found) {
          // No record to update; leave bans unchanged.
          return bans;
        }
        return bans;
      },
    });

    // If we didn't find the ban in DataStore, we still try publishing a minimal revoke message
    // so servers will invalidate cache and re-read.
    const publishRecord: BanRecord =
      updatedRecord ??
      ({
        id: opts.banId,
        playerId,
        type: "TEMPORARY",
        status: "REVOKED",
        reason: "",
        moderatorId: opts.revokedById,
        createdAt: revokedAtUnix,
        revokedAt: revokedAtUnix,
        revokedById: opts.revokedById,
        revokeReason,
      } as BanRecord);

    await publishMessagingService({
      universeIdOverride: opts.universeId,
      topic: cfg.banTopic,
      message: JSON.stringify(publishRecord),
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: summarizeOpenCloudError(error) };
  }
}

export async function bridgeCreateMuteToRoblox(opts: {
  muteId: string;
  playerId: bigint;
  type: "CHAT" | "VOICE" | "ALL";
  reason: string;
  durationMinutes: number;
  /** Null means the mute is permanent (no expiry). */
  expiresAt?: Date | null;
  moderatorId: string;
  createdAt: Date;
  /** Route to a specific game's universe instead of the global fallback. */
  universeId?: number;
}): Promise<MuteBridgeResult> {
  const cfg = getOpenCloudModerationBridgeConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      error:
        "Moderation bridge is disabled (set MODERATION_OPEN_CLOUD_ENABLED=true to propagate mutes to live servers)",
    };
  }

  try {
    const playerId = toSafeNumber(opts.playerId);
    const nowUnix = Math.floor(opts.createdAt.getTime() / 1000);

    const record: MuteRecord = {
      id: opts.muteId,
      playerId,
      type: toMuteType(opts.type),
      isActive: true,
      reason: sanitizeText(opts.reason, 500) ?? "(no reason)",
      durationMinutes: opts.durationMinutes,
      expiresAt: opts.expiresAt ? Math.floor(opts.expiresAt.getTime() / 1000) : 0,
      moderatorId: opts.moderatorId,
      createdAt: nowUnix,
    };

    await updateStandardDataStoreEntry<MuteRecord[], MuteRecord[]>({
      universeIdOverride: opts.universeId,
      datastore: {
        datastoreName: `${cfg.datastoreName}_Mutes`,
        scope: cfg.scope,
      },
      entryKey: `mutes_${playerId}`,
      update: (current) => {
        const mutes = Array.isArray(current) ? [...current] : [];
        mutes.push(record);
        return mutes;
      },
    });

    await publishMessagingService({
      universeIdOverride: opts.universeId,
      topic: cfg.muteTopic,
      message: JSON.stringify(record),
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: summarizeOpenCloudError(error) };
  }
}

export async function bridgeRevokeMuteToRoblox(opts: {
  muteId: string;
  playerId: bigint;
  revokedById: string;
  revokedAt: Date;
  /** Route to a specific game's universe instead of the global fallback. */
  universeId?: number;
}): Promise<MuteBridgeResult> {
  const cfg = getOpenCloudModerationBridgeConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      error:
        "Moderation bridge is disabled (set MODERATION_OPEN_CLOUD_ENABLED=true to propagate mute revocations to live servers)",
    };
  }

  try {
    const playerId = toSafeNumber(opts.playerId);
    const revokedAtUnix = Math.floor(opts.revokedAt.getTime() / 1000);

    let updatedRecord: MuteRecord | undefined;

    await updateStandardDataStoreEntry<MuteRecord[], MuteRecord[]>({
      universeIdOverride: opts.universeId,
      datastore: {
        datastoreName: `${cfg.datastoreName}_Mutes`,
        scope: cfg.scope,
      },
      entryKey: `mutes_${playerId}`,
      update: (current) => {
        const mutes = Array.isArray(current) ? [...current] : [];
        for (const mute of mutes) {
          if (mute.id === opts.muteId) {
            mute.isActive = false;
            updatedRecord = mute;
            break;
          }
        }
        return mutes;
      },
    });

    const publishRecord: MuteRecord =
      updatedRecord ??
      ({
        id: opts.muteId,
        playerId,
        type: "chat",
        isActive: false,
        reason: "",
        durationMinutes: 0,
        expiresAt: revokedAtUnix,
        moderatorId: opts.revokedById,
        createdAt: revokedAtUnix,
      } satisfies MuteRecord);

    await publishMessagingService({
      universeIdOverride: opts.universeId,
      topic: cfg.muteTopic,
      message: JSON.stringify(publishRecord),
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: summarizeOpenCloudError(error) };
  }
}

export function generateBridgeId(): string {
  return crypto.randomUUID();
}
