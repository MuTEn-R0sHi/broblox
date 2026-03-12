/**
 * Janitor — cleanup utility for managing disposable resources.
 * Collects cleanup tasks and executes them on cleanup/destroy.
 */
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
