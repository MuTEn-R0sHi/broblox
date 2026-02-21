import {
  getOpenCloudFeatureFlagsBridgeConfig,
  publishMessagingService,
  summarizeOpenCloudError,
  updateStandardDataStoreEntry,
} from "@/lib/roblox-open-cloud";

export type DashboardFeatureFlagRecord = {
  key: string;
  enabledDev: boolean;
  enabledStage: boolean;
  enabledProd: boolean;
  rolloutPercentage: number;
  isKilled: boolean;
  value: unknown;
};

type RuntimeEnvironment = "development" | "staging" | "production";

type FlagOverridePayload = {
  enabled: boolean;
  rolloutPercentage: number;
  isKilled: boolean;
  value?: boolean | number | string;
};

type DataStorePayload = {
  updatedAt: number;
  flags: Record<string, FlagOverridePayload>;
};

export type FeatureFlagsBridgeResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

function mapEnv(env: "dev" | "stage" | "prod"): RuntimeEnvironment {
  switch (env) {
    case "dev":
      return "development";
    case "stage":
      return "staging";
    case "prod":
      return "production";
  }
}

function envEnabled(flag: DashboardFeatureFlagRecord, env: "dev" | "stage" | "prod"): boolean {
  return env === "dev" ? flag.enabledDev : env === "stage" ? flag.enabledStage : flag.enabledProd;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.floor(value);
}

export async function bridgeSyncFeatureFlagsToRoblox(opts: {
  environments: Array<"dev" | "stage" | "prod">;
  flags: DashboardFeatureFlagRecord[];
  /**
   * Per-environment Roblox Universe IDs.
   * When provided, syncs to the specific game's DataStore instead of the
   * global ROBLOX_UNIVERSE_ID fallback.
   */
  universeIds?: Partial<Record<"dev" | "stage" | "prod", number>>;
}): Promise<FeatureFlagsBridgeResult> {
  const cfg = getOpenCloudFeatureFlagsBridgeConfig();
  if (!cfg.enabled) return { ok: true, skipped: true };

  const updatedAt = Math.floor(Date.now() / 1000);

  try {
    for (const env of opts.environments) {
      const runtimeEnv = mapEnv(env);
      const entryKey = `${cfg.entryKeyPrefix}${runtimeEnv}`;
      const universeIdOverride = opts.universeIds?.[env];

      const payload: DataStorePayload = {
        updatedAt,
        flags: Object.fromEntries(
          opts.flags.map((flag) => {
            const enabled = envEnabled(flag, env);

            const override: FlagOverridePayload = {
              enabled,
              rolloutPercentage: clampPercentage(flag.rolloutPercentage),
              isKilled: Boolean(flag.isKilled),
            };

            const rawValue = flag.value;
            if (
              rawValue !== null &&
              rawValue !== undefined &&
              (typeof rawValue === "boolean" ||
                typeof rawValue === "number" ||
                typeof rawValue === "string")
            ) {
              override.value = rawValue;
            }

            return [flag.key, override] as const;
          })
        ),
      };

      await updateStandardDataStoreEntry<DataStorePayload, DataStorePayload>({
        universeIdOverride,
        datastore: { datastoreName: cfg.datastoreName, scope: cfg.scope },
        entryKey,
        update: () => payload,
      });

      await publishMessagingService({
        universeIdOverride,
        topic: cfg.topic,
        message: JSON.stringify({ environment: runtimeEnv, updatedAt }),
      });
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: summarizeOpenCloudError(error) };
  }
}
