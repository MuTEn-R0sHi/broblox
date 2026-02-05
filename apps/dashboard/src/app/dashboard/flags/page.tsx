import { getFlags } from "./actions";
import { FlagCard } from "./flag-card";
import { CreateFlagButton } from "./create-flag";
import { requirePermission } from "@/lib/authorize";

export default async function FlagsPage() {
  await requirePermission("view:flags");
  const flags = await getFlags();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">Manage feature flags across all environments</p>
          <p className="mt-2 text-xs text-muted-foreground">
            PROD toggles and kill/unkill require a reason and an exact typed confirmation phrase.
          </p>
        </div>
        <CreateFlagButton />
      </div>

      {flags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-muted-foreground">No feature flags yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click &quot;New Flag&quot; to create your first one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {flags.map((flag) => (
            <FlagCard key={flag.id} flag={flag} />
          ))}
        </div>
      )}
    </div>
  );
}
