/**
 * Client for the BroBlox Dashboard public news API.
 *
 * Uses ISR (5-minute revalidation) so the website shows fresh posts
 * without hammering the API on every request.
 */

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "https://dashboard.broblox-games.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body?: string;
  tags: string[];
  publishedAt: string;
  author: { name: string | null; image: string | null };
  game: { name: string; slug: string } | null;
}

interface NewsListResponse {
  posts: NewsPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchedAt: string;
}

interface NewsSingleResponse {
  post: NewsPost;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of published news posts.
 * Returns an empty array on failure so the page always renders.
 */
export async function fetchNewsPosts(
  opts: { page?: number; limit?: number; tag?: string } = {}
): Promise<{ posts: NewsPost[]; totalPages: number }> {
  const url = new URL("/api/news", DASHBOARD_URL);

  if (opts.page) url.searchParams.set("page", String(opts.page));
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));
  if (opts.tag) url.searchParams.set("tag", opts.tag);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // ISR: refresh every 5 min
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return { posts: [], totalPages: 0 };

    const json: NewsListResponse = await res.json();
    return { posts: json.posts, totalPages: json.pagination.totalPages };
  } catch {
    return { posts: [], totalPages: 0 };
  }
}

/**
 * Fetch a single published news post by slug.
 */
export async function fetchNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  const url = new URL("/api/news", DASHBOARD_URL);
  url.searchParams.set("slug", slug);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const json: NewsSingleResponse = await res.json();
    return json.post;
  } catch {
    return null;
  }
}
