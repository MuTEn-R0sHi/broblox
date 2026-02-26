/**
 * Feature Flag Sync Service Factory
 *
 * Creates a Service that loads dashboard-propagated flag overrides from
 * DataStore and refreshes on MessagingService invalidation.
 */

import { Service, createLogger } from "@broblox/core";
import { initFeatureFlagSync, type FeatureFlagSyncConfig } from "./sync";

export interface FeatureFlagSyncServiceConfig {
  /** Runtime environment. */
  environment: FeatureFlagSyncConfig["environment"];
  /** Game-specific DataStore name (e.g. "StarterFeatureFlags"). */
  datastoreName: string;
  /** MessagingService topic for cross-server invalidation (default "FeatureFlagsSync"). */
  topic?: string;
  /** DataStore entry key prefix (default "featureflags_"). */
  entryKeyPrefix?: string;
}

export interface FeatureFlagSyncHandle {
  /** The Service to register with Application.register(). */
  Service: Service;
}

/**
 * Create a feature flag sync service.
 *
 * @example
 * ```ts
 * const handle = createFeatureFlagSyncService({
 *   environment: BUILD_ENVIRONMENT,
 *   datastoreName: "StarterFeatureFlags",
 * });
 * export const FeatureFlagSyncService = handle.Service;
 * ```
 */
export function createFeatureFlagSyncService(
  config: FeatureFlagSyncServiceConfig
): FeatureFlagSyncHandle {
  const logger = createLogger("FeatureFlagSyncService");

  const FeatureFlagSyncService: Service = {
    name: "FeatureFlagSyncService",
    onStart() {
      try {
        initFeatureFlagSync({
          environment: config.environment,
          datastoreName: config.datastoreName,
          topic: config.topic ?? "FeatureFlagsSync",
          entryKeyPrefix: config.entryKeyPrefix ?? "featureflags_",
        });

        logger.info(`Feature flag sync initialized (${config.environment})`);
      } catch (err) {
        logger.warn(`Feature flag sync unavailable, using defaults: ${tostring(err)}`);
      }
    },
  };

  return { Service: FeatureFlagSyncService };
}
