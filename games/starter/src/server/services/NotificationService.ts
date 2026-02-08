/**
 * Notification Service — Starter Game
 *
 * Sets up in-game notifications, announcements, and news.
 * Uses the @rbx/notifications package.
 */

import { Service, createLogger } from "@rbx/core";
import { NotificationStore, AnnouncementManager } from "@rbx/notifications";
import type { NotificationsConfig } from "@rbx/notifications";

const logger = createLogger("NotificationService");

let notificationStore: NotificationStore | undefined;
let announcementManager: AnnouncementManager | undefined;

export function getNotificationStore(): NotificationStore {
  if (!notificationStore) error("NotificationService has not been initialized yet.");
  return notificationStore;
}

export function getAnnouncementManager(): AnnouncementManager {
  if (!announcementManager) error("NotificationService has not been initialized yet.");
  return announcementManager;
}

const notifConfig: NotificationsConfig = {
  maxQueueSize: 20,
  durations: { short: 3, medium: 5, long: 10, persistent: 0 },
  enableLogging: true,
  onAction: (notifId, action, playerId) => {
    logger.info(`Action "${action}" triggered by player ${playerId} on ${notifId}`);
  },
};

export const NotificationService: Service = {
  onInit() {
    notificationStore = new NotificationStore(notifConfig);
    announcementManager = new AnnouncementManager(notificationStore, notifConfig);

    // ----- Register scheduled announcements -----
    announcementManager.registerAnnouncement({
      id: "welcome",
      title: "Welcome to Starter Game!",
      body: "Have fun and play fair.",
      repeatInterval: 0,
      priority: "normal",
      duration: "long",
    });

    // ----- Add initial news items -----
    announcementManager.addNews({
      id: "launch",
      title: "Game Launch!",
      body: "Welcome to the first release of Starter Game.",
      category: "announcement",
      publishedAt: os.time(),
    });

    logger.info("Notifications initialized.");
  },

  onStart() {
    // Fire any one-shot announcements
    announcementManager?.tick();
    logger.info("NotificationService started.");
  },

  onDestroy() {
    notificationStore?.clearAll();
    logger.info("NotificationService stopped.");
  },
};
