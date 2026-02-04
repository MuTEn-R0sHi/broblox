"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditBanCreate } from "@/lib/audit";

interface CreateBanInput {
  playerId: string;
  playerName?: string;
  type: "TEMPORARY" | "PERMANENT";
  reason: string;
  durationHours?: number;
  internalNote?: string;
}

export async function createBan(input: CreateBanInput): Promise<{ id?: string; error?: string }> {
  const auth = await checkPermission("moderation:ban");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  // Validate player ID
  let playerIdBigInt: bigint;
  try {
    playerIdBigInt = BigInt(input.playerId);
  } catch {
    return { error: "Invalid player ID" };
  }

  // Validate reason
  const reason = input.reason?.trim();
  if (!reason || reason.length < 5) {
    return { error: "Reason must be at least 5 characters" };
  }

  // Calculate expiry for temporary bans
  let expiresAt: Date | undefined;
  if (input.type === "TEMPORARY" && input.durationHours) {
    expiresAt = new Date(Date.now() + input.durationHours * 60 * 60 * 1000);
  }

  // Check if player already has an active ban
  const existingBan = await prisma.ban.findFirst({
    where: {
      playerId: playerIdBigInt,
      status: "ACTIVE",
    },
  });

  if (existingBan) {
    return { error: "Player already has an active ban" };
  }

  // Create the ban
  const ban = await prisma.ban.create({
    data: {
      playerId: playerIdBigInt,
      playerName: input.playerName,
      type: input.type,
      reason,
      internalNote: input.internalNote,
      durationHours: input.durationHours,
      expiresAt,
      issuedById: auth.user.id,
    },
  });

  // Audit log
  await auditBanCreate(auth.user.id, playerIdBigInt, {
    type: input.type,
    reason,
    durationHours: input.durationHours,
  });

  return { id: ban.id };
}
