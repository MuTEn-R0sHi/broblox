/**
 * Screen Controller — Starter Game (Client)
 *
 * Manages all @broblox/ui screen instances:
 * - Quest Tracker (HUD overlay — always visible)
 * - Daily Rewards (popup — shown on join if claimable)
 * - Inventory, Pet Collection, Cosmetics, Gacha, Battle Pass, Settings (modals)
 *
 * Connects screen callbacks to RemoteController for server communication
 * and maintains a client-side data cache refreshed on join & after actions.
 */

import { Players } from "@rbxts/services";
import { Controller, createLogger } from "@broblox/core";

import {
  createQuestTracker,
  createDailyRewardsPopup,
  createInventoryScreen,
  createPetCollection,
  createCosmeticsScreen,
  createGachaScreen,
  createBattlePassScreen,
  createSettingsScreen,
} from "@broblox/ui";

import type { QuestDefinition } from "@broblox/quests";
import type { ItemDefinition } from "@broblox/inventory";
import type { PetSpecies } from "@broblox/pets";
import type { CosmeticDefinition } from "@broblox/cosmetics";
import type { EggDefinition } from "@broblox/gacha";
import type { SeasonDefinition } from "@broblox/battle-pass";
import type { AudioChannel } from "@broblox/audio";
import type { FullPlayerDataPayload } from "shared/types";

import { RemoteController } from "./RemoteController";

const logger = createLogger("ScreenController");
const player = Players.LocalPlayer;

// ============================================================================
// Client Data Cache
// ============================================================================

let cachedData: FullPlayerDataPayload | undefined;

const QUEST_DEFINITIONS: Map<string, QuestDefinition> = new Map();
const ITEM_DEFINITIONS: Map<string, ItemDefinition> = new Map();
const PET_SPECIES: Map<string, PetSpecies> = new Map();
const COSMETIC_DEFINITIONS: Map<string, CosmeticDefinition> = new Map();
const EGG_DEFINITIONS: EggDefinition[] = [];
const SEASON_DEFINITIONS: Map<string, SeasonDefinition> = new Map();

