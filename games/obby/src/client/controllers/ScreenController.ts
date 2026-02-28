/**
 * Screen Controller — Obby Game (Client)
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

// UI Screen factories
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

// Types from packages (used by screen options)
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

// Static definitions (loaded once, don't change per-player)
// These would ideally come from a definitions sync, but for now we hardcode
// them to match the server-side registrations.
const QUEST_DEFINITIONS: Map<string, QuestDefinition> = new Map();
const ITEM_DEFINITIONS: Map<string, ItemDefinition> = new Map();
const PET_SPECIES: Map<string, PetSpecies> = new Map();
const COSMETIC_DEFINITIONS: Map<string, CosmeticDefinition> = new Map();
const EGG_DEFINITIONS: EggDefinition[] = [];
const SEASON_DEFINITIONS: Map<string, SeasonDefinition> = new Map();

/** Populate static definition caches — mirrors server service configs */
function initDefinitions(): void {
  // Quest definitions
  for (const q of [
    {
      id: "daily_stages_5",
      name: "Stage Sprinter",
      description: "Complete 5 stages today.",
      schedule: "daily" as const,
      tier: "common" as const,
      objectives: [
        { id: "obj_stages", description: "Complete stages", type: "stage_complete", target: 5 },
      ],
      rewards: [
        { type: "xp", amount: 300 },
        { type: "currency", amount: 75 },
      ],
    },
    {
      id: "daily_collect_tokens",
      name: "Token Collector",
      description: "Collect 10 tokens.",
      schedule: "daily" as const,
      tier: "common" as const,
      objectives: [
        { id: "obj_tokens", description: "Collect tokens", type: "collect", target: 10 },
      ],
      rewards: [
        { type: "xp", amount: 200 },
        { type: "currency", amount: 50 },
      ],
    },
    {
      id: "weekly_stages_25",
      name: "Obby Marathon",
      description: "Complete 25 stages this week.",
      schedule: "weekly" as const,
      tier: "rare" as const,
      objectives: [
        { id: "obj_stages", description: "Complete stages", type: "stage_complete", target: 25 },
      ],
      rewards: [
        { type: "xp", amount: 2000 },
        { type: "currency", amount: 400 },
        { type: "item", amount: 1, itemId: "skip_stage" },
      ],
    },
    {
      id: "weekly_no_deaths",
      name: "Deathless Run",
      description: "Complete 10 stages without dying.",
      schedule: "weekly" as const,
      tier: "epic" as const,
      objectives: [
        {
          id: "obj_deathless",
          description: "Stages without dying",
          type: "deathless_stages",
          target: 10,
        },
      ],
      rewards: [
        { type: "xp", amount: 3000 },
        { type: "currency", amount: 750 },
        { type: "item", amount: 1, itemId: "trail_fire" },
      ],
    },
  ]) {
    QUEST_DEFINITIONS.set(q.id, q as unknown as QuestDefinition);
  }

  // Item definitions
  for (const item of [
    {
      id: "skip_stage",
      name: "Stage Skip",
      category: "consumable",
      rarity: "rare",
      maxStack: 10,
      tradeable: false,
      droppable: false,
    },
    {
      id: "speed_coil",
      name: "Speed Coil",
      category: "tool",
      rarity: "uncommon",
      maxStack: 1,
      tradeable: false,
      droppable: false,
    },
    {
      id: "gravity_coil",
      name: "Gravity Coil",
      category: "tool",
      rarity: "rare",
      maxStack: 1,
      tradeable: false,
      droppable: false,
    },
    {
      id: "checkpoint_token",
      name: "Checkpoint Token",
      category: "consumable",
      rarity: "common",
      maxStack: 99,
      tradeable: false,
      droppable: false,
    },
    {
      id: "trail_fire",
      name: "Fire Trail",
      category: "misc",
      rarity: "epic",
      maxStack: 1,
      tradeable: true,
      droppable: false,
    },
  ]) {
    ITEM_DEFINITIONS.set(item.id, item as unknown as ItemDefinition);
  }

  // Pet species
  for (const species of [
    {
      id: "cloud_bunny",
      name: "Cloud Bunny",
      rarity: "common",
      element: "air",
      baseStats: { power: 5, speed: 15, stamina: 10, luck: 8 },
      maxLevel: 10,
      baseXp: 80,
      growthRate: 1.15,
      abilities: [],
    },
    {
      id: "spring_frog",
      name: "Spring Frog",
      rarity: "uncommon",
      element: "earth",
      baseStats: { power: 6, speed: 12, stamina: 14, luck: 6 },
      maxLevel: 10,
      baseXp: 100,
      growthRate: 1.2,
      abilities: [],
    },
    {
      id: "star_phoenix",
      name: "Star Phoenix",
      rarity: "legendary",
      element: "fire",
      baseStats: { power: 20, speed: 25, stamina: 30, luck: 15 },
      maxLevel: 20,
      baseXp: 200,
      growthRate: 1.4,
      abilities: [],
    },
  ]) {
    PET_SPECIES.set(species.id, species as unknown as PetSpecies);
  }

  // Cosmetic definitions
  for (const cosmetic of [
    {
      id: "rainbow_trail",
      name: "Rainbow Trail",
      description: "A colorful trail behind you",
      category: "trail",
      rarity: "rare",
      tradeable: true,
      limited: false,
    },
    {
      id: "crown_hat",
      name: "Crown",
      description: "For obby champions",
      category: "hat",
      rarity: "legendary",
      tradeable: false,
      limited: true,
    },
    {
      id: "sparkle_effect",
      name: "Sparkle",
      description: "Shimmering particles",
      category: "effect",
      rarity: "uncommon",
      tradeable: true,
      limited: false,
    },
  ]) {
    COSMETIC_DEFINITIONS.set(cosmetic.id, cosmetic as unknown as CosmeticDefinition);
  }

  // Egg definitions
  EGG_DEFINITIONS.push({
    id: "sky_egg",
    name: "Sky Egg",
    description: "Contains cloud and air pets",
    cost: 50,
    currency: "coins",
    lootTable: [
      { itemId: "cloud_bunny", rarity: "common", weight: 70 },
      { itemId: "spring_frog", rarity: "uncommon", weight: 25 },
      { itemId: "star_phoenix", rarity: "legendary", weight: 5 },
    ],
    pityThreshold: 30,
    pityRarity: "uncommon",
    enabled: true,
    maxHatches: 0,
  } as unknown as EggDefinition);

  // Season definitions
  SEASON_DEFINITIONS.set("obby_s1", {
    id: "obby_s1",
    name: "Obby Season 1: Sky High",
    description: "Reach new heights",
    active: true,
    startTime: 0,
    endTime: 9999999999,
    tiers: [
      {
        tier: 1,
        xpRequired: 50,
        rewards: [
          {
            id: "os1_t1_free",
            name: "10 Stars",
            track: "free",
            reward: { type: "currency", amount: 10 },
          },
        ],
      },
      {
        tier: 2,
        xpRequired: 100,
        rewards: [
          {
            id: "os1_t2_free",
            name: "Stage Skip",
            track: "free",
            reward: { type: "item", amount: 1, itemId: "skip_stage" },
          },
          {
            id: "os1_t2_premium",
            name: "Rainbow Trail",
            track: "premium",
            reward: { type: "cosmetic", amount: 1, itemId: "rainbow_trail" },
          },
        ],
      },
      {
        tier: 3,
        xpRequired: 200,
        rewards: [
          {
            id: "os1_t3_free",
            name: "Sky Egg",
            track: "free",
            reward: { type: "custom", amount: 1, itemId: "sky_egg", label: "egg" },
          },
          {
            id: "os1_t3_premium",
            name: "Crown",
            track: "premium",
            reward: { type: "cosmetic", amount: 1, itemId: "crown_hat" },
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

// Track which modal is currently open (at most one)
let activeModal: keyof Omit<ScreenHandles, "questTracker" | "dailyRewards"> | undefined;

// Audio volumes (client-side state)
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

    // ── Create Quest Tracker (HUD overlay) ──────────────────────────
    screens.questTracker = createQuestTracker(playerGui, {
      getActiveQuests: () => cachedData?.activeQuests ?? [],
      getQuestDef: (questId) => QUEST_DEFINITIONS.get(questId),
      maxHudQuests: 3,
    });
    screens.questTracker.setVisible(true);

    // ── Helper: (re)create daily rewards popup with current data ────
    const createDailyPopup = () => {
      // Clean up any existing popup before recreating
      if (screens.dailyRewards) {
        screens.dailyRewards.cleanup();
        screens.dailyRewards = undefined;
      }
      screens.dailyRewards = createDailyRewardsPopup(playerGui, {
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

    // ── Load data from server ───────────────────────────────────────
    task.spawn(() => {
      // Wait a beat for data to be ready on the server
      task.wait(1);
      refreshData();

      // Now that cachedData is populated, create the daily popup
      createDailyPopup();
      if (cachedData?.dailyCanClaim && screens.dailyRewards) {
        screens.dailyRewards.show();
      }
    });

    // ── Create Inventory Screen ─────────────────────────────────────
    screens.inventory = createInventoryScreen(playerGui, {
      getItems: () => cachedData?.items ?? [],
      getItemDef: (itemId) => ITEM_DEFINITIONS.get(itemId),
      maxSlots: cachedData?.maxSlots ?? 50,
      onClose: () => hideActiveModal(),
    });

    // ── Create Pet Collection Screen ────────────────────────────────
    screens.petCollection = createPetCollection(playerGui, {
      getPets: () => cachedData?.pets ?? [],
      getSpecies: (speciesId) => PET_SPECIES.get(speciesId),
      maxEquipped: 1,
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

    // ── Create Cosmetics Screen ─────────────────────────────────────
    screens.cosmetics = createCosmeticsScreen(playerGui, {
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
          // Record<string,string> and Map<string,string> are both Lua tables
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

    // ── Create Gacha Screen ─────────────────────────────────────────
    screens.gacha = createGachaScreen(playerGui, {
      getEggs: () => EGG_DEFINITIONS,
      getBalance: (_currency: string) => cachedData?.coins ?? 0,
      getPity: () => 0, // Pity counter not synced client-side for simplicity
      onPull: (eggId, count) => {
        const results = RemoteController.hatchEgg(eggId, count);
        task.spawn(() => refreshData());
        return results;
      },
      onClose: () => hideActiveModal(),
    });

    // ── Create Battle Pass Screen ───────────────────────────────────
    screens.battlePass = createBattlePassScreen(playerGui, {
      getSeason: () => SEASON_DEFINITIONS.get("obby_s1"),
      getPlayerData: () => cachedData?.battlePass,
      onClaim: (rewardId) => {
        RemoteController.claimBattlePassReward(rewardId);
        task.spawn(() => refreshData());
      },
      onClose: () => hideActiveModal(),
    });

    // ── Create Settings Screen ──────────────────────────────────────
    screens.settings = createSettingsScreen(playerGui, {
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

    // ── Coalesced refresh to respect GetFullPlayerData rate limits ──
    // At most one in-flight refresh, plus a single trailing refresh
    // if multiple events fire while a refresh is running.
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

    // ── Subscribe to server events for refresh ──────────────────────

    RemoteController.onQuestCompleted(() => requestRefresh());
    RemoteController.onAchievementCompleted(() => requestRefresh());
    RemoteController.onLevelUp(() => requestRefresh());
    RemoteController.onPrestige(() => requestRefresh());
    RemoteController.onDailyRewardClaimed(() => {
      requestRefresh();
      // Recreate the daily popup with updated state
      task.spawn(() => createDailyPopup());
    });
    RemoteController.onStage(() => requestRefresh());

    logger.info("ScreenController started — all screens created.");
  },

  // ── Public toggle methods ──────────────────────────────────────────

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
