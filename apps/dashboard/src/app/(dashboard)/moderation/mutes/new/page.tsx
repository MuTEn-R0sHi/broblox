import { requirePermission } from "@/lib/authorize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMuteForm } from "./form";

export default async function NewMutePage() {
  await requirePermission("moderation:mute");

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Mute</h1>
        <p className="text-muted-foreground">Issue a new player mute</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mute Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateMuteForm />
        </CardContent>
      </Card>
    </div>
  );
}