/** Populate static definition caches — mirrors server service configs */
function initDefinitions(): void {
  // Quest definitions (mirrors QuestService config)
  for (const q of [
    {
      id: "daily_kill_10",
      name: "Eliminate 10 Enemies",
      description: "Defeat 10 enemies in any area.",
      schedule: "daily" as const,
      tier: "common" as const,
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 10 }],
      rewards: [
        { type: "xp", amount: 500 },
        { type: "currency", amount: 100 },
      ],
    },
    {
      id: "daily_collect_5",
      name: "Treasure Hunter",
      description: "Collect 5 items from the world.",
      schedule: "daily" as const,
      tier: "common" as const,
      objectives: [{ id: "obj_collect", description: "Collect items", type: "collect", target: 5 }],
      rewards: [
        { type: "xp", amount: 300 },
        { type: "currency", amount: 50 },
      ],
    },
    {
      id: "weekly_kills_50",
      name: "Weekly Warrior",
      description: "Defeat 50 enemies this week.",
      schedule: "weekly" as const,
      tier: "rare" as const,
      objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 50 }],
      rewards: [
        { type: "xp", amount: 2500 },
        { type: "currency", amount: 500 },
        { type: "item", amount: 1, itemId: "health_potion" },
      ],
    },
    {
      id: "weekly_explore",
      name: "Explorer",
      description: "Visit 3 different areas and collect 10 items.",
      schedule: "weekly" as const,
      tier: "uncommon" as const,
      objectives: [
        { id: "obj_visit", description: "Visit areas", type: "visit", target: 3 },
        { id: "obj_collect", description: "Collect items", type: "collect", target: 10 },
      ],
      rewards: [
        { type: "xp", amount: 1500 },
        { type: "currency", amount: 300 },
      ],
    },
  ]) {
    QUEST_DEFINITIONS.set(q.id, q as unknown as QuestDefinition);
  }

  // Item definitions (mirrors InventoryService config)
  for (const item of [
    {
      id: "coins_pouch",
      name: "Coin Pouch",
      category: "currency",
      rarity: "common",
      maxStack: 9999,
      tradeable: false,
      droppable: false,
    },
    {
      id: "health_potion",
      name: "Health Potion",
      category: "consumable",
      rarity: "common",
      maxStack: 50,
      tradeable: true,
      droppable: true,
    },
    {
      id: "iron_sword",
      name: "Iron Sword",
      category: "weapon",
      rarity: "uncommon",
      maxStack: 1,
      tradeable: true,
      droppable: true,
    },
    {
      id: "speed_boost",
      name: "Speed Boost",
      category: "consumable",
      rarity: "rare",
      maxStack: 10,
      tradeable: false,
      droppable: false,
    },
  ]) {
    ITEM_DEFINITIONS.set(item.id, item as unknown as ItemDefinition);
  }

  // Pet species (mirrors PetService config)
  for (const species of [
    {
      id: "fire_slime",
      name: "Fire Slime",
      rarity: "common",
      element: "fire",
      baseStats: { power: 10, speed: 8, stamina: 12, luck: 5 },
      maxLevel: 10,
      baseXp: 100,
      growthRate: 1.2,
      abilities: [],
    },
    {
      id: "fire_dragon",
      name: "Fire Dragon",
      rarity: "legendary",
      element: "fire",
      baseStats: { power: 50, speed: 40, stamina: 60, luck: 20 },
      maxLevel: 20,
      baseXp: 200,
      growthRate: 1.5,
      abilities: [],
    },
    {
      id: "water_sprite",
      name: "Water Sprite",
      rarity: "uncommon",
      element: "water",
      baseStats: { power: 8, speed: 12, stamina: 10, luck: 8 },
      maxLevel: 10,
      baseXp: 100,
      growthRate: 1.2,
      abilities: [],
    },
    {
      id: "shadow_cat",
      name: "Shadow Cat",
      rarity: "rare",
      element: "dark",
      baseStats: { power: 15, speed: 20, stamina: 8, luck: 12 },
      maxLevel: 15,
      baseXp: 150,
      growthRate: 1.3,
      abilities: [],
    },
  ]) {
    PET_SPECIES.set(species.id, species as unknown as PetSpecies);
  }

  // Cosmetic definitions (mirrors CosmeticsService config)
  for (const cosmetic of [
    {
      id: "default_skin",
      name: "Default Skin",
      description: "Standard character appearance",
      category: "skin",
      rarity: "common",
      tradeable: false,
      limited: false,
    },
    {
      id: "flame_trail",
      name: "Flame Trail",
      description: "Leave a trail of fire",
      category: "trail",
      rarity: "epic",
      tradeable: true,
      limited: false,
    },
    {
      id: "gold_hat",
      name: "Gold Hat",
      description: "A shiny golden top hat",
      category: "hat",
      rarity: "legendary",
      tradeable: false,
      limited: true,
    },
    {
      id: "wave_emote",
      name: "Wave",
      description: "Wave at other players",
      category: "emote",
      rarity: "common",
      tradeable: false,
      limited: false,
    },
  ]) {
    COSMETIC_DEFINITIONS.set(cosmetic.id, cosmetic as unknown as CosmeticDefinition);
  }

  // Egg definitions (mirrors GachaService config)
  EGG_DEFINITIONS.push(
    {
      id: "basic_egg",
      name: "Basic Egg",
      description: "Contains common pets",
      cost: 100,
      currency: "coins",
      lootTable: [
        { itemId: "fire_slime", rarity: "common", weight: 60 },
        { itemId: "water_sprite", rarity: "uncommon", weight: 30 },
        { itemId: "shadow_cat", rarity: "rare", weight: 9 },
        { itemId: "fire_dragon", rarity: "legendary", weight: 1 },
      ],
      pityThreshold: 50,
      pityRarity: "rare",
      enabled: true,
      maxHatches: 0,
    } as unknown as EggDefinition,
    {
      id: "premium_egg",
      name: "Premium Egg",
      description: "Better odds for rare pets",
      cost: 500,
      currency: "gems",
      lootTable: [
        { itemId: "water_sprite", rarity: "uncommon", weight: 40 },
        { itemId: "shadow_cat", rarity: "rare", weight: 40 },
        { itemId: "fire_dragon", rarity: "legendary", weight: 20 },
      ],
      pityThreshold: 20,
      pityRarity: "legendary",
      enabled: true,
      maxHatches: 0,
    } as unknown as EggDefinition
  );

  // Season definitions (mirrors BattlePassService config)
  SEASON_DEFINITIONS.set("season_1", {
    id: "season_1",
    name: "Season 1: Uprising",
    description: "The first season of competitive play",
    active: true,
    startTime: 0,
    endTime: 9999999999,
    tiers: [
      {
        tier: 1,
        xpRequired: 100,
        rewards: [
          {
            id: "s1_t1_free",
            name: "100 Coins",
            track: "free",
            reward: { type: "currency", amount: 100 },
          },
          {
            id: "s1_t1_premium",
            name: "Gold Hat",
            track: "premium",
            reward: { type: "cosmetic", amount: 1, itemId: "gold_hat" },
          },
        ],
      },
      {
        tier: 2,
        xpRequired: 200,
        rewards: [
          {
            id: "s1_t2_free",
            name: "Speed Boost",
            track: "free",
            reward: { type: "item", amount: 1, itemId: "speed_boost" },
          },
        ],
      },
      {
        tier: 3,
        xpRequired: 300,
        rewards: [
          {
            id: "s1_t3_free",
            name: "500 Coins",
            track: "free",
            reward: { type: "currency", amount: 500 },
          },
          {
            id: "s1_t3_premium",
            name: "Flame Trail",
            track: "premium",
            reward: { type: "cosmetic", amount: 1, itemId: "flame_trail" },
          },
        ],
      },
      {
        tier: 4,
        xpRequired: 500,
        rewards: [
          {
            id: "s1_t4_free",
            name: "Common Pet Egg",
            track: "free",
            reward: { type: "custom", amount: 1, itemId: "basic_egg", label: "egg" },
          },
          {
            id: "s1_t4_premium",
            name: "Premium Pet Egg",
            track: "premium",
            reward: { type: "custom", amount: 1, itemId: "premium_egg", label: "egg" },
          },
        ],
      },
      {
        tier: 5,
        xpRequired: 750,
        rewards: [
          {
            id: "s1_t5_free",
            name: "Champion Title",
            track: "free",
            reward: { type: "custom", amount: 1, itemId: "Champion", label: "title" },
          },
        ],
      },
    ],
  } as unknown as SeasonDefinition);
}

