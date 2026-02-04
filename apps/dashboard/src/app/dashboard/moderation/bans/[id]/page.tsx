import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Clock, User, Shield, FileText } from "lucide-react";
import { RevokeBanButton } from "./revoke-button";
import { EvidenceForm } from "./evidence-form";
import { hasPermission } from "@/lib/rbac";

async function getBan(id: string) {
  return prisma.ban.findUnique({
    where: { id },
    include: {
      issuedBy: { select: { id: true, name: true, image: true, email: true } },
      revokedBy: { select: { id: true, name: true, image: true } },
      evidence: {
        include: {
          uploadedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      appeals: {
        include: {
          resolvedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

function getBanStatusColor(status: string): "destructive" | "secondary" | "warning" | "success" {
  switch (status) {
    case "ACTIVE":
      return "destructive";
    case "EXPIRED":
      return "secondary";
    case "REVOKED":
      return "warning";
    case "APPEALED":
      return "success";
    default:
      return "secondary";
  }
}

export default async function BanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user: actor } = await requirePermission("moderation:view");

  const { id } = await params;
  const ban = await getBan(id);

  if (!ban) {
    notFound();
  }

  const isExpired = ban.expiresAt && ban.expiresAt < new Date();
  const canEdit = hasPermission(actor.role, "moderation:ban");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/moderation/bans">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Ban: {ban.playerName ?? `Player ${ban.playerId}`}
          </h1>
          <p className="text-muted-foreground">
            Created {formatDistanceToNow(ban.createdAt, { addSuffix: true })}
          </p>
        </div>
        <Badge variant={getBanStatusColor(ban.status)} className="text-lg px-4 py-1">
          {ban.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ban Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Ban Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Player ID</label>
              <p className="font-mono">{ban.playerId.toString()}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <p>
                <Badge variant={ban.type === "PERMANENT" ? "destructive" : "secondary"}>
                  {ban.type}
                </Badge>
              </p>
            </div>

            {ban.durationHours && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <p>{ban.durationHours} hours</p>
              </div>
            )}

            {ban.expiresAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expires</label>
                <p>
                  {format(ban.expiresAt, "PPP 'at' p")}
                  {isExpired && <span className="text-muted-foreground ml-2">(Expired)</span>}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason</label>
              <p className="whitespace-pre-wrap">{ban.reason}</p>
            </div>

            {ban.internalNote && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-yellow-500">
                  Internal Note (Staff Only)
                </label>
                <p className="whitespace-pre-wrap text-muted-foreground">{ban.internalNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issued By / Revoked */}
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
                {ban.issuedBy.image && (
                  <img src={ban.issuedBy.image} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span>{ban.issuedBy.name ?? ban.issuedBy.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">{format(ban.createdAt, "PPP 'at' p")}</p>
            </div>

            {ban.revokedBy && ban.revokedAt && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground">Revoked By</label>
                <div className="flex items-center gap-2 mt-1">
                  {ban.revokedBy.image && (
                    <img src={ban.revokedBy.image} alt="" className="h-6 w-6 rounded-full" />
                  )}
                  <span>{ban.revokedBy.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(ban.revokedAt, "PPP 'at' p")}
                </p>
                {ban.revokeReason && <p className="mt-2 text-sm">Reason: {ban.revokeReason}</p>}
              </div>
            )}

            {ban.status === "ACTIVE" && (
              <div className="border-t pt-4">
                <RevokeBanButton banId={ban.id} playerId={ban.playerId} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evidence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evidence ({ban.evidence.length})
            </CardTitle>
            {canEdit ? <EvidenceForm banId={ban.id} /> : null}
          </div>
        </CardHeader>
        <CardContent>
          {ban.evidence.length === 0 ? (
            <p className="text-muted-foreground">No evidence attached.</p>
          ) : (
            <div className="space-y-4">
              {ban.evidence.map((ev) => (
                <div key={ev.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{ev.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      by {ev.uploadedBy.name} •{" "}
                      {formatDistanceToNow(ev.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>
                  )}
                  <div className="bg-zinc-900 rounded p-3">
                    {ev.type === "screenshot" || ev.type === "video" ? (
                      <a
                        href={ev.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {ev.content}
                      </a>
                    ) : (
                      <pre className="text-sm whitespace-pre-wrap">{ev.content}</pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appeals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Appeals ({ban.appeals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ban.appeals.length === 0 ? (
            <p className="text-muted-foreground">No appeals submitted.</p>
          ) : (
            <div className="space-y-4">
              {ban.appeals.map((appeal) => (
                <div key={appeal.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={
                        appeal.status === "APPROVED"
                          ? "success"
                          : appeal.status === "DENIED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {appeal.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(appeal.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{appeal.reason}</p>
                  {appeal.resolution && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Resolution:</strong> {appeal.resolution}
                      </p>
                      {appeal.resolvedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {appeal.resolvedBy.name} •{" "}
                          {appeal.resolvedAt && format(appeal.resolvedAt, "PPP")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
