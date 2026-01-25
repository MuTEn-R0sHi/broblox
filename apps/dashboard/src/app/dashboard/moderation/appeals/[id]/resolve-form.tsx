"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveAppeal } from "./actions";

interface ResolveAppealFormProps {
  appealId: string;
  banId: string;
}

export function ResolveAppealForm({ appealId, banId }: ResolveAppealFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(status: "APPROVED" | "DENIED") {
    if (!resolution.trim()) {
      setError("Please provide a resolution message");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resolveAppeal(appealId, banId, status, resolution);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        router.push("/dashboard/moderation/appeals");
      }
    } catch {
      setError("Failed to resolve appeal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Resolution Message *</label>
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Explain your decision..."
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => handleResolve("APPROVED")}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? "Processing..." : "Approve (Remove Ban)"}
        </Button>
        <Button onClick={() => handleResolve("DENIED")} disabled={loading} variant="destructive">
          {loading ? "Processing..." : "Deny Appeal"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Approving will revoke the ban. Denying will keep the ban active.
      </p>
    </div>
  );
}
