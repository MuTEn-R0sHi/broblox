import type { Metadata } from "next";
import { accentColors } from "@/lib/games";

export const metadata: Metadata = {
  title: "News – BroBlox",
  description: "Updates, patch notes, and announcements from BroBlox studio.",
};

const posts = [
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

export default function NewsPage() {
  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#c084fc]">
          Studio Updates
        </p>
        <h1 className="text-4xl font-black sm:text-5xl md:text-6xl">News</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#71717a] sm:text-base">
          Patch notes, announcements, and behind-the-scenes from the bros.
        </p>
      </div>

      {/* Posts */}
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {posts.map((post) => {
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
                <time className="text-xs text-[#52525b]" dateTime={post.date}>
                  {formatDate(post.date)}
                </time>
              </div>
              <h2 className="mb-3 text-xl font-bold sm:text-2xl" style={{ color: c.text }}>
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed text-[#a1a1aa] sm:text-base">{post.body}</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
