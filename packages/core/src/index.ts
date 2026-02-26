/**
 * @broblox/core
 * Core utilities for the platform.
 * Compatible with roblox-ts.
 */

// Application lifecycle
export * from "./application";

// Player lifecycle factory
export * from "./create-player-lifecycle-service";

// Roblox-TS compatible collection helpers
export { arraySize, arrayRemoveAt, arrayTake, setSize, mapSize } from "./collections";

// Logger (extracted to avoid circular deps with create-player-lifecycle-service)
export { LogLevel, createLogger, logError } from "./logger";
export type { Logger } from "./logger";

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
