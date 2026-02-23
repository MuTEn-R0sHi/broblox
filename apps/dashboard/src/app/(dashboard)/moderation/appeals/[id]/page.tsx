import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResolveAppealForm } from "./resolve-form";

async function getAppeal(id: string) {
  return prisma.appeal.findUnique({
    where: { id },
    include: {
      ban: {
        include: {
          issuedBy: { select: { name: true, image: true } },
          evidence: { take: 3 },
        },
      },
      resolvedBy: { select: { name: true, image: true } },
    },
  });
}

export default async function AppealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("moderation:view");

  const { id } = await params;
  const appeal = await getAppeal(id);

  if (!appeal) {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/moderation/appeals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Appeal Review</h1>
          <p className="text-muted-foreground">
            {appeal.playerName ?? `Player ${appeal.playerId}`} •{" "}
            {formatDistanceToNow(appeal.createdAt, { addSuffix: true })}
          </p>
        </div>
        <Badge
          variant={
            appeal.status === "APPROVED"
              ? "success"
              : appeal.status === "DENIED"
                ? "destructive"
                : "secondary"
          }
          className="text-lg px-4 py-1"
        >
          {appeal.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Appeal Details */}
        <Card>
          <CardHeader>
            <CardTitle>Appeal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Player</label>
              <p className="font-medium">{appeal.playerName ?? `Player ${appeal.playerId}`}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {appeal.playerId.toString()}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Appeal Reason</label>
              <div className="mt-1 p-3 bg-zinc-900 rounded-lg">
                <p className="whitespace-pre-wrap">{appeal.reason}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Submitted</label>
              <p>{format(appeal.createdAt, "PPP 'at' p")}</p>
            </div>

            {appeal.resolution && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground">Resolution</label>
                <p className="whitespace-pre-wrap">{appeal.resolution}</p>
                {appeal.resolvedBy && appeal.resolvedAt && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {appeal.resolvedBy.image && (
                      <img src={appeal.resolvedBy.image} alt="" className="h-4 w-4 rounded-full" />
                    )}
                    <span>by {appeal.resolvedBy.name}</span>
                    <span>• {format(appeal.resolvedAt, "PPP")}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Original Ban */}
        <Card>
          <CardHeader>
            <CardTitle>Original Ban</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p>
                <Badge variant={appeal.ban.type === "PERMANENT" ? "destructive" : "secondary"}>
                  {appeal.ban.type}
                </Badge>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <p className="whitespace-pre-wrap">{appeal.ban.reason}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Issued By</label>
              <div className="flex items-center gap-2 mt-1">
                {appeal.ban.issuedBy.image && (
                  <img src={appeal.ban.issuedBy.image} alt="" className="h-5 w-5 rounded-full" />
                )}
                <span>{appeal.ban.issuedBy.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(appeal.ban.createdAt, "PPP 'at' p")}
              </p>
            </div>

            {appeal.ban.evidence.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Evidence ({appeal.ban.evidence.length})
                </label>
                <div className="mt-2 space-y-2">
                  {appeal.ban.evidence.map((ev) => (
                    <div key={ev.id} className="text-sm p-2 bg-zinc-900 rounded">
                      <Badge variant="outline" className="mb-1">
                        {ev.type}
                      </Badge>
                      <p className="text-muted-foreground truncate">{ev.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link href={`/dashboard/moderation/bans/${appeal.ban.id}`}>
                <Button variant="outline" size="sm">
                  View Full Ban Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Form */}
      {appeal.status === "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle>Resolve Appeal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResolveAppealForm appealId={appeal.id} banId={appeal.ban.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
