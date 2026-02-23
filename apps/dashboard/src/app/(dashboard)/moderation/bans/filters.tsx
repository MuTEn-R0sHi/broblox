"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState } from "react";

export function BanFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "";
  const currentTarget = searchParams.get("target") ?? "";
  const currentReason = searchParams.get("reason") ?? "";
  const legacySearch = searchParams.get("search") ?? "";

  const [target, setTarget] = useState(currentTarget || legacySearch);
  const [reason, setReason] = useState(currentReason);

  function updateFilters(next: { status?: string; target?: string; reason?: string }) {
    const params = new URLSearchParams();
    const newStatus = next.status ?? currentStatus;
    const newTarget = next.target ?? currentTarget;
    const newReason = next.reason ?? currentReason;

    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newTarget) params.set("target", newTarget);
    if (newReason) params.set("reason", newReason);

    router.push(`/dashboard/moderation/bans?${params.toString()}`);
  }

  function clearFilters() {
    setTarget("");
    setReason("");
    router.push("/moderation/bans");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ target, reason });
  }

  const hasFilters = currentStatus || currentTarget || currentReason || legacySearch;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Target contains… (player name or ID)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-64"
        />
        <Input
          placeholder="Reason contains…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-64"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Select
        value={currentStatus || "all"}
        onValueChange={(value) => updateFilters({ status: value })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="EXPIRED">Expired</SelectItem>
          <SelectItem value="REVOKED">Revoked</SelectItem>
          <SelectItem value="APPEALED">Appealed</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
