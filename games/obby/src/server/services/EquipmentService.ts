/**
 * Equipment Service — Obby Game
 *
 * Gear equipment management with stat modifiers.
 * Uses @broblox/equipment factory for the core equip/unequip/stat logic.
 *
 * Gear items provide bonuses to speed, jump, and stamina attributes.
 * All stat bonuses are read by AttributeService.getEffective() to
 * compute the player's final stats (base attributes + gear bonuses).
 */

import { createEquipmentService } from "@broblox/equipment";
import type { GearDefinition } from "@broblox/equipment";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { DataService } from "./DataService";

// ============================================================================
// Gear Catalog
// ============================================================================

/**
 * Full gear catalog for the obby game.
 * Stats: speed, jump, stamina (matching PlayerAttributes keys).
 *
 * Slots: feet, back, body, accessory1, accessory2
 * (consumable slots are for consumable items via InventoryService, not gear)
 */
const OBBY_GEAR: GearDefinition[] = [
  // ── Feet Slot ────────────────────────────────────────────────────────
  {
    id: "running_shoes",
    name: "Running Shoes",
    description: "Lightweight shoes that boost movement speed.",
    rarity: "uncommon",
    slot: "feet",
    modifiers: [{ stat: "speed", flat: 2 }],
    price: 50,
    tags: ["speed"],
  },
  {
    id: "bouncy_boots",
    name: "Bouncy Boots",
    description: "Spring-loaded boots for higher jumps.",
    rarity: "rare",
    slot: "feet",
    modifiers: [{ stat: "jump", flat: 5 }],
    price: 100,
    tags: ["jump"],
  },
  {
    id: "rocket_boots",
    name: "Rocket Boots",
    description: "Powerful boots with rocket-powered propulsion.",
    rarity: "epic",
    slot: "feet",
    modifiers: [{ stat: "jump", flat: 8 }],
    price: 300,
    levelRequirement: 5,
    tags: ["jump"],
  },
  {
    id: "sprint_trainers",
    name: "Sprint Trainers",
    description: "Professional training shoes. Faster and more efficient.",
    rarity: "epic",
    slot: "feet",
    modifiers: [
      { stat: "speed", flat: 4 },
      { stat: "stamina", flat: 2 },
    ],
    price: 250,
    levelRequirement: 5,
    tags: ["speed", "stamina"],
  },

  // ── Back Slot ────────────────────────────────────────────────────────
  {
    id: "feather_cape",
    name: "Feather Cape",
    description: "A light cape that helps you float further.",
    rarity: "rare",
    slot: "back",
    modifiers: [
      { stat: "jump", flat: 3 },
      { stat: "speed", flat: 1 },
    ],
    price: 120,
    tags: ["jump", "speed"],
  },
  {
    id: "wind_glider",
    name: "Wind Glider",
    description: "Harness the wind for longer jumps and less fatigue.",
    rarity: "epic",
    slot: "back",
    modifiers: [
      { stat: "jump", flat: 4 },
      { stat: "stamina", flat: 3 },
    ],
    price: 280,
    levelRequirement: 8,
    tags: ["jump", "stamina"],
  },

  // ── Body Slot ────────────────────────────────────────────────────────
  {
    id: "agility_vest",
    name: "Agility Vest",
    description: "A lightweight vest that improves reflexes.",
    rarity: "uncommon",
    slot: "body",
    modifiers: [
      { stat: "speed", flat: 1 },
      { stat: "stamina", flat: 1 },
    ],
    price: 60,
    tags: ["speed", "stamina"],
  },
  {
    id: "champion_armor",
    name: "Champion Armor",
    description: "Legendary armor worn by obby champions. Boosts all stats.",
    rarity: "legendary",
    slot: "body",
    modifiers: [
      { stat: "speed", flat: 3 },
      { stat: "jump", flat: 3 },
      { stat: "stamina", flat: 3 },
    ],
    price: 500,
    levelRequirement: 10,
    tags: ["speed", "jump", "stamina"],
  },

  // ── Accessory 1 Slot ────────────────────────────────────────────────
  {
    id: "endurance_band",
    name: "Endurance Band",
    description: "A wristband that greatly improves stamina recovery.",
    rarity: "uncommon",
    slot: "accessory1",
    modifiers: [{ stat: "stamina", flat: 5 }],
    price: 80,
    tags: ["stamina"],
  },
  {
    id: "speed_ring",
    name: "Speed Ring",
    description: "A ring infused with swiftness magic.",
    rarity: "rare",
    slot: "accessory1",
    modifiers: [{ stat: "speed", flat: 3 }],
    price: 150,
    tags: ["speed"],
  },

  // ── Accessory 2 Slot ────────────────────────────────────────────────
  {
    id: "jump_charm",
    name: "Jump Charm",
    description: "A magical charm that gives extra air.",
    rarity: "rare",
    slot: "accessory2",
    modifiers: [{ stat: "jump", flat: 4 }],
    price: 160,
    tags: ["jump"],
  },
  {
    id: "stamina_amulet",
    name: "Stamina Amulet",
    description: "Ancient amulet that reduces fatigue.",
    rarity: "epic",
    slot: "accessory2",
    modifiers: [{ stat: "stamina", flat: 4 }],
    price: 200,
    levelRequirement: 3,
    tags: ["stamina"],
  },
];

// ============================================================================
// Service Factory
// ============================================================================

const handle = createEquipmentService({
  gear: OBBY_GEAR,
  onPlayerAdded: (cb) =>
    PlayerLifecycleService.onPlayerAdded((player) => {
      // Factory creates a blank store; then hydrate from DataService.
      cb(player);
      const store = handle.getEquipmentStore(player.UserId);
      const data = DataService.getData(player);
      if (store && data) {
        store.loadFrom({
          ownedGear: data.ownedGear ?? [],
          equipped: (data.equipped as Record<string, string>) ?? {},
        });
      }
    }),
  onPlayerRemoving: (cb) =>
    PlayerLifecycleService.onPlayerRemoving((player) => {
      // Persist equipment state before the factory cleans up the store.
      const store = handle.getEquipmentStore(player.UserId);
      if (store && store.isDirty()) {
        DataService.saveEquipmentState(player, store.getAllEquipped());
      }
      cb(player);
    }),
});

export const EquipmentService = handle.Service;
export const getGearRegistry = () => handle.getGearRegistry();
export const getEquipmentStore = (playerId: number) => handle.getEquipmentStore(playerId);
export const initPlayerEquipment = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerEquipment = (playerId: number) => handle.cleanupPlayer(playerId);
