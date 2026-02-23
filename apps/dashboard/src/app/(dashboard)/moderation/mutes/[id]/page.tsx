import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Clock, User, Shield } from "lucide-react";
import { RevokeMuteButton } from "./revoke-button";

type MuteStatus = "ACTIVE" | "EXPIRED" | "INACTIVE";

function getMuteStatus(mute: { isActive: boolean; expiresAt: Date | null }): MuteStatus {
  if (!mute.isActive) return "INACTIVE";
  if (mute.expiresAt !== null && mute.expiresAt <= new Date()) return "EXPIRED";
  return "ACTIVE";
}

function getMuteStatusColor(status: MuteStatus): "destructive" | "secondary" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    case "INACTIVE":
      return "warning";
  }
}

async function getMute(id: string) {
  return prisma.mute.findUnique({
    where: { id },
    include: {
      issuedBy: { select: { id: true, name: true, image: true, email: true } },
    },
  });
}

export default async function MuteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ sync?: string }>;
}) {
  await requirePermission("moderation:view");

  // Note: create flow may redirect here with `?sync=failed` if best-effort live-server
  // propagation failed.

  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const mute = await getMute(id);

  if (!mute) {
    notFound();
  }

  const status = getMuteStatus({ isActive: mute.isActive, expiresAt: mute.expiresAt });
  const isExpired = mute.expiresAt !== null && mute.expiresAt <= new Date();

  return (
    <div className="space-y-8">
      {sp?.sync === "failed" ? (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-4 text-yellow-200 text-sm">
          Mute was created, but failed to propagate to live servers. Check the audit logs for
          details, and retry if needed.
        </div>
      ) : null}
      <div className="flex items-center gap-4">
        <Link href="/moderation/mutes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Mute: {mute.playerName ?? `Player ${mute.playerId}`}
          </h1>
          <p className="text-muted-foreground">
            Created {formatDistanceToNow(mute.createdAt, { addSuffix: true })}
          </p>
        </div>
        <Badge variant={getMuteStatusColor(status)} className="text-lg px-4 py-1">
          {status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Mute Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Player ID</label>
              <p className="font-mono">{mute.playerId.toString()}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p>
                <Badge variant="secondary">{mute.type}</Badge>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Duration</label>
              <p>{mute.durationMinutes} minutes</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Expires</label>
              <p>
                {mute.expiresAt ? (
                  format(mute.expiresAt, "PPP 'at' p")
                ) : (
                  <span className="text-yellow-400">Permanent</span>
                )}
                {isExpired && <span className="text-muted-foreground ml-2">(Expired)</span>}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <p className="whitespace-pre-wrap">{mute.reason}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Moderation Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Issued By</label>
              <div className="flex items-center gap-2 mt-1">
                {mute.issuedBy.image && (
                  <img src={mute.issuedBy.image} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span>{mute.issuedBy.name ?? mute.issuedBy.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(mute.createdAt, "PPP 'at' p")}
              </p>
            </div>

            {status === "ACTIVE" && (
              <div className="border-t pt-4">
                <RevokeMuteButton muteId={mute.id} playerId={mute.playerId} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Mutes do not currently store revocation metadata in the database; revocation reasons are
            recorded in the audit log.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
