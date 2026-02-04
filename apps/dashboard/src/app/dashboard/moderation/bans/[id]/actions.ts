"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditBanRevoke, auditEvidenceCreate } from "@/lib/audit";

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

export async function addEvidence(
  banId: string,
  input: { type: "text" | "screenshot" | "video" | "log"; content: string; description?: string }
): Promise<{ success?: boolean; error?: string }> {
  const auth = await checkPermission("moderation:ban");
  if (!auth) {
    return { error: "Unauthorized" };
  }

  const type = input.type;
  const content = input.content?.trim();
  const description = input.description?.trim() || undefined;

  if (!banId) {
    return { error: "Invalid ban" };
  }

  if (!content || content.length < 3) {
    return { error: "Evidence content must be at least 3 characters" };
  }

  if (content.length > 20_000) {
    return { error: "Evidence content is too large" };
  }

  if (!type || !["text", "screenshot", "video", "log"].includes(type)) {
    return { error: "Invalid evidence type" };
  }

  const ban = await prisma.ban.findUnique({ where: { id: banId }, select: { id: true } });
  if (!ban) {
    return { error: "Ban not found" };
  }

  await prisma.evidence.create({
    data: {
      banId,
      type,
      content,
      description,
      uploadedById: auth.user.id,
    },
  });

  await auditEvidenceCreate(auth.user.id, banId, {
    type,
    description,
    contentLength: content.length,
  });

  return { success: true };
}
