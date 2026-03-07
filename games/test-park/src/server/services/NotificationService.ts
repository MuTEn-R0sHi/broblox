/**
 * Notification Service — Test Park
 *
 * Sets up in-game notifications, announcements, and news.
 * Uses the @broblox/notifications package.
 */

import { createLogger } from "@broblox/core";
import { createNotificationService } from "@broblox/notifications";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("NotificationService");

const handle = createNotificationService({
  notificationsConfig: {
    maxQueueSize: 20,
    durations: { short: 3, medium: 5, long: 10, persistent: 0 },
    enableLogging: true,
    onAction: (notifId, action, playerId) => {
      logger.info(`Action "${action}" triggered by player ${playerId} on ${notifId}`);
    },
  },
  announcements: [
    {
      id: "welcome",
      title: "Welcome to Test Park!",
      body: "Have fun and play fair.",
      repeatInterval: 0,
      priority: "normal",
      duration: "long",
    },
  ],
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});

// Register news items after the handle is created so they are available at onInit.
handle.getAnnouncementManager().addNews({
  id: "launch",
  title: "Game Launch!",
  body: "Welcome to the first release of Test Park.",
  category: "announcement",
  publishedAt: os.time(),
});

export const NotificationService = handle.Service;
export const getNotificationStore = () => handle.getNotificationStore();
export const getAnnouncementManager = () => handle.getAnnouncementManager();
