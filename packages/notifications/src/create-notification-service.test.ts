/**
 * Tests for createNotificationService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createNotificationService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockAnnouncementManager: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockStore = {
      notify: vi.fn(),
      clearPlayer: vi.fn(),
      getPlayerNotifications: vi.fn(() => []),
    };

    mockAnnouncementManager = {
      registerAnnouncement: vi.fn(),
      unregisterAnnouncement: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./types", () => ({
      DEFAULT_NOTIFICATIONS_CONFIG: {
        maxQueueSize: 50,
        enableLogging: true,
      },
    }));
    vi.doMock("./notification-store", () => ({
      NotificationStore: function () {
        return mockStore;
      },
    }));
    vi.doMock("./announcement-manager", () => ({
      AnnouncementManager: function () {
        return mockAnnouncementManager;
      },
    }));
  });

  function makeConfig() {
    return {
      announcements: [{ id: "welcome", message: "Welcome!", interval: 300 }] as never[],
    };
  }

  async function createService(
    cfg?: Parameters<typeof import("./create-notification-service").createNotificationService>[0]
  ) {
    const mod = await import("./create-notification-service");
    return mod.createNotificationService(cfg ?? makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("NotificationService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers announcements on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockAnnouncementManager.registerAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ id: "welcome" })
    );
  });

  it("skips announcement registration when none provided", async () => {
    const handle = await createService({});
    handle.Service.onInit!();

    expect(mockAnnouncementManager.registerAnnouncement).not.toHaveBeenCalled();
  });

  it("logs on start and destroy", async () => {
    const handle = await createService();
    handle.Service.onStart!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));

    handle.Service.onDestroy!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stopped"));
  });

  it("cleanupPlayer clears the player's queue", async () => {
    const handle = await createService();
    handle.cleanupPlayer(42);

    expect(mockStore.clearPlayer).toHaveBeenCalledWith(42);
  });

  it("exposes store and announcement manager", async () => {
    const handle = await createService();
    expect(handle.getNotificationStore()).toBe(mockStore);
    expect(handle.getAnnouncementManager()).toBe(mockAnnouncementManager);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-notification-service");
    const h1 = mod.createNotificationService(makeConfig());
    const h2 = mod.createNotificationService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });
});
