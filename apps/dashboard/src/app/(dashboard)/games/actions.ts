"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { checkPermission } from "@/lib/authorize";
import { audit } from "@/lib/audit";

// ============================================================================
// Types
// ============================================================================

export type GameRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  // Per-environment Roblox identifiers (serialized as strings for BigInt safety)
  universeIdDev: string | null;
  universeIdStage: string | null;
  universeIdProd: string | null;
  placeIdDev: string | null;
  placeIdStage: string | null;
  placeIdProd: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Aggregated stats (joined)
  _count?: {
    flags: number;
    bans: number;
    matches: number;
  };
};

function serializeGame(g: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  universeIdDev: bigint | null;
  universeIdStage: bigint | null;
  universeIdProd: bigint | null;
  placeIdDev: bigint | null;
  placeIdStage: bigint | null;
  placeIdProd: bigint | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { flags: number; bans: number; matches: number };
}): GameRecord {
  return {
    ...g,
    universeIdDev: g.universeIdDev?.toString() ?? null,
    universeIdStage: g.universeIdStage?.toString() ?? null,
    universeIdProd: g.universeIdProd?.toString() ?? null,
    placeIdDev: g.placeIdDev?.toString() ?? null,
    placeIdStage: g.placeIdStage?.toString() ?? null,
    placeIdProd: g.placeIdProd?.toString() ?? null,
  };
}

function parseBigIntField(value: string | null | undefined): bigint | null {
  if (!value || value.trim() === "") return null;
  const n = BigInt(value.trim());
  return n > 0n ? n : null;
}

// ============================================================================
// Queries
// ============================================================================

export async function getGames(): Promise<GameRecord[]> {
  const auth = await checkPermission("games:view");
  if (!auth) throw new Error("Unauthorized");

  const games = await prisma.game.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { flags: true, bans: true, matches: true } },
    },
  });

  return games.map(serializeGame);
}

export async function getGame(id: string): Promise<GameRecord | null> {
  const auth = await checkPermission("games:view");
  if (!auth) throw new Error("Unauthorized");

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      _count: { select: { flags: true, bans: true, matches: true } },
    },
  });

  return game ? serializeGame(game) : null;
}

export async function getGameBySlug(slug: string): Promise<GameRecord | null> {
  const auth = await checkPermission("games:view");
  if (!auth) throw new Error("Unauthorized");

  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      _count: { select: { flags: true, bans: true, matches: true } },
    },
  });

  return game ? serializeGame(game) : null;
}

// ============================================================================
// Mutations
// ============================================================================

export async function createGame(data: {
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  universeIdDev?: string;
  universeIdStage?: string;
  universeIdProd?: string;
  placeIdDev?: string;
  placeIdStage?: string;
  placeIdProd?: string;
}): Promise<GameRecord> {
  const auth = await checkPermission("games:create");
  if (!auth) throw new Error("Forbidden");

  // Validate slug: lowercase, hyphens/underscores allowed
  if (!/^[a-z][a-z0-9_-]*$/.test(data.slug)) {
    throw new Error(
      "Slug must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores"
    );
  }

  // Validate name
  if (!data.name.trim()) {
    throw new Error("Name is required");
  }

  const game = await prisma.game.create({
    data: {
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description?.trim() || null,
      iconUrl: data.iconUrl?.trim() || null,
      universeIdDev: parseBigIntField(data.universeIdDev),
      universeIdStage: parseBigIntField(data.universeIdStage),
      universeIdProd: parseBigIntField(data.universeIdProd),
      placeIdDev: parseBigIntField(data.placeIdDev),
      placeIdStage: parseBigIntField(data.placeIdStage),
      placeIdProd: parseBigIntField(data.placeIdProd),
      createdById: auth.user.id,
    },
    include: {
      _count: { select: { flags: true, bans: true, matches: true } },
    },
  });

  await audit({
    userId: auth.user.id,
    action: "game.create",
    target: game.slug,
    after: { name: game.name, slug: game.slug },
  });

  revalidatePath("/games");
  return serializeGame(game);
}

export async function updateGame(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    iconUrl?: string | null;
    universeIdDev?: string | null;
    universeIdStage?: string | null;
    universeIdProd?: string | null;
    placeIdDev?: string | null;
    placeIdStage?: string | null;
    placeIdProd?: string | null;
    isActive?: boolean;
  }
): Promise<GameRecord> {
  const auth = await checkPermission("games:manage");
  if (!auth) throw new Error("Forbidden");

  const before = await prisma.game.findUnique({
    where: { id },
    select: {
      name: true,
      slug: true,
      universeIdDev: true,
      universeIdStage: true,
      universeIdProd: true,
    },
  });
  if (!before) throw new Error("Game not found");

  const game = await prisma.game.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl?.trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.universeIdDev !== undefined && {
        universeIdDev: parseBigIntField(data.universeIdDev),
      }),
      ...(data.universeIdStage !== undefined && {
        universeIdStage: parseBigIntField(data.universeIdStage),
      }),
      ...(data.universeIdProd !== undefined && {
        universeIdProd: parseBigIntField(data.universeIdProd),
      }),
      ...(data.placeIdDev !== undefined && { placeIdDev: parseBigIntField(data.placeIdDev) }),
      ...(data.placeIdStage !== undefined && { placeIdStage: parseBigIntField(data.placeIdStage) }),
      ...(data.placeIdProd !== undefined && { placeIdProd: parseBigIntField(data.placeIdProd) }),
    },
    include: {
      _count: { select: { flags: true, bans: true, matches: true } },
    },
  });

  await audit({
    userId: auth.user.id,
    action: "game.update",
    target: game.slug,
    before: { name: before.name },
    after: { name: game.name },
  });

  revalidatePath("/games");
  revalidatePath(`/games/${id}`);
  return serializeGame(game);
}

export async function deleteGame(id: string): Promise<void> {
  const auth = await checkPermission("games:delete");
  if (!auth) throw new Error("Forbidden");

  const game = await prisma.game.findUnique({ where: { id }, select: { slug: true, name: true } });
  if (!game) throw new Error("Game not found");

  await prisma.game.delete({ where: { id } });

  await audit({
    userId: auth.user.id,
    action: "game.delete",
    target: game.slug,
    before: { name: game.name },
  });

  revalidatePath("/games");
}