// ============================================================================
// Screen Handles
// ============================================================================

interface ScreenHandles {
  questTracker?: ReturnType<typeof createQuestTracker>;
  dailyRewards?: ReturnType<typeof createDailyRewardsPopup>;
  inventory?: ReturnType<typeof createInventoryScreen>;
  petCollection?: ReturnType<typeof createPetCollection>;
  cosmetics?: ReturnType<typeof createCosmeticsScreen>;
  gacha?: ReturnType<typeof createGachaScreen>;
  battlePass?: ReturnType<typeof createBattlePassScreen>;
  settings?: ReturnType<typeof createSettingsScreen>;
}

const screens: ScreenHandles = {};

let activeModal: keyof Omit<ScreenHandles, "questTracker" | "dailyRewards"> | undefined;

const audioVolumes: Record<AudioChannel, number> = {
  sfx: 1,
  music: 0.5,
  ambient: 0.7,
  ui: 1,
  voice: 1,
};
let masterVolume = 0.8;

// ============================================================================
// Helpers
// ============================================================================

function refreshData(): void {
  logger.debug("Refreshing player data...");
  const data = RemoteController.getFullPlayerData();
  if (data) {
    cachedData = data;
    refreshAllScreens();
  }
}

function refreshAllScreens(): void {
  screens.questTracker?.refresh();
  screens.inventory?.refresh();
  screens.petCollection?.refresh();
  screens.cosmetics?.refresh();
  screens.gacha?.refresh();
  screens.battlePass?.refresh();
}

