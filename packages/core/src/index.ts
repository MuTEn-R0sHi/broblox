/**
 * @broblox/core
 * Core utilities for the platform.
 * Compatible with roblox-ts.
 */

// Application lifecycle
export * from "./application";

// Player lifecycle factory
export * from "./create-player-lifecycle-service";

// Roblox-TS compatible collection helpers
export { arraySize, arrayRemoveAt, arrayTake, setSize, mapSize } from "./collections";

// Logger (extracted to avoid circular deps with create-player-lifecycle-service)
export { LogLevel, createLogger, logError } from "./logger";
export type { Logger } from "./logger";

// Janitor (cleanup utility)
export { Janitor } from "./janitor";

// Clock
export { Clock } from "./clock";
