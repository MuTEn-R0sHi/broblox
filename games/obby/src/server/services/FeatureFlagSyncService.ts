/**
 * Feature Flag Sync Service (Obby)
 *
 * Loads dashboard-propagated flag overrides from DataStore and refreshes on
 * MessagingService invalidation messages.
 */

import { Service, createLogger } from "@rbx/core";
import { BUILD_ENVIRONMENT } from "@rbx/constants";
import { initFeatureFlagSync } from "@rbx/config-featureflags/out/sync";

const logger = createLogger("FeatureFlagSyncService");

export const FeatureFlagSyncService: Service = {
  onStart() {
    initFeatureFlagSync({
      environment: BUILD_ENVIRONMENT,
      datastoreName: "ObbyFeatureFlags",
      topic: "FeatureFlagsSync",
      entryKeyPrefix: "featureflags_",
    });

    logger.info(`Feature flag sync initialized (${BUILD_ENVIRONMENT})`);
  },
};
