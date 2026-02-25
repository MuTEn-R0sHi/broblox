import { requirePermission } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createNewsPost } from "../actions";

export default async function NewNewsPostPage() {
  await requirePermission("news:create");

  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Post</h1>
        <p className="text-muted-foreground">Create a news post or announcement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createNewsPost} className="space-y-6">
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
                placeholder="v0.3.0 Patch Notes"
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
                placeholder="Write your post content in Markdown..."
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
                Save as Draft
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
