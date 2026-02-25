import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/news
 *
 * Public endpoint — returns published news posts for the website.
 *
 * Query parameters:
 *  - `page`    (default 1)
 *  - `limit`   (default 10, max 50)
 *  - `tag`     (optional) filter by tag
 *  - `gameId`  (optional) filter by game
 *  - `slug`    (optional) fetch a single post by slug
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Single post by slug
  const slug = params.get("slug");
  if (slug) {
    try {
      const post = await prisma.newsPost.findUnique({
        where: { slug, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          slug: true,
          body: true,
          excerpt: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true, image: true } },
          game: { select: { name: true, slug: true } },
        },
      });

      if (!post) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ post });
    } catch (error) {
      console.error("[api/news] Failed to fetch post:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  // List posts
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "10", 10) || 10));
  const tag = params.get("tag");
  const gameId = params.get("gameId");

  const skip = (page - 1) * limit;

  try {
    // Build where clause
    const where: Record<string, unknown> = { status: "PUBLISHED" as const };
    if (gameId) where.gameId = gameId;
    // Tag filter: Prisma JSON array contains — relies on MySQL JSON_CONTAINS
    // For simplicity, we filter in-app after fetching if tag is specified
    // (MySQL JSON_CONTAINS with Prisma is cumbersome)

    const [posts, total] = await Promise.all([
      prisma.newsPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          tags: true,
          publishedAt: true,
          author: { select: { name: true, image: true } },
          game: { select: { name: true, slug: true } },
        },
      }),
      prisma.newsPost.count({ where }),
    ]);

    // Client-side tag filter (simple approach for JSON array)
    const filtered = tag
      ? posts.filter((p) => {
          const tags = p.tags as string[] | null;
          return tags?.includes(tag);
        })
      : posts;

    return NextResponse.json({
      posts: filtered,
      pagination: {
        page,
        limit,
        total: tag ? filtered.length : total,
        totalPages: tag ? Math.ceil(filtered.length / limit) : Math.ceil(total / limit),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[api/news] Failed to fetch posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
