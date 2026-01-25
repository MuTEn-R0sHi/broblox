"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditAppealResolve, auditBanRevoke } from "@/lib/audit";

export async function resolveAppeal(
  appealId: string,
  banId: string,
  status: "APPROVED" | "DENIED",
  resolution: string
): Promise<{ success?: boolean; error?: string }> {
  const auth = await checkPermission("moderation:appeal");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  if (!resolution || resolution.length < 5) {
    return { error: "Resolution must be at least 5 characters" };
  }

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
      resolution,
      resolvedAt: new Date(),
      resolvedById: auth.user.id,
    },
  });

  // If approved, revoke the ban
  if (status === "APPROVED") {
    await prisma.ban.update({
      where: { id: banId },
      data: {
        status: "APPEALED",
        revokedAt: new Date(),
        revokedById: auth.user.id,
        revokeReason: `Appeal approved: ${resolution}`,
      },
    });

    await auditBanRevoke(
      auth.user.id,
      appeal.ban.playerId,
      banId,
      `Appeal approved: ${resolution}`
    );
  }

  await auditAppealResolve(auth.user.id, appealId, status);

  return { success: true };
}
