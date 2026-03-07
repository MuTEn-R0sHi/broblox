"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditAppealResolve, auditBanRevoke } from "@/lib/audit";
import { parseInput, resolveAppealSchema } from "@/lib/schemas";

export async function resolveAppeal(
  appealId: string,
  _banId: string,
  status: "APPROVED" | "DENIED",
  resolution: string
): Promise<{ success?: boolean; error?: string }> {
  const auth = await checkPermission("moderation:appeal");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  const parsed = parseInput({ status, resolution }, resolveAppealSchema);
  if (!parsed.success) {
    return { error: parsed.error };
  }
  const normalizedResolution = parsed.data.resolution;

  const appeal = await prisma.appeal.findUnique({
    where: { id: appealId },
    include: { ban: true },
  });

  if (!appeal) {
    return { error: "Appeal not found" };
  }

  if (appeal.status !== "PENDING") {
    return { error: "Appeal has already been resolved" };
  }

  // Update appeal
  await prisma.appeal.update({
    where: { id: appealId },
    data: {
      status,
      resolution: normalizedResolution,
      resolvedAt: new Date(),
      resolvedById: auth.user.id,
    },
  });

  // If approved, revoke the ban — always use appeal.banId from the database
  // to prevent IDOR (client-supplied banId is ignored)
  if (status === "APPROVED") {
    const revokeReason = `Appeal approved: ${normalizedResolution}`;
    await prisma.ban.update({
      where: { id: appeal.banId },
      data: {
        status: "APPEALED",
        revokedAt: new Date(),
        revokedById: auth.user.id,
        revokeReason,
      },
    });

    await auditBanRevoke(auth.user.id, appeal.ban.playerId, appeal.banId, revokeReason);
  }

  await auditAppealResolve(auth.user.id, appealId, status, normalizedResolution);

  return { success: true };
}
