"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit, auditFlagCreate, auditFlagDelete, auditFlagKill } from "@/lib/audit";
import { checkPermission } from "@/lib/authorize";
import { assertHighRiskConfirmation, normalizeHighRiskReason } from "@/lib/high-risk";

export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabledDev: boolean;
  enabledStage: boolean;
  enabledProd: boolean;
  // Rollout fields
  rolloutPercentage: number;
  segments: string[] | null;
  startsAt: Date | null;
  endsAt: Date | null;
  // Kill switch
  isKilled: boolean;
  killedAt: Date | null;
  killedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getFlags(): Promise<FeatureFlag[]> {
  const auth = await checkPermission("view:flags");
  if (!auth) throw new Error("Unauthorized");

  const flags = await prisma.featureFlag.findMany({
    orderBy: { name: "asc" },
  });

  return flags.map((f) => ({
    ...f,
    segments: f.segments as string[] | null,
  }));
}

export async function createFlag(data: {
  key: string;
  name: string;
  description?: string;
}): Promise<FeatureFlag> {
  const auth = await checkPermission("flags:create");
  if (!auth) throw new Error("Unauthorized");

  // Validate key format (lowercase, underscores only)
  if (!/^[a-z][a-z0-9_]*$/.test(data.key)) {
    throw new Error(
      "Key must start with a letter and contain only lowercase letters, numbers, and underscores"
    );
  }

  const flag = await prisma.featureFlag.create({
    data: {
      key: data.key,
      name: data.name,
      description: data.description || null,
    },
  });

  await auditFlagCreate(auth.user.id, flag.key, flag);

  revalidatePath("/dashboard/flags");
  return flag as FeatureFlag;
}

export async function updateFlag(
  id: string,
  data: {
    name?: string;
    description?: string;
    enabledDev?: boolean;
    enabledStage?: boolean;
    enabledProd?: boolean;
  }
): Promise<FeatureFlag> {
  const auth = await checkPermission("flags:create");
  if (!auth) throw new Error("Unauthorized");

  if (data.enabledDev !== undefined) {
    const envAuth = await checkPermission("flags:toggle:dev");
    if (!envAuth) throw new Error("Insufficient permissions to modify dev flags");
  }

  if (data.enabledStage !== undefined) {
    const envAuth = await checkPermission("flags:toggle:stage");
    if (!envAuth) throw new Error("Insufficient permissions to modify staging flags");
  }

  if (data.enabledProd !== undefined) {
    const envAuth = await checkPermission("flags:toggle:prod");
    if (!envAuth) throw new Error("Insufficient permissions to modify production flags");
  }

  const before = await prisma.featureFlag.findUnique({ where: { id } });

  const flag = await prisma.featureFlag.update({
    where: { id },
    data,
  });

  await audit({
    userId: auth.user.id,
    action: "flag.update",
    target: flag.key,
    before,
    after: flag,
  });

  revalidatePath("/dashboard/flags");
  return flag as FeatureFlag;
}

export async function toggleFlagEnvironment(
  id: string,
  environment: "dev" | "stage" | "prod",
  enabled: boolean,
  opts?: { reason?: string; confirmation?: string }
): Promise<FeatureFlag> {
  const requiredPermission =
    environment === "dev"
      ? "flags:toggle:dev"
      : environment === "stage"
        ? "flags:toggle:stage"
        : "flags:toggle:prod";

  const auth = await checkPermission(requiredPermission);
  if (!auth) throw new Error(`Insufficient permissions to modify ${environment} flags`);

  const fieldMap = {
    dev: "enabledDev",
    stage: "enabledStage",
    prod: "enabledProd",
  } as const;

  const before = await prisma.featureFlag.findUnique({ where: { id } });
  if (!before) throw new Error("Flag not found");

  let reason: string | undefined;
  if (environment === "prod") {
    reason = normalizeHighRiskReason(opts?.reason);
    const expected = `toggle prod ${before.key} ${enabled ? "on" : "off"}`;
    assertHighRiskConfirmation(
      opts?.confirmation,
      expected,
      `Confirmation must match: ${expected}`
    );
  }

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: { [fieldMap[environment]]: enabled },
  });

  await audit({
    userId: auth.user.id,
    action: `flag.toggle.${environment}`,
    target: flag.key,
    before,
    after: flag,
    reason,
  });

  revalidatePath("/dashboard/flags");
  return flag as FeatureFlag;
}

export async function deleteFlag(id: string): Promise<void> {
  const auth = await checkPermission("flags:delete");
  if (!auth) throw new Error("Forbidden");

  const flag = await prisma.featureFlag.findUnique({ where: { id } });

  await prisma.featureFlag.delete({ where: { id } });

  await auditFlagDelete(auth.user.id, flag?.key ?? id, flag);

  revalidatePath("/dashboard/flags");
}

/**
 * Kill switch - immediately disable a flag across all environments
 */
export async function killFlag(
  id: string,
  opts?: { reason?: string; confirmation?: string }
): Promise<FeatureFlag> {
  const auth = await checkPermission("flags:kill");
  if (!auth) throw new Error("Forbidden");

  const before = await prisma.featureFlag.findUnique({ where: { id } });
  if (!before) throw new Error("Flag not found");

  const reason = normalizeHighRiskReason(opts?.reason);
  const expected = `kill ${before.key}`;
  assertHighRiskConfirmation(opts?.confirmation, expected, `Confirmation must match: ${expected}`);

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      isKilled: true,
      killedAt: new Date(),
      killedById: auth.user.id,
    },
  });

  await auditFlagKill(auth.user.id, flag.key, true, reason);

  revalidatePath("/dashboard/flags");
  return { ...flag, segments: flag.segments as string[] | null };
}

/**
 * Un-kill a flag (re-enable normal operation)
 */
export async function unkillFlag(
  id: string,
  opts?: { reason?: string; confirmation?: string }
): Promise<FeatureFlag> {
  const auth = await checkPermission("flags:kill");
  if (!auth) throw new Error("Forbidden");

  const before = await prisma.featureFlag.findUnique({ where: { id } });
  if (!before) throw new Error("Flag not found");

  const reason = normalizeHighRiskReason(opts?.reason);
  const expected = `unkill ${before.key}`;
  assertHighRiskConfirmation(opts?.confirmation, expected, `Confirmation must match: ${expected}`);

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      isKilled: false,
      killedAt: null,
      killedById: null,
    },
  });

  await auditFlagKill(auth.user.id, flag.key, false, reason);

  revalidatePath("/dashboard/flags");
  return { ...flag, segments: flag.segments as string[] | null };
}

/**
 * Update rollout configuration
 */
export async function updateRollout(
  id: string,
  data: {
    rolloutPercentage?: number;
    segments?: string[];
    startsAt?: Date | null;
    endsAt?: Date | null;
  }
): Promise<FeatureFlag> {
  const auth = await checkPermission("flags:create");
  if (!auth) throw new Error("Forbidden");

  // Validate percentage
  if (data.rolloutPercentage !== undefined) {
    if (data.rolloutPercentage < 0 || data.rolloutPercentage > 100) {
      throw new Error("Rollout percentage must be between 0 and 100");
    }
  }

  const before = await prisma.featureFlag.findUnique({ where: { id } });

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      rolloutPercentage: data.rolloutPercentage,
      segments: data.segments,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },
  });

  await audit({
    userId: auth.user.id,
    action: "flag.rollout.update",
    target: flag.key,
    before,
    after: flag,
  });

  revalidatePath("/dashboard/flags");
  return { ...flag, segments: flag.segments as string[] | null };
}
