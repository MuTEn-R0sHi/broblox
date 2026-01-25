"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface AuditFiltersProps {
  users: User[];
}

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "flag", label: "Feature Flags" },
  { value: "ban", label: "Bans" },
  { value: "mute", label: "Mutes" },
  { value: "appeal", label: "Appeals" },
  { value: "user.role", label: "Role Changes" },
  { value: "auth", label: "Authentication" },
];

export function AuditFilters({ users }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentAction = searchParams.get("action") ?? "";
  const currentUser = searchParams.get("user") ?? "";

  function updateFilters(action?: string, user?: string) {
    const params = new URLSearchParams();
    const newAction = action ?? currentAction;
    const newUser = user ?? currentUser;

    if (newAction) params.set("action", newAction);
    if (newUser) params.set("user", newUser);

    router.push(`/dashboard/audit?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/dashboard/audit");
  }

  const hasFilters = currentAction || currentUser;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Select value={currentAction} onValueChange={(value) => updateFilters(value, undefined)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by action" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value || "all"}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentUser}
        onValueChange={(value) => updateFilters(undefined, value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by user" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name ?? user.email ?? user.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
