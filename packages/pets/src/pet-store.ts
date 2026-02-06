/**
 * @rbx/pets — Pet Store
 *
 * Per-player pet collection management with leveling, evolution, and equipping.
 */

import { createLogger } from "@rbx/core";
import { createCounter } from "@rbx/observability";
import type {
  PetInstance,
  PetPlayerData,
  PetResult,
  PetConfig,
  PetStats,
  PetLevelUpEvent,
  PetEvolvedEvent,
  PetEquippedEvent,
  PetLevelUpCallback,
  PetEvolvedCallback,
  PetEquippedCallback,
} from "./types";
import { DEFAULT_PET_CONFIG, PET_DATA_VERSION } from "./types";
import { PetRegistry } from "./pet-registry";

// Roblox globals
declare const game: { GetService(name: string): unknown };
declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;
declare function typeIs(value: unknown, typeName: string): boolean;
declare const os: { time(): number };

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
}
interface DataStoreService {
  GetDataStore(name: string): DataStore;
}
interface HttpService {
  GenerateGUID(wrapInCurlyBraces: boolean): string;
}

// Observability counters
const petsAdded = createCounter("pets_added");
const petsRemoved = createCounter("pets_removed");
const petsLevelUp = createCounter("pets_level_up");
const petsEvolved = createCounter("pets_evolved");

export class PetStore {
  private playerId: number;
  private registry: PetRegistry;
  private config: Required<PetConfig>;
  private data: PetPlayerData;
  private dirty = false;
  private logger;
  private store: DataStore | undefined;

  // Callbacks
  private levelUpCallbacks: PetLevelUpCallback[] = [];
  private evolvedCallbacks: PetEvolvedCallback[] = [];
  private equippedCallbacks: PetEquippedCallback[] = [];

  constructor(playerId: number, registry: PetRegistry, config?: PetConfig) {
    this.playerId = playerId;
    this.registry = registry;
    this.config = {
      datastoreName: config?.datastoreName ?? DEFAULT_PET_CONFIG.datastoreName,
      defaultMaxSlots: config?.defaultMaxSlots ?? DEFAULT_PET_CONFIG.defaultMaxSlots,
      maxEquipped: config?.maxEquipped ?? DEFAULT_PET_CONFIG.maxEquipped,
      enableLogging: config?.enableLogging ?? DEFAULT_PET_CONFIG.enableLogging,
    };
    this.logger = this.config.enableLogging ? createLogger("PetStore") : undefined;
    this.data = {
      playerId,
      pets: [],
      maxSlots: this.config.defaultMaxSlots,
      version: PET_DATA_VERSION,
    };
  }

  /** Initialize store (call before load). */
  init(): void {
    const dss = game.GetService("DataStoreService") as DataStoreService;
    this.store = dss.GetDataStore(this.config.datastoreName);
    this.logger?.info(`PetStore initialized for player ${this.playerId}`);
  }

  // --------------------------------------------------------------------------
  // Persistence (DataStore)
  // --------------------------------------------------------------------------

  /** Load pet data from DataStore. */
  load(): boolean {
    if (!this.store) return false;
    const [ok, raw] = pcall(() => this.store!.GetAsync(`pets_${this.playerId}`));
    if (!ok) return false;
    if (raw !== undefined && typeIs(raw, "table")) {
      const saved = raw as unknown as PetPlayerData;
      this.data = {
        playerId: this.playerId,
        pets: saved.pets ?? [],
        maxSlots: saved.maxSlots ?? this.config.defaultMaxSlots,
        version: saved.version ?? PET_DATA_VERSION,
      };
    }
    this.dirty = false;
    this.logger?.info(`Loaded ${this.petCount()} pets for player ${this.playerId}`);
    return true;
  }

  /** Save pet data to DataStore. */
  save(): boolean {
    if (!this.store) return false;
    const [ok] = pcall(() => this.store!.SetAsync(`pets_${this.playerId}`, this.data));
    if (!ok) return false;
    this.dirty = false;
    this.logger?.info(`Saved pets for player ${this.playerId}`);
    return true;
  }

  // --------------------------------------------------------------------------
  // Add / Remove Pets
  // --------------------------------------------------------------------------

  /** Add a new pet to the player's collection. */
  addPet(speciesId: string, nickname?: string): PetResult {
    const species = this.registry.get(speciesId);
    if (!species) {
      return { ok: false, status: "species_not_found", message: `Unknown species: ${speciesId}` };
    }

    if (this.petCount() >= this.data.maxSlots) {
      return { ok: false, status: "slots_full", message: "Pet slots full" };
    }

    const pet: PetInstance = {
      instanceId: (game.GetService("HttpService") as HttpService).GenerateGUID(false),
      speciesId,
      nickname,
      level: 1,
      xp: 0,
      equipped: false,
      locked: false,
      acquiredAt: os.time(),
    };

    this.data.pets.push(pet);
    this.dirty = true;
    petsAdded.inc();
    this.logger?.info(`Added pet: ${speciesId} (${pet.instanceId})`);
    return { ok: true, status: "success", pet };
  }

