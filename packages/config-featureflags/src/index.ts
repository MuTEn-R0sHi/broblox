export type FeatureFlagName = string;

export interface FeatureFlagsSnapshot {
  flags: Record<FeatureFlagName, boolean>;
}
