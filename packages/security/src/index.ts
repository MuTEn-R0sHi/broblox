/**
 * @rbx/security
 *
 * Security utilities for Roblox games.
 * Provides:
 * - Detector signals (suspicious activity detection)
 * - Enforcement actions (kick, ban, shadow)
 * - Player trust scoring
 */

export * from "./types";
export * from "./detectors";
export * from "./enforcer";
export * from "./trust-score";
export { createSecurityService } from "./create-security-service";
export type { SecurityServiceConfig, SecurityServiceHandle } from "./create-security-service";
