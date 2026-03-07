import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import { fetchNewsPosts, fetchNewsPostBySlug, type NewsPost } from "./news";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function samplePost(overrides: Partial<NewsPost> = {}): NewsPost {
  return {
    id: "p1",
    title: "Test Post",
    slug: "test-post",
    excerpt: "Short excerpt",
    body: "Full body content for the post.",
    tags: ["update", "patch"],
    publishedAt: "2026-01-15T12:00:00.000Z",
    author: { name: "Admin", image: null },
    game: { name: "Test Park", slug: "test-park" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// fetchNewsPosts
// ---------------------------------------------------------------------------

describe("fetchNewsPosts", () => {
  it("returns posts and totalPages on success", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        posts: [samplePost()],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        fetchedAt: "2026-01-15T12:00:00.000Z",
      })
    );

    const result = await fetchNewsPosts();

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].slug).toBe("test-post");
    expect(result.totalPages).toBe(1);
  });

  it("passes query parameters for pagination and tags", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        posts: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
        fetchedAt: "2026-01-15T12:00:00.000Z",
      })
    );

    await fetchNewsPosts({ page: 2, limit: 5, tag: "update" });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("tag")).toBe("update");
  });

  it("uses ISR with 300s revalidation", async () => {
    mockFetch.mockResolvedValue(
      okJson({
        posts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        fetchedAt: "2026-01-15T12:00:00.000Z",
      })
    );

    await fetchNewsPosts();

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]).toEqual(expect.objectContaining({ next: { revalidate: 300 } }));
  });

  it("returns empty array on HTTP error", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 500 }));

    const result = await fetchNewsPosts();

    expect(result.posts).toEqual([]);
    expect(result.totalPages).toBe(0);
  });

  it("returns empty array on network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const result = await fetchNewsPosts();

    expect(result.posts).toEqual([]);
    expect(result.totalPages).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchNewsPostBySlug
// ---------------------------------------------------------------------------

describe("fetchNewsPostBySlug", () => {
  it("returns post on success", async () => {
    const post = samplePost({ slug: "hello-world" });
    mockFetch.mockResolvedValue(okJson({ post }));

    const result = await fetchNewsPostBySlug("hello-world");

    expect(result?.slug).toBe("hello-world");
    expect(result?.title).toBe("Test Post");
  });

  it("passes slug as query parameter", async () => {
    mockFetch.mockResolvedValue(okJson({ post: samplePost() }));

    await fetchNewsPostBySlug("my-post");

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("slug")).toBe("my-post");
  });

  it("returns null on HTTP error", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 404 }));

    const result = await fetchNewsPostBySlug("missing");

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const result = await fetchNewsPostBySlug("unreachable");

    expect(result).toBeNull();
  });
});
