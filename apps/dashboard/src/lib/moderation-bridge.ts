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
      topic: cfg.banTopic,
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
