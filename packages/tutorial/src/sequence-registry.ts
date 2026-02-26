/**
 * @broblox/tutorial — Sequence Registry
 *
 * Registers and retrieves tutorial sequences.
 */

import { createLogger } from "@broblox/core";
import type { TutorialSequence } from "./types";

export class SequenceRegistry {
  private sequences = new Map<string, TutorialSequence>();
  private logger;

  constructor(enableLogging = false) {
    this.logger = enableLogging ? createLogger("SequenceRegistry") : undefined;
  }

  /** Register a tutorial sequence */
  register(seq: TutorialSequence): boolean {
    if (this.sequences.has(seq.id)) {
      this.logger?.warn(`Duplicate sequence ID: ${seq.id}`);
      return false;
    }
    this.sequences.set(seq.id, seq);
    return true;
  }

  /** Register multiple sequences */
  registerAll(seqs: TutorialSequence[]): number {
    let added = 0;
    for (let i = 0; i < seqs.size(); i++) {
      if (this.register(seqs[i])) added++;
    }
    return added;
  }

  /** Get a sequence by ID */
  get(id: string): TutorialSequence | undefined {
    return this.sequences.get(id);
  }

  /** Check if a sequence exists */
  has(id: string): boolean {
    return this.sequences.has(id);
  }

  /** Get all registered sequences */
  getAll(): TutorialSequence[] {
    const result: TutorialSequence[] = [];
    this.sequences.forEach((s) => result.push(s));
    return result;
  }

  /** Get count */
  count(): number {
    let c = 0;
    this.sequences.forEach(() => c++);
    return c;
  }

  /** Clear all */
  clear(): void {
    this.sequences.clear();
  }
}
