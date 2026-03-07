"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditRoleChange } from "@/lib/audit";
import { assertHighRiskConfirmation, normalizeHighRiskReason } from "@/lib/high-risk";
import { canModifyRole, Role } from "@/lib/rbac";
import { parseFormData, updateUserRoleSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateUserRole(formData: FormData): Promise<void> {
  const auth = await checkPermission("users:roles");
  if (!auth) {
    redirect("/users?error=forbidden");
  }

  const parsed = parseFormData(formData, updateUserRoleSchema);
  if (parsed.error) {
    redirect(`/users?error=${encodeURIComponent(parsed.error)}`);
  }

  const {
    userId: targetUserId,
    role: newRole,
    reason: providedReason,
    confirmation: providedConfirmation,
  } = parsed.data;

  if (targetUserId === auth.user.id) {
    redirect("/users?error=cannot_edit_self");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!target) {
    redirect("/users?error=not_found");
  }

  if (!canModifyRole(auth.user.role, target.role, newRole)) {
    redirect("/users?error=forbidden");
  }

  if (target.role === newRole) {
    return;
  }

  const reason = normalizeHighRiskReason(providedReason);
  const expectedConfirmation = `set role ${targetUserId} ${newRole}`;
  assertHighRiskConfirmation(
    providedConfirmation,
    expectedConfirmation,
    `Confirmation must match: ${expectedConfirmation}`
  );

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  await auditRoleChange(auth.user.id, targetUserId, target.role, newRole, reason);

  revalidatePath("/users");
}
