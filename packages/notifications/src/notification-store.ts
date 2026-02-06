/**
 * Notification Store
 *
 * Server-side notification management: create, queue, dismiss,
 * expire, and broadcast notifications to players.
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import type {
  Notification,
  NotificationOptions,
  NotificationType,
  NotificationPriority,
  NotificationDuration,
  NotificationsConfig,
  DEFAULT_NOTIFICATIONS_CONFIG,
} from "./types";
import { resolveDuration } from "./types";

const notificationsCreated = new Counter("notifications_created");
const notificationsDismissed = new Counter("notifications_dismissed");
const notificationsExpired = new Counter("notifications_expired");
const notificationsBroadcast = new Counter("notifications_broadcast");

let nextId = 0;

function generateId(): string {
  nextId++;
  return `notif_${nextId}_${os.time()}`;
}

/**
 * Manages per-player notification queues.
 */
export class NotificationStore {
  /** playerId → notification queue */
  private queues = new Map<number, Notification[]>();
  /** All broadcast (server-wide) notifications */
  private broadcasts: Notification[] = [];
  private config: NotificationsConfig;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(config: NotificationsConfig) {
    this.config = config;
    if (config.enableLogging) {
      this.logger = createLogger("NotificationStore");
    }
  }

  // --------------------------------------------------------------------------
  // Create & Send
  // --------------------------------------------------------------------------

  /**
   * Send a notification to specific players or broadcast to all.
   */
  notify(options: NotificationOptions): Notification {
    const notification: Notification = {
      id: generateId(),
      type: options.type ?? "toast",
      title: options.title,
      body: options.body,
      icon: options.icon,
      priority: options.priority ?? "normal",
      duration: options.duration ?? "medium",
      targetPlayerIds: options.targetPlayerIds ?? [],
      createdAt: os.time(),
      expiresAt: options.expiresAt ?? 0,
      action: options.action,
      data: options.data,
      dismissed: false,
    };

    notificationsCreated.inc();

    const targets = notification.targetPlayerIds;
    if (targets.size() === 0) {
      // Broadcast
      this.broadcasts.push(notification);
      notificationsBroadcast.inc();
      this.logger?.info(`Broadcast: "${notification.title}"`);
    } else {
      // Targeted
      for (const playerId of targets) {
        this.enqueue(playerId, notification);
      }
      this.logger?.info(`Sent "${notification.title}" to ${targets.size()} player(s)`);
    }

    if (this.config.onShow) {
      pcall(() => this.config.onShow!(notification));
    }

    return notification;
  }

  /**
   * Send a quick toast notification.
   */
  toast(title: string, playerIds?: number[], priority?: NotificationPriority): Notification {
    return this.notify({
      type: "toast",
      title,
      targetPlayerIds: playerIds,
      priority: priority ?? "normal",
      duration: "short",
    });
  }

  /**
   * Send a server-wide announcement.
   */
  announce(title: string, body?: string, priority?: NotificationPriority): Notification {
    return this.notify({
      type: "announcement",
      title,
      body,
      priority: priority ?? "high",
      duration: "long",
    });
  }

  /**
   * Send a reward notification to a specific player.
   */
  reward(playerId: number, title: string, body?: string, icon?: string): Notification {
    return this.notify({
      type: "reward",
      title,
      body,
      icon,
      targetPlayerIds: [playerId],
      priority: "high",
      duration: "medium",
    });
  }

  /**
   * Send a system notification (e.g., maintenance warning).
   */
  system(title: string, body?: string): Notification {
    return this.notify({
      type: "system",
      title,
      body,
      priority: "urgent",
      duration: "persistent",
    });
  }

  // --------------------------------------------------------------------------
  // Queue Management
  // --------------------------------------------------------------------------

  /**
   * Get all notifications for a player (targeted + broadcasts).
   */
  getPlayerNotifications(playerId: number): Notification[] {
    const targeted = this.queues.get(playerId) ?? [];
    const result: Notification[] = [];

    // Add targeted notifications
    for (const n of targeted) {
      if (!n.dismissed) result.push(n);
    }

    // Add broadcasts
    for (const n of this.broadcasts) {
      if (!n.dismissed) result.push(n);
    }

    return result;
  }

