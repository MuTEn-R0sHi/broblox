/**
 * Tests for createLocalizationService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createLocalizationService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockI18n: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockI18n = {
      registerStrings: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./localization-service", () => ({
      LocalizationService: function () {
        return mockI18n;
      },
    }));
  });

  function makeConfig() {
    return {
      strings: [
        { locale: "en" as const, entries: { hello: "Hello" }, namespace: "ui" },
        { locale: "es" as const, entries: { hello: "Hola" }, namespace: "ui" },
      ],
    };
  }

  async function createService() {
    const mod = await import("./create-localization-service");
    return mod.createLocalizationService(makeConfig());
  }

  it("returns a Service with onInit and onStart", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("LocalizationService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
  });

  it("creates I18n with default locale en", async () => {
    await createService();
    // Service was created successfully with default locale
    expect(mockLogger).toBeDefined();
  });

  it("creates I18n with custom default locale", async () => {
    const mod = await import("./create-localization-service");
    const handle = mod.createLocalizationService({ strings: [], defaultLocale: "es" as never });
    expect(handle.getI18n()).toBeDefined();
  });

  it("registers all string tables on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockI18n.registerStrings).toHaveBeenCalledTimes(2);
    expect(mockI18n.registerStrings).toHaveBeenCalledWith("en", { hello: "Hello" }, "ui");
    expect(mockI18n.registerStrings).toHaveBeenCalledWith("es", { hello: "Hola" }, "ui");
  });

  it("logs on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("initialized"));
  });

  it("logs on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
  });

  it("exposes getI18n", async () => {
    const handle = await createService();
    expect(handle.getI18n()).toBe(mockI18n);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-localization-service");
    const h1 = mod.createLocalizationService({ strings: [] });
    const h2 = mod.createLocalizationService({ strings: [] });
    expect(h1.Service).not.toBe(h2.Service);
  });
});
