/**
 * @rbx/audio — Sound Registry
 *
 * Registers and retrieves sound definitions.
 */

import { createLogger } from "@rbx/core";
import type { SoundDefinition, AudioChannel } from "./types";

export class SoundRegistry {
  private sounds = new Map<string, SoundDefinition>();
  private logger;

  constructor(enableLogging = false) {
    this.logger = enableLogging ? createLogger("SoundRegistry") : undefined;
  }

  /** Register a sound definition */
  register(sound: SoundDefinition): boolean {
    if (this.sounds.has(sound.id)) {
      this.logger?.warn(`Duplicate sound ID: ${sound.id}`);
      return false;
    }
    this.sounds.set(sound.id, sound);
    return true;
  }

  /** Register multiple sounds */
  registerAll(sounds: SoundDefinition[]): number {
    let added = 0;
    for (let i = 0; i < sounds.size(); i++) {
      if (this.register(sounds[i])) added++;
    }
    return added;
  }

  /** Get a sound by ID */
  get(id: string): SoundDefinition | undefined {
    return this.sounds.get(id);
  }

  /** Check if a sound exists */
  has(id: string): boolean {
    return this.sounds.has(id);
  }

  /** Get all sounds for a channel */
  getByChannel(channel: AudioChannel): SoundDefinition[] {
    const result: SoundDefinition[] = [];
    this.sounds.forEach((sound) => {
      if (sound.channel === channel) result.push(sound);
    });
    return result;
  }

  /** Get all sounds in a group */
  getByGroup(group: string): SoundDefinition[] {
    const result: SoundDefinition[] = [];
    this.sounds.forEach((sound) => {
      if (sound.group === group) result.push(sound);
    });
    return result;
  }

  /** Get all sound definitions */
  getAll(): SoundDefinition[] {
    const result: SoundDefinition[] = [];
    this.sounds.forEach((s) => result.push(s));
    return result;
  }

  /** Get count */
  count(): number {
    let c = 0;
    this.sounds.forEach(() => c++);
    return c;
  }

  /** Remove a sound */
  remove(id: string): boolean {
    return this.sounds.delete(id);
  }

  /** Clear all */
  clear(): void {
    this.sounds.clear();
  }
}
