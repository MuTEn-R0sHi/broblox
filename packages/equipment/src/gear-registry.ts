/**
 * @broblox/equipment — Gear Registry
 *
 * Static registry for gear definitions. Populated once at startup, never mutated.
 */

import type { GearDefinition } from "./types";

export class GearRegistry {
  private readonly defs = new Map<string, GearDefinition>();

  /** Register a single gear definition. Throws on duplicate ID. */
  register(def: GearDefinition): void {
    if (this.defs.has(def.id)) {
      error(`GearRegistry: Duplicate gear ID "${def.id}"`);
    }
    this.defs.set(def.id, def);
  }

  /** Register multiple gear definitions at once. */
  registerAll(defs: readonly GearDefinition[]): void {
    for (const def of defs) {
      this.register(def);
    }
  }

  /** Look up a gear definition by ID. */
  get(id: string): GearDefinition | undefined {
    return this.defs.get(id);
  }

  /** Get all registered gear definitions. */
  getAll(): GearDefinition[] {
    const result: GearDefinition[] = [];
    this.defs.forEach((def) => result.push(def));
    return result;
  }

  /** Get all gear for a specific slot. */
  getBySlot(slot: string): GearDefinition[] {
    const result: GearDefinition[] = [];
    this.defs.forEach((def) => {
      if (def.slot === slot) result.push(def);
    });
    return result;
  }

  /** Get total count of registered gear. */
  count(): number {
    let n = 0;
    this.defs.forEach(() => n++);
    return n;
  }

  /** Check if a gear ID is registered. */
  has(id: string): boolean {
    return this.defs.has(id);
  }
}
