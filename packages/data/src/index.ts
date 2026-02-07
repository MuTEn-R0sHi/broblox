/**
 * @rbx/data
 *
 * Data persistence layer for Roblox games.
 * Provides type-safe player data storage with:
 * - Automatic versioning and migrations
 * - Retry with exponential backoff
 * - Session tracking
 */

export * from "./types";
export * from "./player-data-store";
export * from "./session";
export { BasePlayerStore } from "./base-player-store";
export type { BaseStoreConfig } from "./base-player-store";
export { createDataService } from "./create-data-service";
export type { DataServiceConfig, DataServiceHandle } from "./create-data-service";
