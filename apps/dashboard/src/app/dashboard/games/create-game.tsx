"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { createGame } from "./actions";

export function CreateGameButton() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Basic info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  // Roblox IDs
  const [universeIdDev, setUniverseIdDev] = useState("");
  const [universeIdStage, setUniverseIdStage] = useState("");
  const [universeIdProd, setUniverseIdProd] = useState("");
  const [placeIdDev, setPlaceIdDev] = useState("");
  const [placeIdStage, setPlaceIdStage] = useState("");
  const [placeIdProd, setPlaceIdProd] = useState("");

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createGame({
        name,
        slug,
        description: description || undefined,
        iconUrl: iconUrl || undefined,
        universeIdDev: universeIdDev || undefined,
        universeIdStage: universeIdStage || undefined,
        universeIdProd: universeIdProd || undefined,
        placeIdDev: placeIdDev || undefined,
        placeIdStage: placeIdStage || undefined,
        placeIdProd: placeIdProd || undefined,
      });
      // reset
      setName("");
      setSlug("");
      setDescription("");
      setIconUrl("");
      setUniverseIdDev("");
      setUniverseIdStage("");
      setUniverseIdProd("");
      setPlaceIdDev("");
      setPlaceIdStage("");
      setPlaceIdProd("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Game
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg">Register New Game</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Game Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(autoSlug(e.target.value));
                }}
                placeholder="My Awesome Game"
                required
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(autoSlug(e.target.value))}
                placeholder="my-awesome-game"
                required
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL-safe identifier – used in API calls and flags scoping
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the game"
                rows={2}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Icon URL (optional)</label>
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
              />
            </div>
          </div>

          {/* Roblox IDs per environment */}
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Roblox Universe IDs
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { label: "Dev", value: universeIdDev, set: setUniverseIdDev },
                  { label: "Stage", value: universeIdStage, set: setUniverseIdStage },
                  { label: "Prod", value: universeIdProd, set: setUniverseIdProd },
                ] as const
              ).map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      (set as (v: string) => void)(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0000000000"
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Roblox Place IDs (primary place)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { label: "Dev", value: placeIdDev, set: setPlaceIdDev },
                  { label: "Stage", value: placeIdStage, set: setPlaceIdStage },
                  { label: "Prod", value: placeIdProd, set: setPlaceIdProd },
                ] as const
              ).map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      (set as (v: string) => void)(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0000000000"
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Register Game"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
