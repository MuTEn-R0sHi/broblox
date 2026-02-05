"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { revokeBan } from "./actions";

interface RevokeBanButtonProps {
  banId: string;
  playerId: bigint;
}

export function RevokeBanButton({ banId, playerId }: RevokeBanButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function handleRevoke() {
    if (!reason.trim()) {
      setError("Please provide a reason for revoking the ban");
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const result = await revokeBan(banId, playerId.toString(), reason);
      if (result.error) {
        setError(result.error);
      } else {
        if (result.warning) setWarning(result.warning);
        router.refresh();
        setShowForm(false);
      }
    } catch {
      setError("Failed to revoke ban");
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <Button variant="outline" onClick={() => setShowForm(true)}>
        Revoke Ban
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      {warning && (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-3 text-yellow-200 text-sm">
          {warning}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Reason for Revocation *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this ban being revoked?"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleRevoke} disabled={loading} variant="destructive">
          {loading ? "Revoking..." : "Confirm Revoke"}
        </Button>
        <Button variant="ghost" onClick={() => setShowForm(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
