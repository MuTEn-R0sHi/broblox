"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditMuteCreate, auditMuteSync } from "@/lib/audit";
import { bridgeCreateMuteToRoblox } from "@/lib/moderation-bridge";
import { parseInput, createMuteSchema, type CreateMuteInput } from "@/lib/schemas";

export async function createMute(input: CreateMuteInput): Promise<{ id?: string; error?: string }> {
  const auth = await checkPermission("moderation:mute");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  const parsed = parseInput(input, createMuteSchema);
  if (!parsed.success) {
    return { error: parsed.error };
  }

  const { playerId, playerName, type, reason, durationMinutes } = parsed.data;

  let playerIdBigInt: bigint;
  try {
    playerIdBigInt = BigInt(playerId);
  } catch {
    return { error: "Invalid player ID" };
  }

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const existingMute = await prisma.mute.findFirst({
    where: {
      playerId: playerIdBigInt,
      isActive: true,
      OR: [{ isPermanent: true }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (existingMute) {
    return { error: "Player already has an active mute" };
  }

  const mute = await prisma.mute.create({
    data: {
      playerId: playerIdBigInt,
      playerName,
      type,
      reason,
      durationMinutes,
      expiresAt,
      issuedById: auth.user.id,
    },
  });

  await auditMuteCreate(auth.user.id, playerIdBigInt, {
    type,
    reason,
    durationMinutes,
  });

  const syncResult = await bridgeCreateMuteToRoblox({
    muteId: mute.id,
    playerId: playerIdBigInt,
    type: mute.type,
    reason: mute.reason,
    durationMinutes: mute.durationMinutes,
    expiresAt: mute.expiresAt,
    moderatorId: auth.user.id,
    createdAt: mute.createdAt,
  });

  await auditMuteSync(auth.user.id, playerIdBigInt, mute.id, syncResult);

  if (!syncResult.ok) {
    return {
      id: mute.id,
      error:
        "Mute created, but failed to propagate to live servers. Check dashboard audit logs for details.",
    };
  }

  return { id: mute.id };
}
