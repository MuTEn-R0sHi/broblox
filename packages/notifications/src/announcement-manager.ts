/**
 * Announcement Manager
 *
 * Schedules repeating server-wide announcements and manages
 * a news feed of items (patch notes, events, etc.).
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import type { AnnouncementDefinition, NewsItem, NotificationsConfig } from "./types";
import { NotificationStore } from "./notification-store";

const announcementsFired = new Counter("notifications_announcements_fired");

/**
 * Manages scheduled announcements and a news feed.
 */
export class AnnouncementManager {
  private announcements = new Map<string, AnnouncementDefinition>();
  private lastFired = new Map<string, number>();
  private newsItems: NewsItem[] = [];
  private store: NotificationStore;
  private config: NotificationsConfig;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(store: NotificationStore, config: NotificationsConfig) {
    this.store = store;
    this.config = config;
    if (config.enableLogging) {
      this.logger = createLogger("AnnouncementManager");
    }
  }

  // --------------------------------------------------------------------------
  // Announcements
  // --------------------------------------------------------------------------

  /**
   * Register a scheduled announcement.
   */
  registerAnnouncement(def: AnnouncementDefinition): void {
    this.announcements.set(def.id, def);
    this.logger?.info(`Registered announcement: ${def.id}`);
  }

  /**
   * Unregister an announcement.
   */
  unregisterAnnouncement(id: string): void {
    this.announcements.delete(id);
    this.lastFired.delete(id);
  }

  /**
   * Tick — check and fire any due announcements.
   * Call this periodically from a server loop.
   */
  tick(): void {
    const now = os.time();

    this.announcements.forEach((def, id) => {
      const last = this.lastFired.get(id) ?? 0;

      if (def.repeatInterval <= 0) {
        // One-shot: fire once if never fired
        if (last === 0) {
          this.fire(def);
          this.lastFired.set(id, now);
        }
      } else {
        // Repeating: fire if interval elapsed
        if (now - last >= def.repeatInterval) {
          this.fire(def);
          this.lastFired.set(id, now);
        }
      }
    });
  }

  /**
   * Manually fire an announcement now (ignoring schedule).
   */
  fireNow(id: string): boolean {
    const def = this.announcements.get(id);
    if (!def) return false;

    this.fire(def);
    this.lastFired.set(id, os.time());
    return true;
  }

  /**
   * Get all registered announcement definitions.
   */
  listAnnouncements(): AnnouncementDefinition[] {
    const result: AnnouncementDefinition[] = [];
    this.announcements.forEach((def) => result.push(def));
    return result;
  }

  // --------------------------------------------------------------------------
  // News Feed
  // --------------------------------------------------------------------------

  /**
   * Add a news item.
   */
  addNews(item: NewsItem): void {
    this.newsItems.push(item);
    this.logger?.info(`News added: ${item.title}`);
  }

  /**
   * Get all news items, newest first.
   */
  getNews(limit?: number): NewsItem[] {
    // Sort by publishedAt descending (boolean for Lua table.sort)
    const sorted = [...this.newsItems];
    sorted.sort((a, b) => a.publishedAt > b.publishedAt);
    if (limit !== undefined && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Get news by category.
   */
  getNewsByCategory(category: string, limit?: number): NewsItem[] {
    const filtered: NewsItem[] = [];
    for (const item of this.newsItems) {
      if (item.category === category) {
        filtered.push(item);
      }
    }
    filtered.sort((a, b) => a.publishedAt > b.publishedAt);
    if (limit !== undefined && limit > 0) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }

  /**
   * Remove a news item by ID.
   */
  removeNews(id: string): boolean {
    for (let i = 0; i < this.newsItems.size(); i++) {
      if (this.newsItems[i].id === id) {
        this.newsItems.remove(i);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all news.
   */
  clearNews(): void {
    this.newsItems = [];
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private fire(def: AnnouncementDefinition): void {
    this.store.announce(def.title, def.body, def.priority);
    announcementsFired.inc();
    this.logger?.info(`Announcement fired: ${def.id}`);
  }
}
