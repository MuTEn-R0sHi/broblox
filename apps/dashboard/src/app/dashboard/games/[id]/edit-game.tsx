"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, X, Trash2 } from "lucide-react";
import { updateGame, deleteGame, type GameRecord } from "../actions";
import { useRouter } from "next/navigation";

interface EditGameProps {
  game: GameRecord;
  canManage: boolean;
  canDelete: boolean;
}

export function EditGameButton({ game, canManage, canDelete }: EditGameProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Fields
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description ?? "");
  const [iconUrl, setIconUrl] = useState(game.iconUrl ?? "");
  const [isActive, setIsActive] = useState(game.isActive);

  const [universeIdDev, setUniverseIdDev] = useState(game.universeIdDev ?? "");
  const [universeIdStage, setUniverseIdStage] = useState(game.universeIdStage ?? "");
  const [universeIdProd, setUniverseIdProd] = useState(game.universeIdProd ?? "");
  const [placeIdDev, setPlaceIdDev] = useState(game.placeIdDev ?? "");
  const [placeIdStage, setPlaceIdStage] = useState(game.placeIdStage ?? "");
  const [placeIdProd, setPlaceIdProd] = useState(game.placeIdProd ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateGame(game.id, {
        name,
        description: description || null,
        iconUrl: iconUrl || null,
        isActive,
        universeIdDev: universeIdDev || null,
        universeIdStage: universeIdStage || null,
        universeIdProd: universeIdProd || null,
        placeIdDev: placeIdDev || null,
        placeIdStage: placeIdStage || null,
        placeIdProd: placeIdProd || null,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update game");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete game "${game.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteGame(game.id);
      router.push("/dashboard/games");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete game");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        )}
      </div>

      {open && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg">Edit Game</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Game Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Slug</label>
                  <input
                    type="text"
                    value={game.slug}
                    disabled
                    className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm font-mono opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Slug cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Icon URL</label>
                  <input
                    type="url"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Active</span>
                  <span className="text-xs text-muted-foreground">
                    (inactive games are hidden from API consumers)
                  </span>
                </label>
              </div>

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
                  Roblox Place IDs
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
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
