/**
 * Tests for createRemoteService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createRemoteService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      initialize: vi.fn(),
      getRemote: vi.fn(),
      onFunction: vi.fn(),
      onEvent: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./registry/server", () => ({
      ServerRemoteRegistry: function () {
        return mockRegistry;
      },
    }));
  });

  function makeConfig() {
    return {
      registry: {
        ping: { type: "function" as const },
        chat: { type: "event" as const },
      },
    };
  }

  async function createService(
    cfg?: Parameters<typeof import("./create-remote-service").createRemoteService>[0]
  ) {
    const mod = await import("./create-remote-service");
    return mod.createRemoteService(cfg ?? makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("RemoteService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("initializes server registry on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.initialize).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("remotes created"));
  });

  it("logs on start and destroy", async () => {
    const handle = await createService();
    handle.Service.onStart!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));

    handle.Service.onDestroy!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stopped"));
  });

  it("exposes the server registry", async () => {
    const handle = await createService();
    expect(handle.getRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-remote-service");
    const h1 = mod.createRemoteService(makeConfig());
    const h2 = mod.createRemoteService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });

  it("calls registry.cleanupPlayer on player leave when onPlayerRemoving is provided", async () => {
    mockRegistry.cleanupPlayer = vi.fn();

    let registeredCallback: ((player: unknown) => void) | undefined;
    const onPlayerRemoving = vi.fn((cb: (player: unknown) => void) => {
      registeredCallback = cb;
    });

    const handle = await createService({ ...makeConfig(), onPlayerRemoving } as never);
    handle.Service.onInit!();

    expect(onPlayerRemoving).toHaveBeenCalled();
    expect(registeredCallback).toBeDefined();

    const fakePlayer = { UserId: 42, Name: "TestPlayer" };
    registeredCallback!(fakePlayer);

    expect(mockRegistry.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("skips cleanup registration when onPlayerRemoving not provided", async () => {
    mockRegistry.cleanupPlayer = vi.fn();
    const handle = await createService();
    handle.Service.onInit!();
    expect(mockRegistry.cleanupPlayer).not.toHaveBeenCalled();
  });
});