  /** Remove a pet by instance ID. */
  removePet(instanceId: string): PetResult {
    const idx = this.findPetIndex(instanceId);
    if (idx < 0) {
      return { ok: false, status: "pet_not_found" };
    }

    const pet = this.data.pets[idx];
    if (pet.locked) {
      return { ok: false, status: "pet_locked", message: "Pet is locked" };
    }

    // Remove by rebuilding array (no splice in roblox-ts)
    const newPets: PetInstance[] = [];
    for (let i = 0; i < this.data.pets.size(); i++) {
      if (i !== idx) newPets.push(this.data.pets[i]);
    }
    this.data.pets = newPets;
    this.dirty = true;
    petsRemoved.inc();
    this.logger?.info(`Removed pet: ${instanceId}`);
    return { ok: true, status: "success", pet };
  }

  // --------------------------------------------------------------------------
  // Equip / Unequip
  // --------------------------------------------------------------------------

  /** Equip a pet. */
  equipPet(instanceId: string): PetResult {
    const pet = this.getPet(instanceId);
    if (!pet) return { ok: false, status: "pet_not_found" };
    if (pet.equipped) return { ok: false, status: "already_equipped" };

    if (this.equippedCount() >= this.config.maxEquipped) {
      return {
        ok: false,
        status: "max_equipped",
        message: `Max ${this.config.maxEquipped} equipped`,
      };
    }

    pet.equipped = true;
    this.dirty = true;

    const event: PetEquippedEvent = {
      playerId: this.playerId,
      instanceId,
      speciesId: pet.speciesId,
      equipped: true,
    };
    for (const cb of this.equippedCallbacks) cb(event);

    this.logger?.info(`Equipped pet: ${instanceId}`);
    return { ok: true, status: "success", pet };
  }

  /** Unequip a pet. */
  unequipPet(instanceId: string): PetResult {
    const pet = this.getPet(instanceId);
    if (!pet) return { ok: false, status: "pet_not_found" };
    if (!pet.equipped) return { ok: false, status: "not_equipped" };

    pet.equipped = false;
    this.dirty = true;

    const event: PetEquippedEvent = {
      playerId: this.playerId,
      instanceId,
      speciesId: pet.speciesId,
      equipped: false,
    };
    for (const cb of this.equippedCallbacks) cb(event);

    this.logger?.info(`Unequipped pet: ${instanceId}`);
    return { ok: true, status: "success", pet };
  }

  // --------------------------------------------------------------------------
  // Leveling
  // --------------------------------------------------------------------------

  /** Add XP to a pet. Auto-levels if threshold reached. */
  addXp(instanceId: string, amount: number): PetResult {
    const pet = this.getPet(instanceId);
    if (!pet) return { ok: false, status: "pet_not_found" };

    const species = this.registry.get(pet.speciesId);
    if (!species) return { ok: false, status: "species_not_found" };

    if (pet.level >= species.maxLevel) {
      return { ok: false, status: "max_level", message: "Pet is already max level" };
    }

    pet.xp += amount;
    this.dirty = true;

    // Auto level-up
    let leveled = false;
    while (pet.level < species.maxLevel) {
      const required = this.xpForLevel(species.baseXp, species.growthRate, pet.level);
      if (pet.xp < required) break;

      pet.xp -= required;
      const prevLevel = pet.level;
      pet.level += 1;
      leveled = true;
      petsLevelUp.inc();

      const event: PetLevelUpEvent = {
        playerId: this.playerId,
        instanceId,
        speciesId: pet.speciesId,
        previousLevel: prevLevel,
        newLevel: pet.level,
      };
      for (const cb of this.levelUpCallbacks) cb(event);
    }

    // Cap XP at max level
    if (pet.level >= species.maxLevel) {
      pet.xp = 0;
    }

    if (leveled) {
      this.logger?.info(`Pet ${instanceId} leveled to ${pet.level}`);
    }

    return { ok: true, status: "success", pet };
  }

  /** Calculate XP required for a specific level. */
  xpForLevel(baseXp: number, growthRate: number, level: number): number {
    return math.floor(baseXp * math.pow(growthRate, level - 1));
  }

  // --------------------------------------------------------------------------
  // Evolution
  // --------------------------------------------------------------------------