function hideActiveModal(): void {
  if (!activeModal) return;
  const screen = screens[activeModal];
  if (screen && "hide" in screen) {
    (screen as { hide: () => void }).hide();
  }
  activeModal = undefined;
}

function showModal(name: keyof Omit<ScreenHandles, "questTracker" | "dailyRewards">): void {
  if (activeModal === name) {
    hideActiveModal();
    return;
  }
  hideActiveModal();
  const screen = screens[name];
  if (screen && "show" in screen) {
    (screen as { show: () => void }).show();
    activeModal = name;
  }
}

// ============================================================================
// Controller
// ============================================================================

export const ScreenController: Controller & {
  toggleQuestLog(): void;
  toggleInventory(): void;
  togglePets(): void;
  toggleCosmetics(): void;
  toggleGacha(): void;
  toggleBattlePass(): void;
  toggleSettings(): void;
  closeActiveModal(): void;
} = {
  onStart() {
    logger.info("ScreenController starting...");
    initDefinitions();
    const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

    const screenGui = new Instance("ScreenGui");
    screenGui.Name = "Screens";
    screenGui.ResetOnSpawn = false;
    screenGui.DisplayOrder = 10;
    screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling;
    screenGui.Parent = playerGui;

    // Quest Tracker (HUD overlay)
    screens.questTracker = createQuestTracker(screenGui, {
      getActiveQuests: () => cachedData?.activeQuests ?? [],
      getQuestDef: (questId) => QUEST_DEFINITIONS.get(questId),
      maxHudQuests: 3,
    });
    screens.questTracker.setVisible(true);

    // Daily rewards popup
    const createDailyPopup = () => {
      if (screens.dailyRewards) {
        screens.dailyRewards.cleanup();
        screens.dailyRewards = undefined;
      }
      screens.dailyRewards = createDailyRewardsPopup(screenGui, {
        rewardCycle: cachedData?.dailyRewardCycle ?? [],
        currentDay: cachedData?.dailyCurrentDay ?? 1,
        streak: cachedData?.dailyStreak ?? 0,
        canClaim: cachedData?.dailyCanClaim ?? false,
        timeUntilNextClaim: cachedData?.dailyTimeUntilNext ?? 0,
        onClaim: () => {
          return RemoteController.claimDailyReward();
        },
        onDismiss: () => {
          screens.dailyRewards?.hide();
        },
      });
    };

    // Load data from server
    task.spawn(() => {
      task.wait(1);
      refreshData();
      createDailyPopup();
      if (cachedData?.dailyCanClaim && screens.dailyRewards) {
        screens.dailyRewards.show();
      }
    });

    // Inventory Screen
    screens.inventory = createInventoryScreen(screenGui, {
      getItems: () => cachedData?.items ?? [],
      getItemDef: (itemId) => ITEM_DEFINITIONS.get(itemId),
      maxSlots: cachedData?.maxSlots ?? 100,
      onClose: () => hideActiveModal(),
    });

    // Pet Collection Screen
    screens.petCollection = createPetCollection(screenGui, {
      getPets: () => cachedData?.pets ?? [],
      getSpecies: (speciesId) => PET_SPECIES.get(speciesId),
      maxEquipped: 3,
      onEquip: (instanceId) => {
        RemoteController.equipPet(instanceId);
        task.spawn(() => refreshData());
      },
      onUnequip: (instanceId) => {
        RemoteController.unequipPet(instanceId);
        task.spawn(() => refreshData());
      },
      onClose: () => hideActiveModal(),
    });

    // Cosmetics Screen
    screens.cosmetics = createCosmeticsScreen(screenGui, {
      getOwned: () => cachedData?.ownedCosmetics ?? [],
      getAllCosmetics: () => {
        const all: CosmeticDefinition[] = [];
        COSMETIC_DEFINITIONS.forEach((def) => {
          all.push(def);
        });
        return all;
      },
      getEquipped: () => {
        if (cachedData?.equippedCosmetics) {
          return cachedData.equippedCosmetics as unknown as Map<string, string>;
        }
        return new Map<string, string>();
      },
      getCosmeticDef: (id) => COSMETIC_DEFINITIONS.get(id),
      onEquip: (cosmeticId, slot) => {
        RemoteController.equipCosmetic(cosmeticId, slot);
        task.spawn(() => refreshData());
      },
      onUnequip: (slot) => {
        RemoteController.unequipCosmetic(slot);
        task.spawn(() => refreshData());
      },
      onClose: () => hideActiveModal(),
    });

    // Gacha Screen
    screens.gacha = createGachaScreen(screenGui, {
      getEggs: () => EGG_DEFINITIONS,
      getBalance: (_currency: string) => cachedData?.coins ?? 0,
      getPity: () => 0,
      onPull: (eggId, count) => {
        const results = RemoteController.hatchEgg(eggId, count);
        task.spawn(() => refreshData());
        return results;
      },
      onClose: () => hideActiveModal(),
    });

    // Battle Pass Screen
    screens.battlePass = createBattlePassScreen(screenGui, {
      getSeason: () => SEASON_DEFINITIONS.get("season_1"),
      getPlayerData: () => cachedData?.battlePass,
      onClaim: (rewardId) => {
        RemoteController.claimBattlePassReward(rewardId);
        task.spawn(() => refreshData());
      },
      onClose: () => hideActiveModal(),
    });

    // Settings Screen
    screens.settings = createSettingsScreen(screenGui, {
      getVolumes: () => audioVolumes,
      getMasterVolume: () => masterVolume,
      onVolumeChange: (channel, value) => {
        audioVolumes[channel] = value;
        logger.debug(`Volume ${channel} → ${value}`);
      },
      onMasterVolumeChange: (value) => {
        masterVolume = value;
        logger.debug(`Master volume → ${value}`);
      },
      onClose: () => hideActiveModal(),
    });

    // Coalesced refresh
    let refreshInFlight = false;
    let refreshPending = false;
    const requestRefresh = () => {
      if (refreshInFlight) {
        refreshPending = true;
        return;
      }
      refreshInFlight = true;
      task.spawn(() => {
        refreshData();
        refreshInFlight = false;
        if (refreshPending) {
          refreshPending = false;
          requestRefresh();
        }
      });
    };

    // Subscribe to server events for refresh
    RemoteController.onQuestCompleted(() => requestRefresh());
    RemoteController.onAchievementCompleted(() => requestRefresh());
    RemoteController.onLevelUp(() => requestRefresh());
    RemoteController.onPrestige(() => requestRefresh());
    RemoteController.onDailyRewardClaimed(() => {
      requestRefresh();
      task.spawn(() => createDailyPopup());
    });
    RemoteController.onDataSync(() => requestRefresh());

    logger.info("ScreenController started — all screens created.");
  },

  toggleQuestLog(): void {
    screens.questTracker?.toggleLog();
  },
  toggleInventory(): void {
    showModal("inventory");
  },
  togglePets(): void {
    showModal("petCollection");
  },
  toggleCosmetics(): void {
    showModal("cosmetics");
  },
  toggleGacha(): void {
    showModal("gacha");
  },
  toggleBattlePass(): void {
    showModal("battlePass");
  },
  toggleSettings(): void {
    showModal("settings");
  },
  closeActiveModal(): void {
    hideActiveModal();
  },
};
