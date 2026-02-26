/**
 * @broblox/codes
 *
 * Redeemable promo-code system for Roblox games.
 * Provides:
 * - Code registration and management
 * - Per-player redemption tracking (DataStore)
 * - Global and per-player use limits
 * - Time-based expiry
 * - Observability metrics
 */

export * from "./types";
export * from "./code-store";
export { createCodeRedemptionService } from "./create-code-redemption-service";
export type {
  CodeRedemptionServiceConfig,
  CodeRedemptionServiceHandle,
} from "./create-code-redemption-service";
