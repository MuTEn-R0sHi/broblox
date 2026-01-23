/**
 * @rbx/core
 * Core utilities for the platform.
 * Compatible with roblox-ts.
 */

// Logger
export * from "./application";

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  None = 4,
}

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  setLevel(level: LogLevel): void;
}

class LoggerImpl implements Logger {
  private prefix: string;
  private level: LogLevel = LogLevel.Info;

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  setLevel(level: LogLevel) {
    this.level = level;
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

export function createLogger(name: string): Logger {
  return new LoggerImpl(name);
}

// Structured event logging (observability)
let correlationContext: Record<string, unknown> = {};

export function setCorrelationContext(context: Record<string, unknown>): void {
  correlationContext = context;
}

export function getCorrelationContext(): Record<string, unknown> {
  return correlationContext;
}

export function logEvent(
  category: string,
  event: string,
  data: Record<string, unknown> = {}
): void {
  const baseContext = {
    serverId: correlationContext.serverId ?? game.JobId,
    jobId: correlationContext.jobId ?? game.JobId,
    placeId: correlationContext.placeId ?? game.PlaceId,
  };

  const payload = {
    timestamp: os.time(),
    category,
    event,
    ...baseContext,
    ...correlationContext,
    ...data,
  };

  const [success, result] = pcall(() => game.GetService("HttpService").JSONEncode(payload));
  if (success) {
    print(result as string);
  } else {
    print(payload);
  }
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
      pcall(task);
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
