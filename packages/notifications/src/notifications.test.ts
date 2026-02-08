/**
 * Notifications Tests
 *
 * Comprehensive tests for NotificationStore and AnnouncementManager.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NotificationsConfig, Notification, AnnouncementDefinition, NewsItem } from "./types";

// ---------------------------------------------------------------------------
// Roblox globals polyfills
// ---------------------------------------------------------------------------

const arrayProto = Array.prototype as unknown as Record<string, unknown>;
if (!arrayProto.size) {
  arrayProto.size = function (this: unknown[]) {
    return this.length;
  };
}
if (!arrayProto.remove) {
  arrayProto.remove = function (this: unknown[], index: number) {
    return this.splice(index, 1)[0];
  };
}

let mockTime = 1000;

function setupGlobals() {
  mockTime = 1000;

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = { floor: Math.floor, min: Math.min, max: Math.max, huge: Infinity };
  g.pcall = (fn: (...a: unknown[]) => unknown, ...args: unknown[]) => {
    try {
      const result = fn(...args);
      return [true, result];
    } catch (e) {
      return [false, e];
    }
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "number") return typeof value === "number";
    if (typeName === "string") return typeof value === "string";
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of ["print", "os", "math", "pcall", "typeIs"]) {
    delete g[key];
  }
}

function makeConfig(overrides?: Partial<NotificationsConfig>): NotificationsConfig {
  return {
    maxQueueSize: 20,
    durations: { short: 3, medium: 5, long: 10, persistent: 0 },
    enableLogging: false,
    ...overrides,
  };
}

// ============================================================================
// NotificationStore
// ============================================================================

describe("NotificationStore", () => {
  beforeEach(() => {
    setupGlobals();
    vi.resetModules();
  });
  afterEach(teardownGlobals);

  async function getStore(overrides?: Partial<NotificationsConfig>) {
    const { NotificationStore } = await import("./notification-store");
    return new NotificationStore(makeConfig(overrides));
  }

  describe("basic notifications", () => {
    it("sends a targeted notification", async () => {
      const store = await getStore();
      const notif = store.notify({ title: "Hello", targetPlayerIds: [100] });

      expect(notif.id).toBeDefined();
      expect(notif.title).toBe("Hello");
      expect(notif.type).toBe("toast");
      expect(notif.priority).toBe("normal");

      const playerNotifs = store.getPlayerNotifications(100);
      expect(playerNotifs).toHaveLength(1);
      expect(playerNotifs[0].title).toBe("Hello");
    });

    it("broadcasts when no targets specified", async () => {
      const store = await getStore();
      store.notify({ title: "Server message" });

      // Any player should see broadcasts
      expect(store.getPlayerNotifications(1)).toHaveLength(1);
      expect(store.getPlayerNotifications(999)).toHaveLength(1);
    });

    it("sends to multiple players", async () => {
      const store = await getStore();
      store.notify({ title: "Team msg", targetPlayerIds: [1, 2, 3] });

      expect(store.getPlayerNotifications(1)).toHaveLength(1);
      expect(store.getPlayerNotifications(2)).toHaveLength(1);
      expect(store.getPlayerNotifications(3)).toHaveLength(1);
      expect(store.getPlayerNotifications(4)).toHaveLength(0);
    });
  });

  describe("convenience methods", () => {
    it("toast sends a short toast", async () => {
      const store = await getStore();
      const notif = store.toast("Quick!", [100]);

      expect(notif.type).toBe("toast");
      expect(notif.duration).toBe("short");
    });

    it("announce broadcasts an announcement", async () => {
      const store = await getStore();
      const notif = store.announce("Big news!", "Details here");

      expect(notif.type).toBe("announcement");
      expect(notif.priority).toBe("high");
      expect(notif.body).toBe("Details here");
    });

    it("reward sends to specific player", async () => {
      const store = await getStore();
      const notif = store.reward(100, "You won!", "500 coins", "coin_icon");

      expect(notif.type).toBe("reward");
      expect(notif.targetPlayerIds).toContain(100);
      expect(notif.icon).toBe("coin_icon");
    });

    it("system sends urgent persistent notification", async () => {
      const store = await getStore();
      const notif = store.system("Maintenance", "Server restart in 5 min");

      expect(notif.type).toBe("system");
      expect(notif.priority).toBe("urgent");
      expect(notif.duration).toBe("persistent");
    });
  });

  describe("dismiss", () => {
    it("dismisses a targeted notification", async () => {
      const store = await getStore();
      const notif = store.notify({ title: "Test", targetPlayerIds: [100] });

      expect(store.dismiss(notif.id)).toBe(true);
      expect(store.getPlayerNotifications(100)).toHaveLength(0);
    });

    it("dismisses a broadcast notification", async () => {
      const store = await getStore();
      const notif = store.notify({ title: "Broadcast" });

      expect(store.dismiss(notif.id)).toBe(true);
      expect(store.getPlayerNotifications(1)).toHaveLength(0);
    });

    it("returns false for unknown notification", async () => {
      const store = await getStore();
      expect(store.dismiss("nonexistent")).toBe(false);
    });

    it("calls onDismiss callback", async () => {
      const onDismiss = vi.fn();
      const store = await getStore({ onDismiss });
      const notif = store.notify({ title: "Test", targetPlayerIds: [1] });

      store.dismiss(notif.id);
      expect(onDismiss).toHaveBeenCalledWith(notif.id);
    });
  });

  describe("actions", () => {
    it("triggers an action callback", async () => {
      const onAction = vi.fn();
      const store = await getStore({ onAction });
      const notif = store.notify({
        title: "Shop",
        action: "open_shop",
        targetPlayerIds: [100],
      });

      expect(store.triggerAction(notif.id, 100)).toBe(true);
      expect(onAction).toHaveBeenCalledWith(notif.id, "open_shop", 100);
    });

    it("returns false when no action on notification", async () => {
      const store = await getStore();
      const notif = store.notify({ title: "No action", targetPlayerIds: [1] });

      expect(store.triggerAction(notif.id, 1)).toBe(false);
    });
  });

  describe("pending count", () => {
    it("counts pending notifications", async () => {
      const store = await getStore();
      store.notify({ title: "A", targetPlayerIds: [1] });
      store.notify({ title: "B", targetPlayerIds: [1] });
      store.notify({ title: "C" }); // broadcast

      expect(store.getPendingCount(1)).toBe(3);
    });

    it("excludes dismissed from count", async () => {
      const store = await getStore();
      const n = store.notify({ title: "A", targetPlayerIds: [1] });
      store.notify({ title: "B", targetPlayerIds: [1] });

      store.dismiss(n.id);
      expect(store.getPendingCount(1)).toBe(1);
    });
  });

  describe("cleanup", () => {
    it("removes expired notifications", async () => {
      const store = await getStore();
      store.notify({
        title: "Expiring",
        targetPlayerIds: [1],
        expiresAt: 1005,
      });

      mockTime = 1010;
      const removed = store.cleanup();

      expect(removed).toBe(1);
      expect(store.getPlayerNotifications(1)).toHaveLength(0);
    });

    it("removes dismissed notifications", async () => {
      const store = await getStore();
      const n = store.notify({ title: "Test", targetPlayerIds: [1] });
      store.dismiss(n.id);

      const removed = store.cleanup();
      expect(removed).toBe(1);
    });

    it("keeps non-expired active notifications", async () => {
      const store = await getStore();
      store.notify({ title: "Active", targetPlayerIds: [1] });

      const removed = store.cleanup();
      expect(removed).toBe(0);
      expect(store.getPlayerNotifications(1)).toHaveLength(1);
    });
  });

  describe("queue limits", () => {
    it("enforces max queue size", async () => {
      const store = await getStore({ maxQueueSize: 3 });

      store.notify({ title: "1", targetPlayerIds: [1] });
      store.notify({ title: "2", targetPlayerIds: [1] });
      store.notify({ title: "3", targetPlayerIds: [1] });
      store.notify({ title: "4", targetPlayerIds: [1] });

      const notifs = store.getPlayerNotifications(1);
      expect(notifs).toHaveLength(3);
      // Oldest should be removed, newest kept
      expect(notifs[2].title).toBe("4");
    });

    it("drops oldest urgent when all notifications are urgent and queue is full", async () => {
      const store = await getStore({ maxQueueSize: 2 });

      store.notify({ title: "Urgent1", targetPlayerIds: [1], priority: "urgent" });
      store.notify({ title: "Urgent2", targetPlayerIds: [1], priority: "urgent" });
      // Queue is full with 2 urgent items; adding a 3rd should drop the oldest urgent
      store.notify({ title: "Urgent3", targetPlayerIds: [1], priority: "urgent" });

      const notifs = store.getPlayerNotifications(1);
      expect(notifs).toHaveLength(2);
      // Oldest (Urgent1) should have been removed
      expect(notifs[0].title).toBe("Urgent2");
      expect(notifs[1].title).toBe("Urgent3");
    });

    it("prefers dropping non-urgent over urgent when mixed", async () => {
      const store = await getStore({ maxQueueSize: 2 });

      store.notify({ title: "Normal", targetPlayerIds: [1], priority: "normal" });
      store.notify({ title: "Urgent1", targetPlayerIds: [1], priority: "urgent" });
      // Queue full with [Normal, Urgent1]; adding should drop Normal (non-urgent)
      store.notify({ title: "New", targetPlayerIds: [1], priority: "normal" });

      const notifs = store.getPlayerNotifications(1);
      expect(notifs).toHaveLength(2);
      expect(notifs[0].title).toBe("Urgent1");
      expect(notifs[1].title).toBe("New");
    });
  });

  describe("clear", () => {
    it("clears a specific player", async () => {
      const store = await getStore();
      store.notify({ title: "A", targetPlayerIds: [1] });
      store.notify({ title: "B", targetPlayerIds: [2] });

      store.clearPlayer(1);
      expect(store.getPlayerNotifications(1)).toHaveLength(0);
      expect(store.getPlayerNotifications(2)).toHaveLength(1);
    });

    it("clears everything", async () => {
      const store = await getStore();
      store.notify({ title: "A", targetPlayerIds: [1] });
      store.notify({ title: "B" }); // broadcast

      store.clearAll();
      expect(store.getPlayerNotifications(1)).toHaveLength(0);
    });
  });

  describe("callbacks", () => {
    it("calls onShow when notification is created", async () => {
      const onShow = vi.fn();
      const store = await getStore({ onShow });

      store.notify({ title: "Test" });
      expect(onShow).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// AnnouncementManager
// ============================================================================

describe("AnnouncementManager", () => {
  beforeEach(() => {
    setupGlobals();
    vi.resetModules();
  });
  afterEach(teardownGlobals);

  async function getManager(overrides?: Partial<NotificationsConfig>) {
    const { NotificationStore } = await import("./notification-store");
    const { AnnouncementManager } = await import("./announcement-manager");
    const config = makeConfig(overrides);
    const store = new NotificationStore(config);
    const manager = new AnnouncementManager(store, config);
    return { store, manager };
  }

  describe("scheduled announcements", () => {
    it("fires a one-shot announcement on first tick", async () => {
      const { store, manager } = await getManager();

      manager.registerAnnouncement({
        id: "welcome",
        title: "Welcome!",
        body: "Enjoy the game",
        repeatInterval: 0,
        priority: "normal",
        duration: "medium",
      });

      manager.tick();

      // Should be in broadcasts
      expect(store.getPlayerNotifications(1)).toHaveLength(1);
      expect(store.getPlayerNotifications(1)[0].title).toBe("Welcome!");
    });

    it("does not re-fire one-shot on subsequent ticks", async () => {
      const { store, manager } = await getManager();

      manager.registerAnnouncement({
        id: "once",
        title: "Once",
        body: "",
        repeatInterval: 0,
        priority: "normal",
        duration: "short",
      });

      manager.tick();
      manager.tick();
      manager.tick();

      expect(store.getPlayerNotifications(1)).toHaveLength(1);
    });

    it("fires repeating announcements on interval", async () => {
      const { store, manager } = await getManager();

      manager.registerAnnouncement({
        id: "reminder",
        title: "Reminder",
        body: "",
        repeatInterval: 60,
        priority: "normal",
        duration: "short",
      });

      manager.tick(); // fires at t=1000
      expect(store.getPlayerNotifications(1)).toHaveLength(1);

      mockTime = 1030;
      manager.tick(); // too early
      expect(store.getPlayerNotifications(1)).toHaveLength(1);

      mockTime = 1060;
      manager.tick(); // fires at t=1060
      expect(store.getPlayerNotifications(1)).toHaveLength(2);
    });

    it("fires manually with fireNow", async () => {
      const { store, manager } = await getManager();

      manager.registerAnnouncement({
        id: "manual",
        title: "Manual",
        body: "",
        repeatInterval: 300,
        priority: "high",
        duration: "long",
      });

      manager.fireNow("manual");
      expect(store.getPlayerNotifications(1)).toHaveLength(1);
    });

    it("returns false for unknown announcement fireNow", async () => {
      const { manager } = await getManager();
      expect(manager.fireNow("nope")).toBe(false);
    });

    it("unregisters an announcement", async () => {
      const { store, manager } = await getManager();

      manager.registerAnnouncement({
        id: "temp",
        title: "Temp",
        body: "",
        repeatInterval: 0,
        priority: "normal",
        duration: "short",
      });

      manager.unregisterAnnouncement("temp");
      manager.tick();

      expect(store.getPlayerNotifications(1)).toHaveLength(0);
    });

    it("lists registered announcements", async () => {
      const { manager } = await getManager();

      manager.registerAnnouncement({
        id: "a",
        title: "A",
        body: "",
        repeatInterval: 0,
        priority: "normal",
        duration: "short",
      });
      manager.registerAnnouncement({
        id: "b",
        title: "B",
        body: "",
        repeatInterval: 60,
        priority: "high",
        duration: "long",
      });

      expect(manager.listAnnouncements()).toHaveLength(2);
    });
  });

  describe("news feed", () => {
    it("adds and retrieves news items", async () => {
      const { manager } = await getManager();

      manager.addNews({
        id: "patch-1",
        title: "Patch 1.0.1",
        body: "Bug fixes",
        category: "patch",
        publishedAt: 900,
      });
      manager.addNews({
        id: "event-1",
        title: "Summer Event",
        body: "Limited time!",
        category: "event",
        publishedAt: 1100,
      });

      const news = manager.getNews();
      expect(news).toHaveLength(2);
      // Newest first
      expect(news[0].id).toBe("event-1");
      expect(news[1].id).toBe("patch-1");
    });

    it("limits news results", async () => {
      const { manager } = await getManager();

      manager.addNews({ id: "1", title: "A", body: "", category: "c", publishedAt: 100 });
      manager.addNews({ id: "2", title: "B", body: "", category: "c", publishedAt: 200 });
      manager.addNews({ id: "3", title: "C", body: "", category: "c", publishedAt: 300 });

      expect(manager.getNews(2)).toHaveLength(2);
    });

    it("filters news by category", async () => {
      const { manager } = await getManager();

      manager.addNews({ id: "1", title: "Patch", body: "", category: "patch", publishedAt: 100 });
      manager.addNews({ id: "2", title: "Event", body: "", category: "event", publishedAt: 200 });
      manager.addNews({ id: "3", title: "Patch2", body: "", category: "patch", publishedAt: 300 });

      const patches = manager.getNewsByCategory("patch");
      expect(patches).toHaveLength(2);
      expect(patches[0].id).toBe("3");
    });

    it("removes a news item", async () => {
      const { manager } = await getManager();

      manager.addNews({ id: "1", title: "A", body: "", category: "c", publishedAt: 100 });
      expect(manager.removeNews("1")).toBe(true);
      expect(manager.getNews()).toHaveLength(0);
    });

    it("returns false removing unknown news", async () => {
      const { manager } = await getManager();
      expect(manager.removeNews("nope")).toBe(false);
    });

    it("clears all news", async () => {
      const { manager } = await getManager();

      manager.addNews({ id: "1", title: "A", body: "", category: "c", publishedAt: 100 });
      manager.addNews({ id: "2", title: "B", body: "", category: "c", publishedAt: 200 });

      manager.clearNews();
      expect(manager.getNews()).toHaveLength(0);
    });
  });
});
