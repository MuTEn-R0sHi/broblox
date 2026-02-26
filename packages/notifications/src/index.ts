/**
 * @broblox/notifications
 *
 * In-game notification system for Roblox games.
 * Provides:
 * - NotificationStore: per-player queues, broadcasts, dismissals
 * - AnnouncementManager: scheduled announcements + news feed
 */

export * from "./types";
export { NotificationStore } from "./notification-store";
export { AnnouncementManager } from "./announcement-manager";
export { createNotificationService } from "./create-notification-service";
export type {
  NotificationServiceConfig,
  NotificationServiceHandle,
} from "./create-notification-service";
