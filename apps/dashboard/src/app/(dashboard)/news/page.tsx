import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/authorize";
import { hasPermission } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { archiveNewsPost, deleteNewsPost } from "./actions";

interface NewsListPageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function NewsListPage({ searchParams }: NewsListPageProps) {
  const { user } = await requirePermission("news:view");
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const statusFilter = params.status as "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = statusFilter ? { status: statusFilter } : {};

  const [posts, total] = await Promise.all([
    prisma.newsPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        author: { select: { name: true } },
        game: { select: { name: true } },
      },
    }),
    prisma.newsPost.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const canCreate = hasPermission(user.role, "news:create");
  const canEdit = hasPermission(user.role, "news:edit");
  const canDelete = hasPermission(user.role, "news:delete");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News</h1>
          <p className="text-muted-foreground">
            Manage announcements and patch notes ({total} total)
          </p>
        </div>
        {canCreate && (
          <Link
            href="/news/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {[
          { label: "All", value: undefined },
          { label: "Draft", value: "DRAFT" },
          { label: "Published", value: "PUBLISHED" },
          { label: "Archived", value: "ARCHIVED" },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/news?status=${tab.value}` : "/news"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value || (!statusFilter && !tab.value)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No posts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const tags = (post.tags as string[] | null) ?? [];
            return (
              <Card key={post.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{post.title}</h3>
                      <Badge
                        variant={
                          post.status === "PUBLISHED"
                            ? "success"
                            : post.status === "DRAFT"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {post.status}
                      </Badge>
                      {post.game && <Badge variant="outline">{post.game.name}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>by {post.author.name ?? "Unknown"}</span>
                      <span>·</span>
                      <span>
                        {post.publishedAt
                          ? `Published ${format(post.publishedAt, "MMM d, yyyy")}`
                          : `Created ${format(post.createdAt, "MMM d, yyyy")}`}
                      </span>
                      {tags.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{tags.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Link
                        href={`/news/${post.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-secondary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    )}
                    {canEdit && post.status === "PUBLISHED" && (
                      <form action={archiveNewsPost.bind(null, post.id)}>
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                        >
                          Archive
                        </button>
                      </form>
                    )}
                    {canDelete && (
                      <form action={deleteNewsPost.bind(null, post.id)}>
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/news?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-secondary"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/news?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-secondary"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
