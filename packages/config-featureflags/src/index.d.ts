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
export declare function getFlagValue<T extends FlagValue>(name: string): T | undefined;
export declare function setFlagValue(name: string, value: FlagValue): void;
export declare function isFlagEnabled(name: string): boolean;
