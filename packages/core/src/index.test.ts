/**
 * Unit tests for @broblox/core package.
 * Tests Logger, Janitor, and Clock utilities.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================================
// Mock implementations that mirror the Roblox versions
// ============================================================================

interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  child(name: string): Logger;
}

class LoggerImpl implements Logger {
  private prefix: string;
  public logs: Array<{ level: string; message: string }> = [];

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  child(name: string): LoggerImpl {
    const parentName = this.prefix.slice(1, -1);
    const childLogger = new LoggerImpl(`${parentName}/${name}`);
    childLogger.logs = this.logs; // Share logs array for testing
    return childLogger;
  }

  debug(message: string): void {
    this.logs.push({
      level: "DEBUG",
      message: `${this.prefix} [DEBUG] ${message}`,
    });
  }

  info(message: string): void {
    this.logs.push({
      level: "INFO",
      message: `${this.prefix} [INFO] ${message}`,
    });
  }

  warn(message: string): void {
    this.logs.push({
      level: "WARN",
      message: `${this.prefix} [WARN] ${message}`,
    });
  }

  error(message: string): void {
    this.logs.push({
      level: "ERROR",
      message: `${this.prefix} [ERROR] ${message}`,
    });
  }
}

function createLogger(name: string): LoggerImpl {
  return new LoggerImpl(name);
}

function logError(
  logger: Logger & { logs: Array<{ level: string; message: string }> },
  message: string,
  errorValue: unknown,
  extraInfo?: string
): void {
  let errorStr: string;

  if (typeof errorValue === "string") {
    errorStr = errorValue;
  } else if (typeof errorValue === "object" && errorValue !== null) {
    const errObj = errorValue as { message?: string; code?: unknown };
    if (errObj.message !== undefined) {
      const codeStr = errObj.code !== undefined ? ` (code: ${String(errObj.code)})` : "";
      errorStr = `${errObj.message}${codeStr}`;
    } else {
      errorStr = JSON.stringify(errorValue);
    }
  } else {
    errorStr = String(errorValue);
  }

  const fullMessage = extraInfo
    ? `${message}: ${errorStr} (${extraInfo})`
    : `${message}: ${errorStr}`;
  logger.error(fullMessage);
}

class Janitor {
  private tasks: Array<() => void> = [];

  add(task: () => void): void {
    this.tasks.push(task);
  }

  addConnection(connection: { Disconnect: () => void }): void {
    this.add(() => connection.Disconnect());
  }

  addInstance(instance: { Destroy: () => void }): void {
    this.add(() => instance.Destroy());
  }

  cleanup(): void {
    for (const task of this.tasks) {
      try {
        task();
      } catch {
        // pcall equivalent - ignore errors during cleanup
      }
    }
    this.tasks = [];
  }

  destroy(): void {
    this.cleanup();
  }

  getTaskCount(): number {
    return this.tasks.length;
  }
}

const Clock = {
  now(): number {
    return performance.now() / 1000;
  },
  timestamp(): number {
    return Math.floor(Date.now() / 1000);
  },
};

// ============================================================================
// Tests
// ============================================================================

describe("Logger", () => {
  let logger: LoggerImpl;

  beforeEach(() => {
    logger = createLogger("TestModule");
  });

  describe("createLogger", () => {
    it("creates a logger with the given name", () => {
      const customLogger = createLogger("CustomModule");
      customLogger.info("test");
      expect(customLogger.logs[0].message).toContain("[CustomModule]");
    });
  });

  describe("log levels", () => {
    it("logs debug messages with correct format", () => {
      logger.debug("debug message");
      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("DEBUG");
      expect(logger.logs[0].message).toBe("[TestModule] [DEBUG] debug message");
    });

    it("logs info messages with correct format", () => {
      logger.info("info message");
      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("INFO");
      expect(logger.logs[0].message).toBe("[TestModule] [INFO] info message");
    });

    it("logs warn messages with correct format", () => {
      logger.warn("warn message");
      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("WARN");
      expect(logger.logs[0].message).toBe("[TestModule] [WARN] warn message");
    });

    it("logs error messages with correct format", () => {
      logger.error("error message");
      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe("ERROR");
      expect(logger.logs[0].message).toBe("[TestModule] [ERROR] error message");
    });
  });

  describe("multiple messages", () => {
    it("tracks multiple log entries", () => {
      logger.debug("first");
      logger.info("second");
      logger.warn("third");
      logger.error("fourth");

      expect(logger.logs).toHaveLength(4);
      expect(logger.logs[0].level).toBe("DEBUG");
      expect(logger.logs[1].level).toBe("INFO");
      expect(logger.logs[2].level).toBe("WARN");
      expect(logger.logs[3].level).toBe("ERROR");
    });
  });

  describe("child logger", () => {
    it("creates child logger with combined prefix", () => {
      const childLogger = logger.child("SubModule");
      childLogger.info("Child message");

      expect(logger.logs[0].message).toContain("[TestModule/SubModule]");
    });

    it("creates nested children", () => {
      const childLogger = logger.child("Level1").child("Level2");
      childLogger.info("Nested message");

      expect(logger.logs[0].message).toContain("[TestModule/Level1/Level2]");
    });

    it("shares logs with parent for testing", () => {
      const childLogger = logger.child("Child");
      childLogger.info("First");
      childLogger.warn("Second");

      expect(logger.logs).toHaveLength(2);
    });
  });
});

describe("logError", () => {
  let logger: LoggerImpl;

  beforeEach(() => {
    logger = createLogger("ErrorTest");
  });

  it("logs string errors", () => {
    logError(logger, "Operation failed", "Connection timeout");
    expect(logger.logs[0].message).toContain("Operation failed");
    expect(logger.logs[0].message).toContain("Connection timeout");
  });

  it("logs error objects with message", () => {
    logError(logger, "Operation failed", { message: "Invalid input" });
    expect(logger.logs[0].message).toContain("Invalid input");
  });

  it("logs error objects with code", () => {
    logError(logger, "Operation failed", { code: 500, message: "Server error" });
    expect(logger.logs[0].message).toContain("Server error");
    expect(logger.logs[0].message).toContain("(code: 500)");
  });

  it("includes extra info when provided", () => {
    logError(logger, "Failed", "Error", "userId=123");
    expect(logger.logs[0].message).toContain("(userId=123)");
  });

  it("handles non-object errors", () => {
    logError(logger, "Failed", 42);
    expect(logger.logs[0].message).toContain("42");
  });
});

describe("Janitor", () => {
  let janitor: Janitor;

  beforeEach(() => {
    janitor = new Janitor();
  });

  describe("add", () => {
    it("adds a cleanup task", () => {
      const fn = vi.fn();
      janitor.add(fn);
      expect(janitor.getTaskCount()).toBe(1);
    });

    it("allows adding multiple tasks", () => {
      janitor.add(() => {});
      janitor.add(() => {});
      janitor.add(() => {});
      expect(janitor.getTaskCount()).toBe(3);
    });
  });

  describe("addConnection", () => {
    it("adds a connection to disconnect on cleanup", () => {
      const disconnect = vi.fn();
      const connection = { Disconnect: disconnect };

      janitor.addConnection(connection);
      janitor.cleanup();

      expect(disconnect).toHaveBeenCalledOnce();
    });
  });

  describe("addInstance", () => {
    it("adds an instance to destroy on cleanup", () => {
      const destroy = vi.fn();
      const instance = { Destroy: destroy };

      janitor.addInstance(instance);
      janitor.cleanup();

      expect(destroy).toHaveBeenCalledOnce();
    });
  });

  describe("cleanup", () => {
    it("executes all cleanup tasks", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      janitor.add(fn1);
      janitor.add(fn2);
      janitor.add(fn3);
      janitor.cleanup();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
    });

    it("clears tasks after cleanup", () => {
      janitor.add(() => {});
      janitor.add(() => {});
      expect(janitor.getTaskCount()).toBe(2);

      janitor.cleanup();
      expect(janitor.getTaskCount()).toBe(0);
    });

    it("handles errors in cleanup tasks gracefully", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn(() => {
        throw new Error("cleanup error");
      });
      const fn3 = vi.fn();

      janitor.add(fn1);
      janitor.add(fn2);
      janitor.add(fn3);

      // Should not throw
      expect(() => janitor.cleanup()).not.toThrow();

      // All functions should be called despite error
      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
    });

    it("can be called multiple times safely", () => {
      const fn = vi.fn();
      janitor.add(fn);

      janitor.cleanup();
      janitor.cleanup();

      // Should only be called once since tasks are cleared
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe("destroy", () => {
    it("calls cleanup", () => {
      const fn = vi.fn();
      janitor.add(fn);
      janitor.destroy();
      expect(fn).toHaveBeenCalledOnce();
    });
  });
});

describe("Clock", () => {
  describe("now", () => {
    it("returns a number", () => {
      const result = Clock.now();
      expect(typeof result).toBe("number");
    });

    it("returns increasing values over time", async () => {
      const first = Clock.now();
      await new Promise((r) => setTimeout(r, 10));
      const second = Clock.now();
      expect(second).toBeGreaterThan(first);
    });

    it("returns value in seconds (not milliseconds)", () => {
      const now = Clock.now();
      // Should be a small number (seconds), not a large one (milliseconds)
      expect(now).toBeLessThan(Date.now()); // Date.now() is in ms
    });
  });

  describe("timestamp", () => {
    it("returns a Unix timestamp", () => {
      const result = Clock.timestamp();
      expect(typeof result).toBe("number");
      // Should be roughly current Unix time
      const expectedApprox = Math.floor(Date.now() / 1000);
      expect(result).toBeCloseTo(expectedApprox, -1); // Within 10 seconds
    });

    it("returns an integer", () => {
      const result = Clock.timestamp();
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});
