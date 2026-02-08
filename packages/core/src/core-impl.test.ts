/**
 * Tests for core/index.ts — imports from source for real coverage.
 *
 * Exercises createLogger, LogLevel filtering, child loggers,
 * logError, Janitor, and Clock.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLogger, logError, Janitor, Clock, LogLevel, type Logger } from "./index";

// ============================================================================
// Logger
// ============================================================================

describe("createLogger", () => {
  it("returns a Logger", () => {
    const logger = createLogger("Test");
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});

describe("Logger log levels", () => {
  const g = globalThis as Record<string, unknown>;
  let printSpy: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.fn>;
  let origPrint: unknown;
  let origWarn: unknown;

  beforeEach(() => {
    origPrint = g.print;
    origWarn = g.warn;
    printSpy = vi.fn();
    warnSpy = vi.fn();
    g.print = printSpy;
    g.warn = warnSpy;
  });

  afterEach(() => {
    g.print = origPrint;
    g.warn = origWarn;
  });

  it("debug writes at Debug level", () => {
    const logger = createLogger("D");
    logger.setLevel(LogLevel.Debug);
    logger.debug("hello");
    expect(printSpy).toHaveBeenCalled();
  });

  it("info writes at Info level", () => {
    const logger = createLogger("I");
    logger.setLevel(LogLevel.Info);
    logger.info("hello");
    expect(printSpy).toHaveBeenCalled();
  });

  it("warn writes at Warn level", () => {
    const logger = createLogger("W");
    logger.setLevel(LogLevel.Warn);
    logger.warn("hello");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("error writes at Error level", () => {
    const logger = createLogger("E");
    logger.setLevel(LogLevel.Error);
    logger.error("hello");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("suppresses messages below current level", () => {
    const logger = createLogger("S");
    logger.setLevel(LogLevel.Error);
    logger.debug("no");
    logger.info("no");
    logger.warn("no");
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("None suppresses everything", () => {
    const logger = createLogger("N");
    logger.setLevel(LogLevel.None);
    logger.debug("x");
    logger.info("x");
    logger.warn("x");
    logger.error("x");
    expect(printSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("child logger", () => {
  const g = globalThis as Record<string, unknown>;
  let printSpy: ReturnType<typeof vi.fn>;
  let origPrint: unknown;

  beforeEach(() => {
    origPrint = g.print;
    printSpy = vi.fn();
    g.print = printSpy;
  });

  afterEach(() => {
    g.print = origPrint;
  });

  it("creates child with combined prefix", () => {
    const parent = createLogger("Parent");
    parent.setLevel(LogLevel.Debug);
    const child = parent.child("Child");
    child.debug("test");
    const msg = printSpy.mock.calls[0]?.[0] as string;
    expect(msg).toContain("Parent/Child");
  });

  it("inherits parent log level", () => {
    const parent = createLogger("P");
    parent.setLevel(LogLevel.Error);
    const child = parent.child("C");
    child.debug("hidden");
    expect(printSpy).not.toHaveBeenCalled();
  });
});

// ============================================================================
// logError
// ============================================================================

describe("logError", () => {
  let logger: Logger;
  let errorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorSpy = vi.fn();
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: errorSpy,
      setLevel: vi.fn(),
      child: vi.fn(),
    };
  });

  it("logs string errors", () => {
    logError(logger, "Op failed", "timeout");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("timeout"));
  });

  it("logs error objects with message", () => {
    logError(logger, "Op failed", { message: "bad input" });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("bad input"));
  });

  it("logs error objects with code", () => {
    logError(logger, "Op failed", { message: "fail", code: 500 });
    const msg = errorSpy.mock.calls[0][0];
    expect(msg).toContain("fail");
    expect(msg).toContain("500");
  });

  it("includes extraInfo when provided", () => {
    logError(logger, "Err", "oops", "userId=42");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("(userId=42)"));
  });

  it("handles numeric errors", () => {
    logError(logger, "Err", 42);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("42"));
  });

  it("handles table errors without message via JSONEncode", () => {
    logError(logger, "Err", { some: "data" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// Janitor
// ============================================================================

describe("Janitor", () => {
  let janitor: Janitor;

  beforeEach(() => {
    janitor = new Janitor();
  });

  it("add + cleanup runs all tasks", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    janitor.add(fn1);
    janitor.add(fn2);
    janitor.cleanup();
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("cleanup clears the task list", () => {
    const fn = vi.fn();
    janitor.add(fn);
    janitor.cleanup();
    janitor.cleanup(); // second call — fn should NOT be called again
    expect(fn).toHaveBeenCalledOnce();
  });

  it("addConnection disconnects on cleanup", () => {
    const disconnect = vi.fn();
    janitor.addConnection({ Disconnect: disconnect } as unknown as RBXScriptConnection);
    janitor.cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("addInstance destroys on cleanup", () => {
    const destroy = vi.fn();
    janitor.addInstance({ Destroy: destroy } as unknown as Instance);
    janitor.cleanup();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("cleanup ignores errors in tasks (pcall)", () => {
    const fn1 = vi.fn();
    const fnBad = vi.fn(() => {
      throw new Error("fail");
    });
    const fn3 = vi.fn();
    janitor.add(fn1);
    janitor.add(fnBad);
    janitor.add(fn3);
    expect(() => janitor.cleanup()).not.toThrow();
    expect(fn1).toHaveBeenCalled();
    expect(fn3).toHaveBeenCalled();
  });

  it("destroy calls cleanup", () => {
    const fn = vi.fn();
    janitor.add(fn);
    janitor.destroy();
    expect(fn).toHaveBeenCalledOnce();
  });
});

// ============================================================================
// Clock
// ============================================================================

describe("Clock", () => {
  it("now returns a positive number (seconds)", () => {
    expect(Clock.now()).toBeGreaterThan(0);
  });

  it("timestamp returns a Unix timestamp", () => {
    const ts = Clock.timestamp();
    expect(ts).toBeGreaterThan(1_000_000_000);
    expect(Number.isInteger(ts)).toBe(true);
  });
});
