import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey, checkRateLimit, getRateLimitKey } from "@/lib/authorize";

type Environment = "dev" | "stage" | "prod";

const envFieldMap = {
  dev: "enabledDev",
  stage: "enabledStage",
  prod: "enabledProd",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ environment: string }> }
) {
  const { environment } = await params;

  // Validate environment
  if (!["dev", "stage", "prod"].includes(environment)) {
    return NextResponse.json({ error: "Invalid environment" }, { status: 400 });
  }

  // Timing-safe API key check
  if (!validateApiKey(request, "FLAGS_API_KEY")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  if (!checkRateLimit(getRateLimitKey(request))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const env = environment as Environment;
  const field = envFieldMap[env];

  // Fetch all flags for this environment
  const flags = await prisma.featureFlag.findMany({
    select: {
      key: true,
      [field]: true,
      value: true,
    },
  });

  // Transform to simple key -> enabled/value map
  const result: Record<string, boolean | unknown> = {};
  for (const flag of flags) {
    // If there's a JSON value and flag is enabled, return the value
    // Otherwise return boolean enabled status
    const enabled = flag[field] as boolean;
    result[flag.key] = flag.value && enabled ? flag.value : enabled;
  }

  return NextResponse.json({
    environment: env,
    flags: result,
    fetchedAt: new Date().toISOString(),
  });
}
