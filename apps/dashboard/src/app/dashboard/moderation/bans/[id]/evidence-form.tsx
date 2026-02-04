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
import { addEvidence } from "./actions";

type EvidenceType = "text" | "screenshot" | "video" | "log";

export function EvidenceForm({ banId }: { banId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<EvidenceType>("text");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const content = String(formData.get("content") ?? "");
    const description = String(formData.get("description") ?? "");

    try {
      const result = await addEvidence(banId, {
        type,
        content,
        description: description || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      e.currentTarget.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to add evidence");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Add Evidence
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Add Evidence</div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type *</label>
          <Select value={type} onValueChange={(v) => setType(v as EvidenceType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="log">Log</SelectItem>
              <SelectItem value="screenshot">Screenshot URL</SelectItem>
              <SelectItem value="video">Video URL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description (optional)</label>
          <Input name="description" placeholder="Short context for operators" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Content *</label>
        {type === "screenshot" || type === "video" ? (
          <Input name="content" placeholder="https://..." required />
        ) : (
          <textarea
            name="content"
            required
            placeholder={type === "log" ? "Paste logs..." : "Paste evidence text..."}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Evidence"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Evidence content is stored in the database; audit logs record metadata only.
      </p>
    </form>
  );
}
