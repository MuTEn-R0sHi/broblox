"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { value: "evidence", label: "Evidence" },
  { value: "user.role", label: "Role Changes" },
  { value: "auth", label: "Authentication" },
];

export function AuditFilters({ users }: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentAction = searchParams.get("action") ?? "";
  const currentTarget = searchParams.get("target") ?? "";
  const currentReason = searchParams.get("reason") ?? "";
  const currentDetails = searchParams.get("details") ?? "";
  const currentUser = searchParams.get("user") ?? "";

  function updateFilters(next: {
    action?: string;
    target?: string;
    reason?: string;
    details?: string;
    user?: string;
  }) {
    const params = new URLSearchParams();
    const newAction = next.action ?? currentAction;
    const newTarget = next.target ?? currentTarget;
    const newReason = next.reason ?? currentReason;
    const newDetails = next.details ?? currentDetails;
    const newUser = next.user ?? currentUser;

    if (newAction) params.set("action", newAction);
    if (newTarget) params.set("target", newTarget);
    if (newReason) params.set("reason", newReason);
    if (newDetails) params.set("details", newDetails);
    if (newUser) params.set("user", newUser);

    router.replace(`/dashboard/audit?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/audit");
  }

  const hasFilters =
    currentAction || currentTarget || currentReason || currentDetails || currentUser;

  function exportHref(format: "csv" | "json") {
    const params = new URLSearchParams();
    if (currentAction) params.set("action", currentAction);
    if (currentTarget) params.set("target", currentTarget);
    if (currentReason) params.set("reason", currentReason);
    if (currentDetails) params.set("details", currentDetails);
    if (currentUser) params.set("user", currentUser);
    params.set("format", format);
    return `/api/audit/export?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Select
        value={currentAction || "all"}
        onValueChange={(value) => updateFilters({ action: value === "all" ? "" : value })}
      >
        <SelectTrigger className="w-45">
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

      <Input
        value={currentTarget}
        onChange={(e) => updateFilters({ target: e.target.value })}
        placeholder="Target contains…"
        className="w-55"
      />

      <Input
        value={currentReason}
        onChange={(e) => updateFilters({ reason: e.target.value })}
        placeholder="Reason contains…"
        className="w-60"
      />

      <Input
        value={currentDetails}
        onChange={(e) => updateFilters({ details: e.target.value })}
        placeholder="Details contains…"
        className="w-60"
      />

      <Select
        value={currentUser || "all"}
        onValueChange={(value) => updateFilters({ user: value === "all" ? "" : value })}
      >
        <SelectTrigger className="w-50">
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

      <a href={exportHref("csv")} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Export CSV
      </a>
      <a href={exportHref("json")} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Export JSON
      </a>
    </div>
  );
}
