import { createFeatureFlagSyncService } from "@broblox/config-featureflags";
import { BUILD_ENVIRONMENT } from "@broblox/constants";

const handle = createFeatureFlagSyncService({
  environment: BUILD_ENVIRONMENT,
  datastoreName: "TestParkFeatureFlags",
});

export const FeatureFlagSyncService = handle.Service;
