"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditFlagDelete, auditFlagKill } from "@/lib/audit";
import type { Role } from "@prisma/client";

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

// Roles that can modify production
const PROD_ROLES: Role[] = ["ADMIN", "ENGINEER"];
// Roles that can modify staging
const STAGE_ROLES: Role[] = ["ADMIN", "ENGINEER", "MODERATOR"];
// Roles that can modify dev (everyone authenticated)
const DEV_ROLES: Role[] = ["ADMIN", "ENGINEER", "MODERATOR", "SUPPORT", "VIEWER"];
// Roles that can use kill switch
const KILL_ROLES: Role[] = ["ADMIN", "ENGINEER"];

async function getSessionWithRole() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });

  if (!user) throw new Error("User not found");
  return { session, user };
}

function canModifyEnvironment(role: Role, environment: "dev" | "stage" | "prod"): boolean {
  switch (environment) {
    case "prod":
      return PROD_ROLES.includes(role);
    case "stage":
      return STAGE_ROLES.includes(role);
    case "dev":
      return DEV_ROLES.includes(role);
  }
}

function canKillFlag(role: Role): boolean {
  return KILL_ROLES.includes(role);
}

async function logAudit(
  userId: string,
  action: string,
  target: string,
  before: unknown,
  after: unknown
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      target,
      before: before as object,
      after: after as object,
    },
  });
}

export async function getFlags(): Promise<FeatureFlag[]> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

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
  const { user } = await getSessionWithRole();

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

  await logAudit(user.id, "flag.create", flag.key, null, flag);

  revalidatePath("/dashboard/flags");
  return flag;
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
  const { user } = await getSessionWithRole();

  // Check permissions for environment changes
  if (data.enabledProd !== undefined && !canModifyEnvironment(user.role, "prod")) {
    throw new Error("Only Admins and Engineers can modify production flags");
  }
  if (data.enabledStage !== undefined && !canModifyEnvironment(user.role, "stage")) {
    throw new Error("Insufficient permissions to modify staging flags");
  }

  const before = await prisma.featureFlag.findUnique({ where: { id } });

  const flag = await prisma.featureFlag.update({
    where: { id },
    data,
  });

  await logAudit(user.id, "flag.update", flag.key, before, flag);

  revalidatePath("/dashboard/flags");
  return flag;
}

export async function toggleFlagEnvironment(
  id: string,
  environment: "dev" | "stage" | "prod",
  enabled: boolean
): Promise<FeatureFlag> {
  const { user } = await getSessionWithRole();

  // Check role permissions
  if (!canModifyEnvironment(user.role, environment)) {
    throw new Error(`Insufficient permissions to modify ${environment} flags`);
  }

  const fieldMap = {
    dev: "enabledDev",
    stage: "enabledStage",
    prod: "enabledProd",
  } as const;

  const before = await prisma.featureFlag.findUnique({ where: { id } });

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: { [fieldMap[environment]]: enabled },
  });

  await logAudit(user.id, `flag.toggle.${environment}`, flag.key, before, flag);

  revalidatePath("/dashboard/flags");
  return flag;
}

export async function deleteFlag(id: string): Promise<void> {
  const { user } = await getSessionWithRole();

  // Only admins can delete flags
  if (user.role !== "ADMIN") {
    throw new Error("Only Admins can delete feature flags");
  }

  const flag = await prisma.featureFlag.findUnique({ where: { id } });

  await prisma.featureFlag.delete({ where: { id } });

  await auditFlagDelete(user.id, flag?.key ?? id, flag);

  revalidatePath("/dashboard/flags");
}

/**
 * Kill switch - immediately disable a flag across all environments
 */
export async function killFlag(id: string): Promise<FeatureFlag> {
  const { user } = await getSessionWithRole();

  if (!canKillFlag(user.role)) {
    throw new Error("Insufficient permissions to use kill switch");
  }

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      isKilled: true,
      killedAt: new Date(),
      killedById: user.id,
    },
  });

  await auditFlagKill(user.id, flag.key, true);

  revalidatePath("/dashboard/flags");
  return { ...flag, segments: flag.segments as string[] | null };
}

/**
 * Un-kill a flag (re-enable normal operation)
 */
export async function unkillFlag(id: string): Promise<FeatureFlag> {
  const { user } = await getSessionWithRole();

  if (!canKillFlag(user.role)) {
    throw new Error("Insufficient permissions to un-kill flag");
  }

  const flag = await prisma.featureFlag.update({
    where: { id },
    data: {
      isKilled: false,
      killedAt: null,
      killedById: null,
    },
  });

  await auditFlagKill(user.id, flag.key, false);

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
  const { user } = await getSessionWithRole();

  // Only admins and engineers can modify rollout
  if (!PROD_ROLES.includes(user.role)) {
    throw new Error("Insufficient permissions to modify rollout configuration");
  }

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

  await logAudit(user.id, "flag.rollout.update", flag.key, before, flag);

  revalidatePath("/dashboard/flags");
  return { ...flag, segments: flag.segments as string[] | null };
}
