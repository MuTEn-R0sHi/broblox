"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditMuteCreate } from "@/lib/audit";

interface CreateMuteInput {
  playerId: string;
  playerName?: string;
  type: "CHAT" | "VOICE" | "ALL";
  reason: string;
  durationMinutes: number;
}

export async function createMute(input: CreateMuteInput): Promise<{ id?: string; error?: string }> {
  const auth = await checkPermission("moderation:mute");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  let playerIdBigInt: bigint;
  try {
    playerIdBigInt = BigInt(input.playerId);
  } catch {
    return { error: "Invalid player ID" };
  }

  const reason = input.reason?.trim();
  if (!reason || reason.length < 5) {
    return { error: "Reason must be at least 5 characters" };
  }

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 1) {
    return { error: "Invalid duration" };
  }

  const expiresAt = new Date(Date.now() + input.durationMinutes * 60 * 1000);

  const existingMute = await prisma.mute.findFirst({
    where: {
      playerId: playerIdBigInt,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingMute) {
    return { error: "Player already has an active mute" };
  }

  const mute = await prisma.mute.create({
    data: {
      playerId: playerIdBigInt,
      playerName: input.playerName,
      type: input.type,
      reason,
      durationMinutes: input.durationMinutes,
      expiresAt,
      issuedById: auth.user.id,
    },
  });

  await auditMuteCreate(auth.user.id, playerIdBigInt, {
    type: input.type,
    reason,
    durationMinutes: input.durationMinutes,
  });

  return { id: mute.id };
}
