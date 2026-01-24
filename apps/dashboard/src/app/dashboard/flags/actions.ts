"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabledDev: boolean;
  enabledStage: boolean;
  enabledProd: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Roles that can modify production
const PROD_ROLES: Role[] = ["ADMIN", "ENGINEER"];
// Roles that can modify staging
const STAGE_ROLES: Role[] = ["ADMIN", "ENGINEER", "MODERATOR"];
// Roles that can modify dev (everyone authenticated)
const DEV_ROLES: Role[] = ["ADMIN", "ENGINEER", "MODERATOR", "SUPPORT", "VIEWER"];

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

  return prisma.featureFlag.findMany({
    orderBy: { name: "asc" },
  });
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

  await logAudit(user.id, "flag.delete", flag?.key ?? id, flag, null);

  revalidatePath("/dashboard/flags");
}
