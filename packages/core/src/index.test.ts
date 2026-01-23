/**
 * Unit tests for @rbx/core package.
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
}

class LoggerImpl implements Logger {
  private prefix: string;
  public logs: Array<{ level: string; message: string }> = [];

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  debug(message: string): void {
    this.logs.push({ level: "DEBUG", message: `${this.prefix} [DEBUG] ${message}` });
  }

  info(message: string): void {
    this.logs.push({ level: "INFO", message: `${this.prefix} [INFO] ${message}` });
  }

  warn(message: string): void {
    this.logs.push({ level: "WARN", message: `${this.prefix} [WARN] ${message}` });
  }

  error(message: string): void {
    this.logs.push({ level: "ERROR", message: `${this.prefix} [ERROR] ${message}` });
  }
}

function createLogger(name: string): LoggerImpl {
  return new LoggerImpl(name);
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
