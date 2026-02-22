/**
 * @rbx/core
 * Core utilities for the platform.
 * Compatible with roblox-ts.
 */

// Application lifecycle
export * from "./application";

// Player lifecycle factory
export * from "./create-player-lifecycle-service";

// Roblox-TS compatible collection helpers
export { arraySize, arrayRemoveAt, arrayTake, setSize, mapSize } from "./collections";

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4,
}

// ============================================================================
// Logger Types
// ============================================================================

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  setLevel(level: LogLevel): void;
  /**
   * Create a child logger with additional prefix.
   * Child loggers inherit the parent's log level.
   */
  child(name: string): Logger;
}

// ============================================================================
// Logger Implementation
// ============================================================================

class LoggerImpl implements Logger {
  private prefix: string;
  private level: LogLevel = LogLevel.Info;

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  child(name: string): Logger {
    // Create a new logger with combined prefix
    const childLogger = new LoggerImpl(`${this.prefix.sub(2, this.prefix.size() - 1)}/${name}`);
    childLogger.setLevel(this.level);
    return childLogger;
  }

  debug(message: string): void {
    if (this.level <= LogLevel.Debug) {
      print(`${this.prefix} [DEBUG] ${message}`);
    }
  }

  info(message: string): void {
    if (this.level <= LogLevel.Info) {
      print(`${this.prefix} [INFO] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.level <= LogLevel.Warn) {
      warn(`${this.prefix} [WARN] ${message}`);
    }
  }

  error(message: string): void {
    if (this.level <= LogLevel.Error) {
      warn(`${this.prefix} [ERROR] ${message}`);
    }
  }
}

/**
 * Create a logger instance for a module.
 */
export function createLogger(name: string): Logger {
  return new LoggerImpl(name);
}

/**
 * Log an error with full context.
 * Formats the error value and context into a readable message.
 */
export function logError(
  logger: Logger,
  message: string,
  errorValue: unknown,
  extraInfo?: string
): void {
  let errorStr: string;

  if (typeOf(errorValue) === "string") {
    errorStr = errorValue as string;
  } else if (typeOf(errorValue) === "table") {
    // Check if it's an error-like object
    const errObj = errorValue as { message?: string; code?: unknown };
    if (errObj.message !== undefined) {
      const codeStr = errObj.code !== undefined ? ` (code: ${tostring(errObj.code)})` : "";
      errorStr = `${errObj.message}${codeStr}`;
    } else {
      const [success, result] = pcall(() => game.GetService("HttpService").JSONEncode(errorValue));
      errorStr = success ? (result as string) : tostring(errorValue);
    }
  } else {
    errorStr = tostring(errorValue);
  }

  const fullMessage = extraInfo
    ? `${message}: ${errorStr} (${extraInfo})`
    : `${message}: ${errorStr}`;
  logger.error(fullMessage);
}

// Janitor (cleanup utility)
export class Janitor {
  private tasks: Array<() => void> = [];

  add(task: () => void): void {
    this.tasks.push(task);
  }

  addConnection(connection: RBXScriptConnection): void {
    this.add(() => connection.Disconnect());
  }

  addInstance(instance: Instance): void {
    this.add(() => instance.Destroy());
  }

  cleanup(): void {
    for (const task of this.tasks) {
      const [ok, err] = pcall(task);
      if (!ok) {
        print(`[Janitor] cleanup task failed: ${tostring(err)}`);
      }
    }
    this.tasks = [];
  }

  destroy(): void {
    this.cleanup();
  }
}

// Clock
export const Clock = {
  now(): number {
    return os.clock();
  },
  timestamp(): number {
    return os.time();
  },
};
