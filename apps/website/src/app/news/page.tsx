import type { Metadata } from "next";
import { accentColors } from "@/lib/games";
import { fetchNewsPosts } from "@/lib/news";

export const metadata: Metadata = {
  title: "News – BroBlox",
  description: "Updates, patch notes, and announcements from BroBlox studio.",
};

/* ---------- static fallbacks (shown when API is unreachable) ---------- */

const fallbackPosts = [
  {
    date: "2026-02-23",
    tag: "Launch",
    accent: "cyan" as const,
    title: "broblox-games.com is live",
    body: "After months of building in the background, we've launched the official BroBlox website. This is home base — games listings, leaderboards, wikis, and all future announcements will live here.",
  },
  {
    date: "2026-02-20",
    tag: "Update",
    accent: "purple" as const,
    title: "Obby v1.1 — 10 new stages",
    body: "We pushed 10 new Expert-tier stages (21–30) to BroBlox Obby. These are our hardest yet: gravity flips, timed doors, and moving spike walls. Fastest clear leaderboard has been reset for the new full-run PB.",
  },
  {
    date: "2026-02-10",
    tag: "Platform",
    accent: "cyan" as const,
    title: "Dashboard v1.0 — internal ops tools live",
    body: "Our studio operations dashboard is now running at dashboard.broblox-games.com. It covers live feature flags, moderation, player data, and analytics. Not public-facing, but it means we can iterate on games much faster.",
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Pick a deterministic accent colour based on post index. */
function accentForIndex(i: number): "cyan" | "purple" {
  return i % 2 === 0 ? "cyan" : "purple";
}

/** Derive a display tag from the first tag in the array, or default. */
function displayTag(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return "Update";
  // Capitalise first letter
  const raw = tags[0]!;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default async function NewsPage() {
  const { posts: apiPosts } = await fetchNewsPosts({ limit: 20 });

  const useFallback = apiPosts.length === 0;

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-purple">
          Studio Updates
        </p>
        <h1 className="text-4xl font-black sm:text-5xl md:text-6xl">News</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted sm:text-base">
          Patch notes, announcements, and behind-the-scenes from the bros.
        </p>
      </div>

      {/* Posts */}
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {useFallback
          ? fallbackPosts.map((post) => {
              const c = accentColors[post.accent];
              return (
                <article
                  key={`${post.date}-${post.tag}`}
                  className="rounded-2xl border p-6 sm:p-8"
                  style={{ borderColor: c.border, background: c.bg }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: c.text, background: c.bgStrong }}
                    >
                      {post.tag}
                    </span>
                    <time className="text-xs text-dim" dateTime={post.date}>
                      {formatDate(post.date)}
                    </time>
                  </div>
                  <h2 className="mb-3 text-xl font-bold sm:text-2xl" style={{ color: c.text }}>
                    {post.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-subtle sm:text-base">{post.body}</p>
                </article>
              );
            })
          : apiPosts.map((post, i) => {
              const accent = accentForIndex(i);
              const c = accentColors[accent];
              const tag = displayTag(post.tags);
              const date = post.publishedAt ?? "";

              return (
                <article
                  key={post.id}
                  className="rounded-2xl border p-6 sm:p-8"
                  style={{ borderColor: c.border, background: c.bg }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: c.text, background: c.bgStrong }}
                    >
                      {tag}
                    </span>
                    {date && (
                      <time className="text-xs text-dim" dateTime={date}>
                        {formatDate(date)}
                      </time>
                    )}
                    {post.game && <span className="text-xs text-dim">{post.game.name}</span>}
                  </div>
                  <h2 className="mb-3 text-xl font-bold sm:text-2xl" style={{ color: c.text }}>
                    {post.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-subtle sm:text-base">
                    {post.excerpt ?? ""}
                  </p>
                </article>
              );
            })}
      </div>
    </main>
  );
}
