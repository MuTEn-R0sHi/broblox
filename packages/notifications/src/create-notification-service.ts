/**
 * Factory for game-level NotificationService.
 *
 * Composes NotificationStore and AnnouncementManager into a single
 * Service with player lifecycle helpers.
 */

import { Service, createLogger } from "@rbx/core";
import { NotificationsConfig, AnnouncementDefinition, DEFAULT_NOTIFICATIONS_CONFIG } from "./types";
import { NotificationStore } from "./notification-store";
import { AnnouncementManager } from "./announcement-manager";

export interface NotificationServiceConfig {
  /** Notification system config (queue size, expiry, etc.). */
  notificationsConfig?: Partial<NotificationsConfig>;
  /** Announcements to register at init. */
  announcements?: AnnouncementDefinition[];
}

export interface NotificationServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the NotificationStore. */
  getNotificationStore(): NotificationStore;
  /** Access the AnnouncementManager. */
  getAnnouncementManager(): AnnouncementManager;
  /** Call from PlayerRemoving — clears the player's notification queue. */
  cleanupPlayer(playerId: number): void;
}

export function createNotificationService(
  config: NotificationServiceConfig = {}
): NotificationServiceHandle {
  const logger = createLogger("NotificationService");

  const notifConfig: NotificationsConfig = {
    ...DEFAULT_NOTIFICATIONS_CONFIG,
    ...config.notificationsConfig,
  };

  const store = new NotificationStore(notifConfig);
  const announcements = new AnnouncementManager(store, notifConfig);

  return {
    Service: {
      name: "NotificationService",

      onInit() {
        if (config.announcements) {
          for (const def of config.announcements) {
            announcements.registerAnnouncement(def);
          }
        }
        logger.info("NotificationService initialized.");
      },

      onStart() {
        logger.info("NotificationService started.");
      },

      onDestroy() {
        logger.info("NotificationService stopped.");
      },
    },

    getNotificationStore() {
      return store;
    },

    getAnnouncementManager() {
      return announcements;
    },

    cleanupPlayer(playerId: number) {
      store.clearPlayer(playerId);
    },
  };
}
