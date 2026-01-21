/**
 * @rbx/core
 * Core utilities for the platform.
 * Compatible with roblox-ts.
 */

// Logger
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

class LoggerImpl implements Logger {
  private prefix: string;

  constructor(name: string) {
    this.prefix = `[${name}]`;
  }

  debug(message: string): void {
    print(`${this.prefix} [DEBUG] ${message}`);
  }

  info(message: string): void {
    print(`${this.prefix} [INFO] ${message}`);
  }

  warn(message: string): void {
    warn(`${this.prefix} [WARN] ${message}`);
  }

  error(message: string): void {
    warn(`${this.prefix} [ERROR] ${message}`);
  }
}

export function createLogger(name: string): Logger {
  return new LoggerImpl(name);
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
