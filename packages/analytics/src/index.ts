/**
 * @rbx/analytics
 *
 * Player behavior analytics for Roblox games.
 * Provides:
 * - Structured event tracking with schema validation
 * - Multi-step funnel tracking with conversion stats
 * - Session lifecycle and playtime tracking
 * - Player retention tracking (D1/D7/D14/D30)
 */

export * from "./types";
export { EventTracker } from "./event-tracker";
export { FunnelTracker } from "./funnel-tracker";
export { SessionTracker } from "./session-tracker";
export { RetentionTracker } from "./retention-tracker";
export { createAnalyticsService } from "./create-analytics-service";
export type { AnalyticsServiceConfig, AnalyticsServiceHandle } from "./create-analytics-service";
