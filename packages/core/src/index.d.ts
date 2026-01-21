/**
 * @rbx/core
 * Core utilities for the platform.
 * Compatible with roblox-ts.
 */
export interface Logger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}
export declare function createLogger(name: string): Logger;
export declare class Janitor {
    private tasks;
    add(task: () => void): void;
    addConnection(connection: RBXScriptConnection): void;
    addInstance(instance: Instance): void;
    cleanup(): void;
    destroy(): void;
}
export declare const Clock: {
    now(): number;
    timestamp(): number;
};
