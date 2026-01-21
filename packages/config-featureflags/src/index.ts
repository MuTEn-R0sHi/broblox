/**
 * @rbx/config-featureflags
 * Feature flags and kill-switch support.
 * Compatible with roblox-ts.
 */

export type FlagValue = boolean | number | string;

export interface FlagDefinition<T extends FlagValue> {
  defaultValue: T;
  description?: string;
}

// Platform flags
const flags = new Map<string, FlagValue>();

// Default flag values
flags.set("doAction.enabled", true);

export function getFlagValue<T extends FlagValue>(name: string): T | undefined {
  return flags.get(name) as T | undefined;
}

export function setFlagValue(name: string, value: FlagValue): void {
  flags.set(name, value);
}

export function isFlagEnabled(name: string): boolean {
  return flags.get(name) === true;
}
