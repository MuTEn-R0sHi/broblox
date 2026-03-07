/**
 * Seed script — registers platform games in the dashboard database.
 *
 * Run:  pnpm db:seed
 *
 * Safe to run multiple times (uses upsert on slug).
 *
 * Universe/place IDs are read from the same env vars used by CI
 * (GitHub Actions repository variables). To seed locally, either:
 *
 *   a) add them to apps/dashboard/.env:
 *        TEST_PARK_DEV_UNIVERSE_ID=123
 *        TEST_PARK_DEV_PLACE_ID=456
 *        ...etc
 *
 *   b) pass inline:
 *        TEST_PARK_DEV_UNIVERSE_ID=123 ... pnpm db:seed
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const url = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  connectionLimit: 2,
});
const prisma = new PrismaClient({ adapter });

function bigint(val: string | undefined): bigint | null {
  if (!val || val.trim() === "" || val.trim() === "0") return null;
  try {
    return BigInt(val.trim());
  } catch {
    return null;
  }
}

const e = process.env;

const GAMES = [
  {
    slug: "test-park",
    name: "Test Park",
    description: "Test Park game using the BroBlox platform skeleton.",
    universeIdDev: bigint(e.TEST_PARK_DEV_UNIVERSE_ID),
    placeIdDev: bigint(e.TEST_PARK_DEV_PLACE_ID),
    universeIdStage: bigint(e.TEST_PARK_STAGING_UNIVERSE_ID),
    placeIdStage: bigint(e.TEST_PARK_STAGING_PLACE_ID),
    universeIdProd: bigint(e.TEST_PARK_PROD_UNIVERSE_ID),
    placeIdProd: bigint(e.TEST_PARK_PROD_PLACE_ID),
  },
  {
    slug: "obby",
    name: "Obby",
    description: "Obstacle course game template using the BroBlox platform.",
    universeIdDev: bigint(e.OBBY_DEV_UNIVERSE_ID),
    placeIdDev: bigint(e.OBBY_DEV_PLACE_ID),
    universeIdStage: bigint(e.OBBY_STAGING_UNIVERSE_ID),
    placeIdStage: bigint(e.OBBY_STAGING_PLACE_ID),
    universeIdProd: bigint(e.OBBY_PROD_UNIVERSE_ID),
    placeIdProd: bigint(e.OBBY_PROD_PLACE_ID),
  },
];

async function main() {
  console.log("Seeding games…\n");

  // ── Migrate legacy "starter" → "test-park" ──────────────────────────────
  // The game was renamed in the codebase; update the DB record so existing
  // relations (flags, bans, matches, etc.) stay linked to the same row.
  const legacy = await prisma.game.findUnique({ where: { slug: "starter" } });
  if (legacy) {
    const existing = await prisma.game.findUnique({ where: { slug: "test-park" } });
    if (existing) {
      console.warn(
        "  ⚠  Both 'starter' and 'test-park' slugs exist in the database.\n" +
          "     Skipping automatic migration — please merge or delete the duplicate manually.\n" +
          `     starter id:    ${legacy.id}\n` +
          `     test-park id:  ${existing.id}\n`
      );
    } else {
      await prisma.game.update({
        where: { id: legacy.id },
        data: { slug: "test-park", name: "Test Park" },
      });
      console.log("  ↻  Migrated legacy 'starter' → 'test-park'\n");
    }
  }

  for (const game of GAMES) {
    const { slug, name, description, ...ids } = game;
    const result = await prisma.game.upsert({
      where: { slug },
      update: { name, description, ...ids },
      create: { slug, name, description, ...ids },
    });

    const linked =
      [
        result.universeIdDev ? "dev" : null,
        result.universeIdStage ? "stage" : null,
        result.universeIdProd ? "prod" : null,
      ]
        .filter(Boolean)
        .join(", ") || "none — fill in from /dashboard/games";

    console.log(`  ✓  ${result.name}  (slug: ${result.slug}, linked envs: ${linked})`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
