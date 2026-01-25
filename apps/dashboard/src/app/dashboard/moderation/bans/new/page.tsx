import { requirePermission } from "@/lib/authorize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateBanForm } from "./form";

export default async function NewBanPage() {
  await requirePermission("moderation:ban");

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Ban</h1>
        <p className="text-muted-foreground">Issue a new player ban</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ban Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateBanForm />
        </CardContent>
      </Card>
    </div>
  );
}
