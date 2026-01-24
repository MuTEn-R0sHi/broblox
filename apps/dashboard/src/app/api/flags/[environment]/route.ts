import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// API Key for game servers to authenticate
const API_KEY = process.env.FLAGS_API_KEY;

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

  // Check API key (optional - remove if you want public access)
  const apiKey = request.headers.get("x-api-key");
  if (API_KEY && apiKey !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
