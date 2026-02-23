"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBan } from "./actions";

export function CreateBanForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banType, setBanType] = useState<"TEMPORARY" | "PERMANENT">("TEMPORARY");
  const [duration, setDuration] = useState("24");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const reasonRaw = (formData.get("reason") as string | null) ?? "";
    const reason = reasonRaw.trim();
    if (reason.length < 5) {
      setError("Reason must be at least 5 characters");
      setLoading(false);
      return;
    }

    try {
      const result = await createBan({
        playerId: formData.get("playerId") as string,
        playerName: (formData.get("playerName") as string) || undefined,
        type: banType,
        reason,
        durationHours: banType === "TEMPORARY" ? Number(duration) : undefined,
        internalNote: (formData.get("internalNote") as string) || undefined,
      });

      if (result.error) {
        // If the ban was created but the live-server propagation failed, still take the
        // operator to the ban page and show a warning banner there.
        if (result.id) {
          router.push(`/dashboard/moderation/bans/${result.id}?sync=failed`);
        } else {
          setError(result.error);
        }
      } else {
        router.push(`/dashboard/moderation/bans/${result.id}`);
      }
    } catch {
      setError("Failed to create ban");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Player ID *</label>
        <Input
          name="playerId"
          placeholder="Roblox User ID (e.g., 12345678)"
          required
          pattern="[0-9]+"
          title="Enter a valid Roblox User ID (numbers only)"
        />
        <p className="text-xs text-muted-foreground">The Roblox User ID of the player to ban</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Player Name (Optional)</label>
        <Input name="playerName" placeholder="Display name for reference" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Ban Type *</label>
        <Select value={banType} onValueChange={(v) => setBanType(v as "TEMPORARY" | "PERMANENT")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEMPORARY">Temporary</SelectItem>
            <SelectItem value="PERMANENT">Permanent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {banType === "TEMPORARY" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Duration (hours) *</label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="12">12 hours</SelectItem>
              <SelectItem value="24">1 day (24 hours)</SelectItem>
              <SelectItem value="72">3 days (72 hours)</SelectItem>
              <SelectItem value="168">1 week (168 hours)</SelectItem>
              <SelectItem value="336">2 weeks (336 hours)</SelectItem>
              <SelectItem value="720">30 days (720 hours)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Reason *</label>
        <textarea
          name="reason"
          required
          placeholder="Reason for the ban (shown to the player)"
          className="flex min-h-25 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Internal Note (Staff Only)</label>
        <textarea
          name="internalNote"
          placeholder="Additional notes for staff (not shown to player)"
          className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Ban"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
