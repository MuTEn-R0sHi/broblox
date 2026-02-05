/**
 * Audit Logging Utility
 *
 * Provides functions to create immutable audit log entries.
 */

import { prisma } from "./db";
import { headers } from "next/headers";
import { createHash } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface AuditContext {
  userId: string;
  action: string;
  target?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Create an audit log entry.
 */
export async function audit(ctx: AuditContext): Promise<void> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? undefined;

  // Hash IP for privacy
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      action: ctx.action,
      target: ctx.target,
      before: ctx.before as object | undefined,
      after: ctx.after as object | undefined,
      reason: ctx.reason,
      ipHash,
      userAgent,
    },
  });
}

/**
 * Audit a flag toggle action.
 */
export async function auditFlagToggle(
  userId: string,
  flagKey: string,
  environment: "dev" | "stage" | "prod",
  enabled: boolean
): Promise<void> {
  await audit({
    userId,
    action: `flag.toggle.${environment}`,
    target: flagKey,
    after: { enabled },
  });
}

/**
 * Audit a flag creation.
 */
export async function auditFlagCreate(
  userId: string,
  flagKey: string,
  flagData: unknown
): Promise<void> {
  await audit({
    userId,
    action: "flag.create",
    target: flagKey,
    after: flagData,
  });
}

/**
 * Audit a flag deletion.
 */
export async function auditFlagDelete(
  userId: string,
  flagKey: string,
  flagData: unknown
): Promise<void> {
  await audit({
    userId,
    action: "flag.delete",
    target: flagKey,
    before: flagData,
  });
}

/**
 * Audit a flag kill-switch activation.
 */
export async function auditFlagKill(
  userId: string,
  flagKey: string,
  isKilled: boolean,
  reason?: string
): Promise<void> {
  await audit({
    userId,
    action: isKilled ? "flag.kill" : "flag.unkill",
    target: flagKey,
    reason,
  });
}

/**
 * Audit a ban creation.
 */
export async function auditBanCreate(
  userId: string,
  playerId: bigint,
  banData: { type: string; reason: string; durationHours?: number | null }
): Promise<void> {
  await audit({
    userId,
    action: "ban.create",
    target: playerId.toString(),
    after: banData,
    reason: banData.reason,
  });
}

/**
 * Audit a ban revocation.
 */
export async function auditBanRevoke(
  userId: string,
  playerId: bigint,
  banId: string,
  reason: string
): Promise<void> {
  await audit({
    userId,
    action: "ban.revoke",
    target: `${playerId}/${banId}`,
    reason,
  });
}

/**
 * Audit an appeal resolution.
 */
export async function auditAppealResolve(
  userId: string,
  appealId: string,
  status: "APPROVED" | "DENIED",
  resolution?: string
): Promise<void> {
  const normalizedResolution = resolution?.trim();
  const resolutionSummary = normalizedResolution
    ? normalizedResolution.length > 180
      ? `${normalizedResolution.slice(0, 177)}...`
      : normalizedResolution
    : undefined;

  await audit({
    userId,
    action: `appeal.${status.toLowerCase()}`,
    target: appealId,
    after: normalizedResolution ? { resolution: normalizedResolution } : undefined,
    reason: resolutionSummary,
  });
}

/**
 * Audit evidence creation.
 *
 * Intentionally avoids duplicating evidence `content` into audit logs.
 */
export async function auditEvidenceCreate(
  userId: string,
  banId: string,
  evidence: { type: string; description?: string | null; contentLength: number }
): Promise<void> {
  await audit({
    userId,
    action: "evidence.create",
    target: banId,
    after: {
      type: evidence.type,
      hasDescription: Boolean(evidence.description && evidence.description.trim().length > 0),
      contentLength: evidence.contentLength,
    },
  });
}

/**
 * Audit a mute creation.
 */
export async function auditMuteCreate(
  userId: string,
  playerId: bigint,
  muteData: { type: string; reason: string; durationMinutes: number }
): Promise<void> {
  await audit({
    userId,
    action: "mute.create",
    target: playerId.toString(),
    after: muteData,
    reason: muteData.reason,
  });
}

/**
 * Audit a mute revocation/deactivation.
 */
export async function auditMuteRevoke(
  userId: string,
  playerId: bigint,
  muteId: string,
  reason: string
): Promise<void> {
  await audit({
    userId,
    action: "mute.revoke",
    target: `${playerId}/${muteId}`,
    reason,
  });
}

/**
 * Audit a role change.
 */
export async function auditRoleChange(
  actorId: string,
  targetUserId: string,
  oldRole: string,
  newRole: string,
  reason?: string
): Promise<void> {
  await audit({
    userId: actorId,
    action: "user.role.change",
    target: targetUserId,
    before: { role: oldRole },
    after: { role: newRole },
    reason,
  });
}

/**
 * Audit user login.
 */
export async function auditLogin(userId: string): Promise<void> {
  await audit({
    userId,
    action: "auth.login",
  });
}
