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

export function MuteFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(currentSearch);

  function updateFilters(status?: string, searchQuery?: string) {
    const params = new URLSearchParams();
    const newStatus = status ?? currentStatus;
    const newSearch = searchQuery ?? currentSearch;

    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newSearch) params.set("search", newSearch);

    router.push(`/dashboard/moderation/mutes?${params.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    router.push("/dashboard/moderation/mutes");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilters(undefined, search);
  }

  const hasFilters = currentStatus || currentSearch;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <Input
          placeholder="Search player name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[250px]"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Select
        value={currentStatus || "all"}
        onValueChange={(value) => updateFilters(value, undefined)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="EXPIRED">Expired</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
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
