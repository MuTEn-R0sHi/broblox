"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditBanRevoke } from "@/lib/audit";

export async function revokeBan(
  banId: string,
  playerId: string,
  reason: string
): Promise<{ success?: boolean; error?: string }> {
  const auth = await checkPermission("moderation:ban");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  if (!reason || reason.length < 3) {
    return { error: "Reason must be at least 3 characters" };
  }

  const ban = await prisma.ban.findUnique({
    where: { id: banId },
  });

  if (!ban) {
    return { error: "Ban not found" };
  }

  if (ban.status !== "ACTIVE") {
    return { error: "Ban is not active" };
  }

  await prisma.ban.update({
    where: { id: banId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedById: auth.user.id,
      revokeReason: reason,
    },
  });

  await auditBanRevoke(auth.user.id, BigInt(playerId), banId, reason);

  return { success: true };
}
