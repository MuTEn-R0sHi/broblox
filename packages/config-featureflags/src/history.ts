/**
 * @rbx/config-featureflags — Rollout history / audit log
 */

import type { FlagValue, FlagChangeRecord } from "./types";
import { rolloutHistory, MAX_HISTORY_SIZE } from "./state";

/** @internal Record a change in the audit log. */
export function recordHistory(
  flagName: string,
  newValue: FlagValue,
  oldValue: FlagValue | undefined,
  source: FlagChangeRecord["source"]
): void {
  const record: FlagChangeRecord = {
    flagName,
    newValue,
    oldValue,
    source,
    timestamp: os.clock !== undefined ? os.clock() : os.time(),
  };
  rolloutHistory.push(record);
  // Cap history length
  while (rolloutHistory.size() > MAX_HISTORY_SIZE) {
    rolloutHistory.remove(0);
  }
}

/**
 * Get the full rollout history (oldest-first).
 */
export function getRolloutHistory(): FlagChangeRecord[] {
  return [...rolloutHistory];
}

/**
 * Get history for a specific flag.
 */
export function getFlagHistory(name: string): FlagChangeRecord[] {
  const result: FlagChangeRecord[] = [];
  for (const record of rolloutHistory) {
    if (record.flagName === name) {
      result.push(record);
    }
  }
  return result;
}

/**
 * Clear rollout history.
 */
export function clearRolloutHistory(): void {
  rolloutHistory.clear();
}
