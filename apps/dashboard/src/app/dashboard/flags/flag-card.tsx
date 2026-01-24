"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toggleFlagEnvironment, deleteFlag, updateFlag, type FeatureFlag } from "./actions";

function EnvironmentToggle({
  flag,
  environment,
  label,
}: {
  flag: FeatureFlag;
  environment: "dev" | "stage" | "prod";
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const enabled =
    environment === "dev"
      ? flag.enabledDev
      : environment === "stage"
        ? flag.enabledStage
        : flag.enabledProd;

  async function handleToggle() {
    setLoading(true);
    try {
      await toggleFlagEnvironment(flag.id, environment, !enabled);
    } catch {
      console.error("Failed to toggle flag");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        className={`h-2.5 w-2.5 rounded-full transition-colors ${
          enabled ? "bg-green-500" : "bg-zinc-600"
        }`}
      />
    </button>
  );
}

export function FlagCard({ flag }: { flag: FeatureFlag }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(flag.name);
  const [description, setDescription] = useState(flag.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateFlag(flag.id, { name, description });
      setEditing(false);
    } catch {
      console.error("Failed to update flag");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete flag "${flag.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteFlag(flag.id);
    } catch {
      console.error("Failed to delete flag");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="py-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setName(flag.name);
                  setDescription(flag.description || "");
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{flag.name}</CardTitle>
          <CardDescription className="font-mono text-xs">{flag.key}</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <EnvironmentToggle flag={flag} environment="dev" label="Dev" />
          <EnvironmentToggle flag={flag} environment="stage" label="Stage" />
          <EnvironmentToggle flag={flag} environment="prod" label="Prod" />
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {flag.description && (
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-muted-foreground">{flag.description}</p>
        </CardContent>
      )}
    </Card>
  );
}
