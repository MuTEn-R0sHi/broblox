"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditMuteRevoke, auditMuteSync } from "@/lib/audit";
import { bridgeRevokeMuteToRoblox } from "@/lib/moderation-bridge";

export async function revokeMute(
  muteId: string,
  _playerId: string,
  reason: string
): Promise<{ success?: boolean; warning?: string; error?: string }> {
  const auth = await checkPermission("moderation:mute");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  const revokeReason = reason?.trim();
  if (!revokeReason || revokeReason.length < 3) {
    return { error: "Reason must be at least 3 characters" };
  }

  const mute = await prisma.mute.findUnique({
    where: { id: muteId },
  });

  if (!mute) {
    return { error: "Mute not found" };
  }

  if (!mute.isActive) {
    return { error: "Mute is not active" };
  }

  await prisma.mute.update({
    where: { id: muteId },
    data: {
      isActive: false,
    },
  });

  // Always use mute.playerId from the database to prevent IDOR
  // (client-supplied playerId is ignored)
  await auditMuteRevoke(auth.user.id, mute.playerId, muteId, revokeReason);

  const syncResult = await bridgeRevokeMuteToRoblox({
    muteId,
    playerId: mute.playerId,
    revokedById: auth.user.id,
    revokedAt: new Date(),
  });

  await auditMuteSync(auth.user.id, mute.playerId, muteId, syncResult);

  if (!syncResult.ok) {
    return {
      success: true,
      warning:
        "Mute revoked, but failed to propagate to live servers. Check dashboard audit logs for details.",
    };
  }

  return { success: true };
}
