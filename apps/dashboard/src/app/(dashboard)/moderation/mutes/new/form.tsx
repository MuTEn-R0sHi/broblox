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
import { createMute } from "./actions";

type MuteType = "CHAT" | "VOICE" | "ALL";

export function CreateMuteForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muteType, setMuteType] = useState<MuteType>("CHAT");
  const [duration, setDuration] = useState("60");

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
      const result = await createMute({
        playerId: formData.get("playerId") as string,
        playerName: (formData.get("playerName") as string) || undefined,
        type: muteType,
        reason,
        durationMinutes: Number(duration),
      });

      if (result.error) {
        // If the mute was created but the live-server propagation failed, still take the
        // operator to the mute page and show a warning banner there.
        if (result.id) {
          router.push(`/dashboard/moderation/mutes/${result.id}?sync=failed`);
        } else {
          setError(result.error);
        }
      } else {
        router.push(`/dashboard/moderation/mutes/${result.id}`);
      }
    } catch {
      setError("Failed to create mute");
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
        <p className="text-xs text-muted-foreground">The Roblox User ID of the player to mute</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Player Name (Optional)</label>
        <Input name="playerName" placeholder="Display name for reference" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Mute Type *</label>
        <Select value={muteType} onValueChange={(v) => setMuteType(v as MuteType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CHAT">Chat</SelectItem>
            <SelectItem value="VOICE">Voice</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Duration *</label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
            <SelectItem value="240">4 hours</SelectItem>
            <SelectItem value="1440">1 day</SelectItem>
            <SelectItem value="4320">3 days</SelectItem>
            <SelectItem value="10080">7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reason *</label>
        <textarea
          name="reason"
          required
          placeholder="Reason for the mute (shown to the player)"
          className="flex min-h-25 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Mute"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
