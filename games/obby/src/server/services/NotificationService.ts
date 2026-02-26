/**
 * Notification Service — Obby Game
 *
 * Sets up in-game notifications and announcements.
 * Uses the @broblox/notifications package.
 */

import { createNotificationService } from "@broblox/notifications";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createNotificationService({
  notificationsConfig: {
    maxQueueSize: 10,
    durations: { short: 3, medium: 5, long: 10, persistent: 0 },
    enableLogging: true,
  },
  announcements: [
    {
      id: "welcome",
      title: "Welcome to the Obby!",
      body: "Reach the end to win. Good luck!",
      repeatInterval: 0,
      priority: "normal",
      duration: "long",
    },
  ],
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
});

export const NotificationService = handle.Service;
export const getNotificationStore = () => handle.getNotificationStore();
export const getAnnouncementManager = () => handle.getAnnouncementManager();
