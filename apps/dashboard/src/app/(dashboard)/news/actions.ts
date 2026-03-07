"use server";

import { prisma } from "@/lib/db";
import { requireApiPermission } from "@/lib/authorize";
import { audit } from "@/lib/audit";
import { parseFormData, createNewsPostSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============================================================================
// Helpers
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// ============================================================================
// Server Actions
// ============================================================================

export async function createNewsPost(formData: FormData): Promise<void> {
  const auth = await requireApiPermission("news:create");
  if (auth instanceof Response) redirect("/news");

  const parsed = parseFormData(formData, createNewsPostSchema);
  if (!parsed.success) {
    redirect(`/news/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const { title, body, excerpt, tags: tagsRaw, gameId, publish } = parsed.data;

  // Generate unique slug
  let slug = slugify(title);
  const existing = await prisma.newsPost.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  const post = await prisma.newsPost.create({
    data: {
      title: title.trim(),
      slug,
      body: body.trim(),
      excerpt: excerpt?.trim() || null,
      tags: tags.length > 0 ? tags : undefined,
      gameId: gameId || null,
      authorId: auth.user.id,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
    },
  });

  await audit({
    userId: auth.user.id,
    action: "news.create",
    target: post.id,
    after: { title: post.title, slug: post.slug, status: post.status },
  });

  revalidatePath("/news");
  redirect("/news");
}

export async function updateNewsPost(postId: string, formData: FormData): Promise<void> {
  const auth = await requireApiPermission("news:edit");
  if (auth instanceof Response) redirect("/news");

  const parsed = parseFormData(formData, createNewsPostSchema);
  if (!parsed.success) {
    redirect(`/news/${postId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const { title, body, excerpt, tags: tagsRaw, gameId, publish } = parsed.data;

  const existing = await prisma.newsPost.findUnique({ where: { id: postId } });
  if (!existing) {
    redirect("/news?error=Post+not+found");
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  const wasPublished = existing.status === "PUBLISHED";
  const nowPublished = publish;

  const post = await prisma.newsPost.update({
    where: { id: postId },
    data: {
      title: title.trim(),
      body: body.trim(),
      excerpt: excerpt?.trim() || null,
      tags: tags.length > 0 ? tags : undefined,
      gameId: gameId || null,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: !wasPublished && nowPublished ? new Date() : existing.publishedAt,
    },
  });

  await audit({
    userId: auth.user.id,
    action: "news.update",
    target: post.id,
    before: { title: existing.title, status: existing.status },
    after: { title: post.title, status: post.status },
  });

  revalidatePath("/news");
  redirect("/news");
}

export async function deleteNewsPost(postId: string): Promise<void> {
  const auth = await requireApiPermission("news:delete");
  if (auth instanceof Response) redirect("/news");

  const existing = await prisma.newsPost.findUnique({ where: { id: postId } });
  if (!existing) {
    redirect("/news?error=Post+not+found");
  }

  await prisma.newsPost.delete({ where: { id: postId } });

  await audit({
    userId: auth.user.id,
    action: "news.delete",
    target: postId,
    before: { title: existing.title, slug: existing.slug },
  });

  revalidatePath("/news");
  redirect("/news");
}

export async function archiveNewsPost(postId: string): Promise<void> {
  const auth = await requireApiPermission("news:edit");
  if (auth instanceof Response) redirect("/news");

  const existing = await prisma.newsPost.findUnique({ where: { id: postId } });
  if (!existing) {
    redirect("/news?error=Post+not+found");
  }

  await prisma.newsPost.update({
    where: { id: postId },
    data: { status: "ARCHIVED" },
  });

  await audit({
    userId: auth.user.id,
    action: "news.archive",
    target: postId,
    before: { status: existing.status },
    after: { status: "ARCHIVED" },
  });

  revalidatePath("/news");
}