  /** Evolve a pet if it meets the requirements. */
  evolvePet(instanceId: string): PetResult {
    const pet = this.getPet(instanceId);
    if (!pet) return { ok: false, status: "pet_not_found" };

    const species = this.registry.get(pet.speciesId);
    if (!species) return { ok: false, status: "species_not_found" };

    if (!species.evolvesInto || !species.evolveLevel) {
      return { ok: false, status: "cannot_evolve", message: "This pet cannot evolve" };
    }

    if (pet.level < species.evolveLevel) {
      return {
        ok: false,
        status: "cannot_evolve",
        message: `Requires level ${species.evolveLevel}, currently ${pet.level}`,
      };
    }

    const evolvedSpecies = this.registry.get(species.evolvesInto);
    if (!evolvedSpecies) {
      return {
        ok: false,
        status: "species_not_found",
        message: `Evolution target not found: ${species.evolvesInto}`,
      };
    }

    const fromSpecies = pet.speciesId;
    pet.speciesId = species.evolvesInto;
    pet.level = 1;
    pet.xp = 0;
    this.dirty = true;
    petsEvolved.inc();

    const event: PetEvolvedEvent = {
      playerId: this.playerId,
      instanceId,
      fromSpecies,
      toSpecies: species.evolvesInto,
    };
    for (const cb of this.evolvedCallbacks) cb(event);

    this.logger?.info(`Pet ${instanceId} evolved: ${fromSpecies} → ${species.evolvesInto}`);
    return { ok: true, status: "success", pet };
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  /** Calculate the effective stats for a pet at its current level. */
  getEffectiveStats(instanceId: string): PetStats | undefined {
    const pet = this.getPet(instanceId);
    if (!pet) return undefined;

    const species = this.registry.get(pet.speciesId);
    if (!species) return undefined;

    const levelMultiplier = 1 + (pet.level - 1) * 0.1;
    const stats: PetStats = {
      power: math.floor(species.baseStats.power * levelMultiplier),
      speed: math.floor(species.baseStats.speed * levelMultiplier),
      stamina: math.floor(species.baseStats.stamina * levelMultiplier),
      luck: math.floor(species.baseStats.luck * levelMultiplier),
    };

    // Apply abilities
    for (const [unlockLevel, ability] of species.abilities) {
      if (pet.level >= unlockLevel) {
        if (ability.stat === "power") stats.power = math.floor(stats.power * ability.multiplier);
        else if (ability.stat === "speed")
          stats.speed = math.floor(stats.speed * ability.multiplier);
        else if (ability.stat === "stamina")
          stats.stamina = math.floor(stats.stamina * ability.multiplier);
        else if (ability.stat === "luck") stats.luck = math.floor(stats.luck * ability.multiplier);
      }
    }

    return stats;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Get a pet by instance ID. */
  getPet(instanceId: string): PetInstance | undefined {
    for (const pet of this.data.pets) {
      if (pet.instanceId === instanceId) return pet;
    }
    return undefined;
  }

  /** Get all pets. */
  getAllPets(): PetInstance[] {
    const result: PetInstance[] = [];
    for (const p of this.data.pets) result.push(p);
    return result;
  }

  /** Get equipped pets. */
  getEquippedPets(): PetInstance[] {
    const result: PetInstance[] = [];
    for (const p of this.data.pets) {
      if (p.equipped) result.push(p);
    }
    return result;
  }

  /** Get pets by species. */
  getPetsBySpecies(speciesId: string): PetInstance[] {
    const result: PetInstance[] = [];
    for (const p of this.data.pets) {
      if (p.speciesId === speciesId) result.push(p);
    }
    return result;
  }

  /** Count total pets. */
  petCount(): number {
    let n = 0;
    for (const _ of this.data.pets) n++;
    return n;
  }

  /** Count equipped pets. */
  equippedCount(): number {
    let n = 0;
    for (const p of this.data.pets) {
      if (p.equipped) n++;
    }
    return n;
  }

  /** Lock/unlock a pet. */
  setLocked(instanceId: string, locked: boolean): PetResult {
    const pet = this.getPet(instanceId);
    if (!pet) return { ok: false, status: "pet_not_found" };
    pet.locked = locked;
    this.dirty = true;
    return { ok: true, status: "success", pet };
  }

  /** Set a pet's nickname. */
  setNickname(instanceId: string, nickname: string): PetResult {
    const pet = this.getPet(instanceId);
    if (!pet) return { ok: false, status: "pet_not_found" };
    pet.nickname = nickname;
    this.dirty = true;
    return { ok: true, status: "success", pet };
  }

  isDirty(): boolean {
    return this.dirty;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  getData(): PetPlayerData {
    return this.data;
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  onLevelUp(callback: PetLevelUpCallback): void {
    this.levelUpCallbacks.push(callback);
  }

  onEvolved(callback: PetEvolvedCallback): void {
    this.evolvedCallbacks.push(callback);
  }

  onEquipped(callback: PetEquippedCallback): void {
    this.equippedCallbacks.push(callback);
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private findPetIndex(instanceId: string): number {
    for (let i = 0; i < this.data.pets.size(); i++) {
      if (this.data.pets[i].instanceId === instanceId) return i;
    }
    return -1;
  }
}
