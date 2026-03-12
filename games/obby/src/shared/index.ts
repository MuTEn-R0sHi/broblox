/**
 * Shared Module Exports
 *
 * Note: remotes.ts is imported directly via path alias (shared/remotes)
 * and is NOT re-exported here to avoid circular import issues.
 */

// Game-specific constants
export const GAME_NAME = "Obby";
export const GAME_VERSION = "0.1.0";

export * from "./types";
