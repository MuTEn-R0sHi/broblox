/**
 * @broblox/hazards — Hazard Registry
 *
 * Immutable registry of hazard definitions. Built once during service init,
 * queried at runtime by the hazard manager.
 */

import type { HazardDefinition, HazardRegistry } from "./types";

/** Create a hazard registry from an array of definitions. */
export function createHazardRegistry(definitions: HazardDefinition[]): HazardRegistry {
  const byId = new Map<string, HazardDefinition>();
  const byTag = new Map<string, HazardDefinition>();

  for (const def of definitions) {
    if (byId.has(def.id)) {
      error(`Duplicate hazard id: ${def.id}`);
    }
    if (byTag.has(def.tag)) {
      error(`Duplicate hazard tag: ${def.tag}`);
    }
    byId.set(def.id, def);
    byTag.set(def.tag, def);
  }

  return {
    get(id: string) {
      return byId.get(id);
    },
    getAll() {
      const result: HazardDefinition[] = [];
      byId.forEach((d) => result.push(d));
      return result;
    },
    getByTag(tag: string) {
      return byTag.get(tag);
    },
    has(id: string) {
      return byId.has(id);
    },
    count() {
      let n = 0;
      byId.forEach(() => n++);
      return n;
    },
  };
}
