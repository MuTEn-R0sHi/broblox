/**
 * @broblox/notifications — Type Definitions
 *
 * Types for in-game notifications: toasts, announcements, and news.
 */

// ============================================================================
// Notification Types
// ============================================================================

/** Visual priority / urgency of a notification */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/** Notification display style */
export type NotificationType = "toast" | "announcement" | "news" | "reward" | "system";

/** Duration preset or custom seconds */
export type NotificationDuration = "short" | "medium" | "long" | "persistent" | number;

/** A single notification to display */
export interface Notification {
  /** Unique notification ID (auto-generated if omitted) */
  id: string;
  /** Notification type/style */
  type: NotificationType;
  /** Title text */
  title: string;
  /** Body/description text */
  body?: string;
  /** Icon asset ID or name */
  icon?: string;
  /** Display priority */
  priority: NotificationPriority;
  /** How long to show (seconds or preset) */
  duration: NotificationDuration;
  /** Target player IDs (empty = broadcast to all) */
  targetPlayerIds: number[];
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when it expires (0 = no expiry) */
  expiresAt: number;
  /** Optional action identifier (e.g., "open_shop", "go_to_lobby") */
  action?: string;
  /** Custom data payload */
  data?: Record<string, unknown>;
  /** Whether this notification has been dismissed */
  dismissed: boolean;
}

/** Options for creating a notification (id, createdAt, dismissed auto-set) */
export interface NotificationOptions {
  type?: NotificationType;
  title: string;
  body?: string;
  icon?: string;
  priority?: NotificationPriority;
  duration?: NotificationDuration;
  targetPlayerIds?: number[];
  expiresAt?: number;
  action?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Announcement
// ============================================================================

/** A scheduled announcement */
export interface AnnouncementDefinition {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Body text */
  body: string;
  /** Repeats every N seconds (0 = one-shot) */
  repeatInterval: number;
  /** Priority */
  priority: NotificationPriority;
  /** Duration */
  duration: NotificationDuration;
}

// ============================================================================
// News
// ============================================================================

/** A news item (patch notes, events, etc.) */
export interface NewsItem {
  /** Unique ID */
  id: string;
  /** Headline */
  title: string;
  /** Full text */
  body: string;
  /** Category tag */
  category: string;
  /** Unix timestamp of publish */
  publishedAt: number;
  /** Optional image asset */
  imageAsset?: string;
  /** Optional action link */
  action?: string;
}

// ============================================================================
// Config
// ============================================================================

/** Configuration for the notification system */
export interface NotificationsConfig {
  /** Maximum notifications in queue per player */
  maxQueueSize: number;
  /** Default duration in seconds for each preset */
  durations: Record<string, number>;
  /** Enable debug logging */
  enableLogging: boolean;
  /** Callback when a notification is shown */
  onShow?: (notification: Notification) => void;
  /** Callback when a notification is dismissed */
  onDismiss?: (notificationId: string) => void;
  /** Callback when a notification action is triggered */
  onAction?: (notificationId: string, action: string, playerId: number) => void;
}

/** Default configuration */
export const DEFAULT_NOTIFICATIONS_CONFIG: NotificationsConfig = {
  maxQueueSize: 20,
  durations: {
    short: 3,
    medium: 5,
    long: 10,
    persistent: 0,
  },
  enableLogging: true,
};

// ============================================================================
// Helpers
// ============================================================================

/** Convert a duration preset or number to seconds (0 = persistent) */
export function resolveDuration(
  duration: NotificationDuration,
  config: NotificationsConfig
): number {
  if (typeIs(duration, "number")) return duration as number;
  return config.durations[duration as string] ?? 5;
}
