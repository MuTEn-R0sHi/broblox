import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { hasPermission, getRoleDisplayName, getRoleDescription, Role } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleChangeForm } from "./role-change-form";

async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "You don't have permission to change roles.",
  invalid_request: "Invalid request.",
  invalid_role: "Invalid role selected.",
  cannot_edit_self: "You can't change your own role.",
  not_found: "User not found.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user: actor } = await requirePermission("users:view");
  const users = await getUsers();
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  const canEditRoles = hasPermission(actor.role, "users:roles");
  const roleOptions = Object.values(Role).map((role) => ({
    value: role,
    label: getRoleDisplayName(role),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage dashboard access and roles</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Role changes require a reason and an exact typed confirmation phrase (you’ll be prompted
            on save).
          </p>
          {errorMessage ? (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm">
              {errorMessage}
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === actor.id;
                const canChangeThisUser = canEditRoles && !isSelf;

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          <img src={u.image} alt="" className="h-7 w-7 rounded-full" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-muted" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {u.name ?? u.email ?? "(unknown)"}
                            {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getRoleDescription(u.role)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                    <TableCell>
                      <RoleChangeForm
                        userId={u.id}
                        defaultRole={u.role}
                        roleOptions={roleOptions}
                        disabled={!canChangeThisUser}
                      />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {u.id}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {!canEditRoles ? (
            <p className="text-xs text-muted-foreground mt-4">
              You don’t have permission to change roles.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
