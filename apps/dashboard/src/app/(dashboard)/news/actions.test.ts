import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
const mockAudit = vi.fn();
const mockNewsCreate = vi.fn();
const mockNewsUpdate = vi.fn();
const mockNewsDelete = vi.fn();
const mockNewsFindUnique = vi.fn();

/**
 * Next.js `redirect()` throws to halt execution.
 * We replicate this so server-action control flow works identically in tests.
 */
class NextRedirect extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT: ${url}`);
  }
}
const mockRedirect = vi.fn((url: string) => {
  throw new NextRedirect(url);
});

vi.mock("@/lib/db", () => ({
  prisma: {
    newsPost: {
      create: (...a: unknown[]) => mockNewsCreate(...a),
      update: (...a: unknown[]) => mockNewsUpdate(...a),
      delete: (...a: unknown[]) => mockNewsDelete(...a),
      findUnique: (...a: unknown[]) => mockNewsFindUnique(...a),
    },
  },
}));

vi.mock("@/lib/authorize", () => ({
  requireApiPermission: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/lib/audit", () => ({
  audit: (...a: unknown[]) => mockAudit(...a),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createNewsPost, updateNewsPost, deleteNewsPost, archiveNewsPost } from "./actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH = {
  user: { id: "mod-1", name: "Mod", email: "m@t.com", role: "MODERATOR" },
};

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
}

function fakePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    title: "Test Post",
    slug: "test-post",
    body: "Content here",
    excerpt: null,
    tags: [],
    gameId: null,
    authorId: "mod-1",
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("news/actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply throw behaviour after resetAllMocks clears implementation
    mockRedirect.mockImplementation((url: string) => {
      throw new NextRedirect(url);
    });
  });

  // ── createNewsPost ──────────────────────────────────────────────────────

  describe("createNewsPost", () => {
    it("redirects when unauthorized (Response returned)", async () => {
      mockAuth.mockResolvedValue(new Response(null, { status: 401 }));
      await expect(createNewsPost(makeFormData({ title: "T", body: "B" }))).rejects.toThrow(
        NextRedirect
      );
      expect(mockRedirect).toHaveBeenCalledWith("/news");
    });

    it("redirects when title is empty", async () => {
      mockAuth.mockResolvedValue(AUTH);
      await expect(createNewsPost(makeFormData({ title: "   ", body: "B" }))).rejects.toThrow(
        NextRedirect
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining("error=Title%20and%20body%20are%20required")
      );
    });

    it("redirects when body is empty", async () => {
      mockAuth.mockResolvedValue(AUTH);
      await expect(createNewsPost(makeFormData({ title: "T", body: "  " }))).rejects.toThrow(
        NextRedirect
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining("error=Title%20and%20body%20are%20required")
      );
    });

    it("creates post with unique slug and audits", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(null); // slug available
      mockNewsCreate.mockResolvedValue(fakePost());

      // Success path ends with redirect("/news")
      await expect(
        createNewsPost(makeFormData({ title: "My Post", body: "Content" }))
      ).rejects.toThrow(NextRedirect);

      expect(mockNewsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "My Post",
            slug: "my-post",
            body: "Content",
            authorId: "mod-1",
            status: "DRAFT",
          }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "news.create" }));
    });

    it("appends timestamp to slug when it already exists", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(fakePost()); // slug exists
      mockNewsCreate.mockResolvedValue(fakePost());

      await expect(
        createNewsPost(makeFormData({ title: "My Post", body: "Content" }))
      ).rejects.toThrow(NextRedirect);

      const slug = mockNewsCreate.mock.calls[0][0].data.slug as string;
      expect(slug).toMatch(/^my-post-[a-z0-9]+$/);
    });

    it("sets status to PUBLISHED when publish=true", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(null);
      mockNewsCreate.mockResolvedValue(fakePost({ status: "PUBLISHED" }));

      await expect(
        createNewsPost(makeFormData({ title: "T", body: "B", publish: "true" }))
      ).rejects.toThrow(NextRedirect);

      expect(mockNewsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PUBLISHED",
            publishedAt: expect.any(Date),
          }),
        })
      );
    });

    it("parses comma-separated tags", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(null);
      mockNewsCreate.mockResolvedValue(fakePost());

      await expect(
        createNewsPost(makeFormData({ title: "T", body: "B", tags: "update, launch, new" }))
      ).rejects.toThrow(NextRedirect);

      expect(mockNewsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: ["update", "launch", "new"],
          }),
        })
      );
    });
  });

  // ── updateNewsPost ──────────────────────────────────────────────────────

  describe("updateNewsPost", () => {
    it("redirects when post not found", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(null);
      await expect(updateNewsPost("p1", makeFormData({ title: "T", body: "B" }))).rejects.toThrow(
        NextRedirect
      );
      expect(mockRedirect).toHaveBeenCalledWith("/news?error=Post+not+found");
    });

    it("updates post and audits", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(fakePost());
      mockNewsUpdate.mockResolvedValue(fakePost({ title: "Updated" }));

      await expect(
        updateNewsPost("p1", makeFormData({ title: "Updated", body: "New body" }))
      ).rejects.toThrow(NextRedirect);

      expect(mockNewsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({ title: "Updated", body: "New body" }),
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "news.update" }));
    });

    it("sets publishedAt when transitioning DRAFT → PUBLISHED", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(fakePost({ status: "DRAFT", publishedAt: null }));
      mockNewsUpdate.mockResolvedValue(fakePost({ status: "PUBLISHED" }));

      await expect(
        updateNewsPost("p1", makeFormData({ title: "T", body: "B", publish: "true" }))
      ).rejects.toThrow(NextRedirect);

      expect(mockNewsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PUBLISHED",
            publishedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  // ── deleteNewsPost ──────────────────────────────────────────────────────

  describe("deleteNewsPost", () => {
    it("redirects when post not found", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(null);
      await expect(deleteNewsPost("p1")).rejects.toThrow(NextRedirect);
      expect(mockRedirect).toHaveBeenCalledWith("/news?error=Post+not+found");
    });

    it("deletes post and audits", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(fakePost());
      mockNewsDelete.mockResolvedValue({});

      await expect(deleteNewsPost("p1")).rejects.toThrow(NextRedirect);

      expect(mockNewsDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "news.delete",
          before: expect.objectContaining({ title: "Test Post" }),
        })
      );
    });
  });

  // ── archiveNewsPost ─────────────────────────────────────────────────────

  describe("archiveNewsPost", () => {
    it("redirects when post not found", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(null);
      await expect(archiveNewsPost("p1")).rejects.toThrow(NextRedirect);
      expect(mockRedirect).toHaveBeenCalledWith("/news?error=Post+not+found");
    });

    it("archives post and audits", async () => {
      mockAuth.mockResolvedValue(AUTH);
      mockNewsFindUnique.mockResolvedValue(fakePost({ status: "PUBLISHED" }));
      mockNewsUpdate.mockResolvedValue(fakePost({ status: "ARCHIVED" }));

      await archiveNewsPost("p1");

      expect(mockNewsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: { status: "ARCHIVED" },
        })
      );
      expect(mockAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "news.archive",
          after: { status: "ARCHIVED" },
        })
      );
    });
  });
});