  /**
   * Get pending (non-dismissed) count for a player.
   */
  getPendingCount(playerId: number): number {
    let count = 0;
    const targeted = this.queues.get(playerId) ?? [];
    for (const n of targeted) {
      if (!n.dismissed) count++;
    }
    for (const n of this.broadcasts) {
      if (!n.dismissed) count++;
    }
    return count;
  }

  /**
   * Dismiss a notification by ID.
   */
  dismiss(notificationId: string): boolean {
    // Check broadcasts
    for (const n of this.broadcasts) {
      if (n.id === notificationId) {
        n.dismissed = true;
        notificationsDismissed.inc();
        if (this.config.onDismiss) {
          pcall(() => this.config.onDismiss!(notificationId));
        }
        return true;
      }
    }

    // Check all player queues
    let found = false;
    this.queues.forEach((queue) => {
      for (const n of queue) {
        if (n.id === notificationId) {
          n.dismissed = true;
          found = true;
        }
      }
    });

    if (found) {
      notificationsDismissed.inc();
      if (this.config.onDismiss) {
        pcall(() => this.config.onDismiss!(notificationId));
      }
    }

    return found;
  }

  /**
   * Trigger a notification's action.
   */
  triggerAction(notificationId: string, playerId: number): boolean {
    const all = this.getPlayerNotifications(playerId);
    for (const n of all) {
      if (n.id === notificationId && n.action) {
        if (this.config.onAction) {
          pcall(() => this.config.onAction!(notificationId, n.action!, playerId));
        }
        return true;
      }
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Expiry & Cleanup
  // --------------------------------------------------------------------------

  /**
   * Remove expired and dismissed notifications.
   * Call periodically from a server loop.
   */
  cleanup(): number {
    const now = os.time();
    let removed = 0;

    // Clean broadcasts
    const keepBroadcasts: Notification[] = [];
    for (const n of this.broadcasts) {
      if (n.dismissed || (n.expiresAt > 0 && now >= n.expiresAt)) {
        removed++;
        if (!n.dismissed) notificationsExpired.inc();
      } else {
        keepBroadcasts.push(n);
      }
    }
    this.broadcasts = keepBroadcasts;

    // Clean player queues
    this.queues.forEach((queue, playerId) => {
      const keep: Notification[] = [];
      for (const n of queue) {
        if (n.dismissed || (n.expiresAt > 0 && now >= n.expiresAt)) {
          removed++;
          if (!n.dismissed) notificationsExpired.inc();
        } else {
          keep.push(n);
        }
      }
      if (keep.size() > 0) {
        this.queues.set(playerId, keep);
      } else {
        this.queues.delete(playerId);
      }
    });

    if (removed > 0) {
      this.logger?.info(`Cleaned up ${removed} notification(s)`);
    }

    return removed;
  }

  /**
   * Remove all notifications for a player (e.g., on leave).
   */
  clearPlayer(playerId: number): void {
    this.queues.delete(playerId);
  }

  /**
   * Clear everything.
   */
  clearAll(): void {
    this.queues.clear();
    this.broadcasts = [];
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private enqueue(playerId: number, notification: Notification): void {
    let queue = this.queues.get(playerId);
    if (!queue) {
      queue = [];
      this.queues.set(playerId, queue);
    }

    // Enforce max queue size
    if (queue.size() >= this.config.maxQueueSize) {
      // Remove oldest non-urgent notification
      let removeIndex = -1;
      for (let i = 0; i < queue.size(); i++) {
        if (queue[i].priority !== "urgent") {
          removeIndex = i;
          break;
        }
      }
      if (removeIndex >= 0) {
        queue.remove(removeIndex);
      } else {
        // All urgent — remove oldest anyway
        queue.remove(0);
      }
    }

    queue.push(notification);
  }
}
