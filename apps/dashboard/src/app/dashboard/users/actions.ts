"use server";

import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { auditRoleChange } from "@/lib/audit";
import { canModifyRole, Role } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateUserRole(formData: FormData): Promise<void> {
  const auth = await checkPermission("users:roles");
  if (!auth) {
    redirect("/dashboard/users?error=forbidden");
  }

  const targetUserId = String(formData.get("userId") ?? "").trim();
  const newRole = String(formData.get("role") ?? "").trim() as Role;

  if (!targetUserId) {
    redirect("/dashboard/users?error=invalid_request");
  }

  if (!Object.values(Role).includes(newRole)) {
    redirect("/dashboard/users?error=invalid_role");
  }

  if (targetUserId === auth.user.id) {
    redirect("/dashboard/users?error=cannot_edit_self");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!target) {
    redirect("/dashboard/users?error=not_found");
  }

  if (!canModifyRole(auth.user.role, target.role, newRole)) {
    redirect("/dashboard/users?error=forbidden");
  }

  if (target.role === newRole) {
    return;
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  await auditRoleChange(auth.user.id, targetUserId, target.role, newRole);

  revalidatePath("/dashboard/users");
}
