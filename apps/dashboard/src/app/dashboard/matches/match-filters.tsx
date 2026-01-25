"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState, useTransition } from "react";

interface MatchFiltersProps {
  currentStatus?: string;
  currentGameMode?: string;
  currentSearch?: string;
  gameModes: string[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ERRORED", label: "Errored" },
];

export function MatchFilters({
  currentStatus,
  currentGameMode,
  currentSearch,
  gameModes,
}: MatchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch ?? "");

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 on filter change
    params.delete("page");

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    startTransition(() => {
      router.push(`/dashboard/matches?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: search || undefined });
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/dashboard/matches");
    });
  };

  const hasFilters = currentStatus || currentGameMode || currentSearch;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by match ID, server, or player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Search
        </Button>
      </form>

      <div className="flex gap-2">
        <Select
          value={currentStatus ?? ""}
          onChange={(e) => updateFilters({ status: e.target.value || undefined })}
          className="w-[140px]"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select
          value={currentGameMode ?? ""}
          onChange={(e) => updateFilters({ gameMode: e.target.value || undefined })}
          className="w-[140px]"
        >
          <option value="">All Modes</option>
          {gameModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
