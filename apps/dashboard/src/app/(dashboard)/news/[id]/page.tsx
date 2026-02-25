import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateNewsPost } from "../actions";

interface EditNewsPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPostPage({ params }: EditNewsPostPageProps) {
  await requirePermission("news:edit");

  const { id } = await params;

  const [post, games] = await Promise.all([
    prisma.newsPost.findUnique({
      where: { id },
      include: { game: { select: { id: true, name: true } } },
    }),
    prisma.game.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!post) notFound();

  const tags = (() => {
    try {
      const parsed = JSON.parse(post.tags as string);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return "";
    }
  })();

  const updatePost = updateNewsPost.bind(null, post.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
          <p className="text-muted-foreground">Editing &ldquo;{post.title}&rdquo;</p>
        </div>
        <Badge
          variant={
            post.status === "PUBLISHED"
              ? "default"
              : post.status === "DRAFT"
                ? "secondary"
                : "outline"
          }
        >
          {post.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updatePost} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={post.title}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <label htmlFor="excerpt" className="text-sm font-medium">
                Excerpt
              </label>
              <input
                id="excerpt"
                name="excerpt"
                type="text"
                defaultValue={post.excerpt ?? ""}
                placeholder="Short summary for list views"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label htmlFor="body" className="text-sm font-medium">
                Body (Markdown) <span className="text-destructive">*</span>
              </label>
              <textarea
                id="body"
                name="body"
                required
                rows={16}
                defaultValue={post.body}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                defaultValue={tags}
                placeholder="patch-notes, event, announcement (comma-separated)"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Game scope */}
            <div className="space-y-2">
              <label htmlFor="gameId" className="text-sm font-medium">
                Game (optional)
              </label>
              <select
                id="gameId"
                name="gameId"
                defaultValue={post.gameId ?? ""}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">All Games (global)</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              {post.status === "DRAFT" ? (
                <>
                  <button
                    type="submit"
                    name="publish"
                    value="true"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Publish
                  </button>
                  <button
                    type="submit"
                    name="publish"
                    value="false"
                    className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                  >
                    Save Draft
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  name="publish"
                  value={post.status === "PUBLISHED" ? "true" : "false"}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save Changes
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
