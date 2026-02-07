import { createFeatureFlagSyncService } from "@rbx/config-featureflags";
import { BUILD_ENVIRONMENT } from "@rbx/constants";

const handle = createFeatureFlagSyncService({
  environment: BUILD_ENVIRONMENT,
  datastoreName: "StarterFeatureFlags",
});

export const FeatureFlagSyncService = handle.Service;
