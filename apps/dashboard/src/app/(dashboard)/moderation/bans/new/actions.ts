"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditBanCreate, auditBanSync } from "@/lib/audit";
import { bridgeCreateBanToRoblox } from "@/lib/moderation-bridge";
import { parseInput, createBanSchema, type CreateBanInput } from "@/lib/schemas";

export async function createBan(input: CreateBanInput): Promise<{ id?: string; error?: string }> {
  const auth = await checkPermission("moderation:ban");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  const parsed = parseInput(input, createBanSchema);
  if (parsed.error) {
    return { error: parsed.error };
  }

  const { playerId, playerName, type, reason, durationHours, internalNote } = parsed.data;

  // Validate player ID (BigInt conversion)
  let playerIdBigInt: bigint;
  try {
    playerIdBigInt = BigInt(playerId);
  } catch {
    return { error: "Invalid player ID" };
  }

  // Calculate expiry for temporary bans
  let expiresAt: Date | undefined;
  if (type === "TEMPORARY" && durationHours) {
    expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
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
      playerName: playerName,
      type: type,
      reason,
      internalNote: internalNote,
      durationHours: durationHours,
      expiresAt,
      issuedById: auth.user.id,
    },
  });

  // Audit log
  await auditBanCreate(auth.user.id, playerIdBigInt, {
    type: type,
    reason,
    durationHours: durationHours,
  });

  const syncResult = await bridgeCreateBanToRoblox({
    banId: ban.id,
    playerId: playerIdBigInt,
    playerName: ban.playerName,
    type: ban.type,
    reason: ban.reason,
    internalNote: ban.internalNote,
    durationHours: ban.durationHours,
    expiresAt: ban.expiresAt,
    moderatorId: auth.user.id,
    createdAt: ban.createdAt,
  });

  await auditBanSync(auth.user.id, playerIdBigInt, ban.id, syncResult);

  if (!syncResult.ok) {
    return {
      id: ban.id,
      error:
        "Ban created, but failed to propagate to live servers. Check dashboard audit logs for details.",
    };
  }

  return { id: ban.id };
}
