/**
 * @rbx/config-featureflags — Flag registry & definitions
 */

import type { FlagDefinition, FlagCategory, FlagValue } from "./types";
import { flagDefinitions } from "./state";

// ============================================================================
// Flag Definitions
// ============================================================================

/**
 * Register a flag definition.
 * Call this at module load time to define all flags.
 */
export function defineFlag<T extends FlagValue>(definition: FlagDefinition<T>): FlagDefinition<T> {
  if (flagDefinitions.has(definition.name)) {
    warn(`[FeatureFlags] Flag "${definition.name}" already defined, skipping duplicate`);
    return definition;
  }
  flagDefinitions.set(definition.name, definition);
  return definition;
}

/**
 * Get a flag definition by name.
 */
export function getFlagDefinition(name: string): FlagDefinition | undefined {
  return flagDefinitions.get(name);
}

/**
 * Get all registered flag definitions.
 */
export function getAllFlagDefinitions(): FlagDefinition[] {
  const definitions: FlagDefinition[] = [];
  flagDefinitions.forEach((def) => definitions.push(def));
  return definitions;
}

/**
 * Get all flags in a specific category.
 */
export function getFlagsByCategory(category: FlagCategory): FlagDefinition[] {
  const definitions: FlagDefinition[] = [];
  flagDefinitions.forEach((def) => {
    if (def.category === category) {
      definitions.push(def);
    }
  });
  return definitions;
}

/**
 * Get all kill-switch flags.
 */
export function getKillSwitches(): FlagDefinition[] {
  const switches: FlagDefinition[] = [];
  flagDefinitions.forEach((def) => {
    if (def.isKillSwitch) {
      switches.push(def);
    }
  });
  return switches;
}
