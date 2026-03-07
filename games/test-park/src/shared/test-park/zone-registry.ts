/**
 * Test Park — Zone Registry
 *
 * THE single source of truth for all test park zones.
 *
 * How to add a new zone:
 *   1. Append an entry to ZONE_REGISTRY below.
 *   2. Add action handlers in TestParkService.ts → ACTION_HANDLERS.
 *
 * Everything else auto-adapts:
 *   • Map geometry (platforms, signs, orbs) — generated at runtime
 *   • Client teleporter UI — generated from this registry
 *   • ProximityPrompts — wired automatically per action
 *   • Circular layout — recalculates when zone count changes
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestAction {
  /** Unique id in `zone:action` format (e.g. "combat:use_melee") */
  readonly id: string;
  /** Short label shown on ProximityPrompt and UI */
  readonly label: string;
  /** Tooltip / sign description */
  readonly description: string;
}

export interface ZoneConfig {
  /** Unique zone identifier */
  readonly id: string;
  /** Display name */
  readonly label: string;
  /** What this zone tests */
  readonly description: string;
  /** Platform colour [r, g, b] in 0-1 range */
  readonly color: readonly [number, number, number];
  /** Ordered list of test actions */
  readonly actions: readonly TestAction[];
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Platform size in studs (square) */
export const ZONE_PLATFORM_SIZE = 50;
/** Spacing between action orbs */
export const ZONE_PROMPT_SPACING = 8;
/** Minimum circle radius for zone arrangement */
export const ZONE_MIN_RADIUS = 120;
/** Extra radius per zone to keep things spread out */
export const ZONE_RADIUS_PER = 16;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const ZONE_REGISTRY: readonly ZoneConfig[] = [
  // 1 ── Combat
  {
    id: "combat",
    label: "⚔️ Combat",
    description: "Abilities, hit validation & damage",
    color: [0.9, 0.15, 0.15],
    actions: [
      {
        id: "combat:list_abilities",
        label: "List Abilities",
        description: "Print all registered combat abilities",
      },
      {
        id: "combat:spawn_dummy",
        label: "Spawn Dummy",
        description: "Spawn a target dummy (30 s)",
      },
      { id: "combat:test_hit", label: "Test Hit", description: "Fire a test hit report" },
    ],
  },

  // 2 ── Pets & Gacha
  {
    id: "pets",
    label: "🐾 Pets & Gacha",
    description: "Hatching, equip/unequip, inventory",
    color: [0.2, 0.8, 0.35],
    actions: [
      { id: "pets:hatch_basic", label: "Hatch Basic Egg", description: "Hatch 1 basic_egg" },
      { id: "pets:hatch_premium", label: "Hatch Premium", description: "Hatch 1 premium_egg" },
      { id: "pets:equip_first", label: "Equip First", description: "Equip first pet" },
      { id: "pets:unequip_all", label: "Unequip All", description: "Unequip all pets" },
      { id: "pets:print_pets", label: "Print Pets", description: "Log pet inventory" },
    ],
  },

  // 3 ── Inventory
  {
    id: "inventory",
    label: "🎒 Inventory",
    description: "Items, slot limits, queries",
    color: [0.65, 0.5, 0.2],
    actions: [
      { id: "inventory:add_item", label: "Add Test Item", description: "Add a test item" },
      {
        id: "inventory:print_count",
        label: "Print Count",
        description: "Log item count & max slots",
      },
      { id: "inventory:clear", label: "Clear All", description: "Remove all items" },
    ],
  },

  // 4 ── Quests
  {
    id: "quests",
    label: "📜 Quests",
    description: "Progress, complete & reset quests",
    color: [0.3, 0.5, 0.9],
    actions: [
      {
        id: "quests:progress_daily",
        label: "Progress Daily",
        description: "Increment daily quest by 5",
      },
      {
        id: "quests:complete_daily",
        label: "Complete Daily",
        description: "Force-complete daily_kill_10",
      },
      { id: "quests:reset_all", label: "Reset All", description: "Reset all quest progress" },
      { id: "quests:print_status", label: "Print Status", description: "Log active quest states" },
    ],
  },

  // 5 ── Progression
  {
    id: "progression",
    label: "📈 Progression",
    description: "XP, levels & prestige",
    color: [0.1, 0.6, 0.85],
    actions: [
      { id: "progression:add_100xp", label: "Add 100 XP", description: "Grant 100 XP" },
      {
        id: "progression:add_10000xp",
        label: "Add 10k XP",
        description: "Grant 10,000 XP (level-up)",
      },
      {
        id: "progression:prestige",
        label: "Prestige",
        description: "Attempt prestige if eligible",
      },
      {
        id: "progression:print_status",
        label: "Print Status",
        description: "Log level, XP, prestige",
      },
    ],
  },

  // 6 ── Marketplace
  {
    id: "marketplace",
    label: "🛒 Marketplace",
    description: "Developer products & game passes",
    color: [0.95, 0.7, 0.1],
    actions: [
      {
        id: "marketplace:list_products",
        label: "List Products",
        description: "Log all dev products",
      },
      { id: "marketplace:list_passes", label: "List Passes", description: "Log all game passes" },
      { id: "marketplace:check_vip", label: "Check VIP", description: "Query VIP pass ownership" },
    ],
  },

  // 7 ── Cosmetics
  {
    id: "cosmetics",
    label: "👗 Cosmetics",
    description: "Equip, unequip & preview",
    color: [0.8, 0.3, 0.8],
    actions: [
      { id: "cosmetics:equip_hat", label: "Equip Gold Hat", description: "Equip gold_hat" },
      { id: "cosmetics:unequip_hat", label: "Unequip Hat", description: "Unequip hat slot" },
      { id: "cosmetics:list_owned", label: "List Owned", description: "Log owned cosmetics" },
    ],
  },

  // 8 ── Battle Pass
  {
    id: "battlepass",
    label: "🏅 Battle Pass",
    description: "XP, tiers & reward claiming",
    color: [0.95, 0.5, 0.1],
    actions: [
      { id: "battlepass:add_xp", label: "Add BP XP", description: "Grant 500 battle pass XP" },
      { id: "battlepass:claim_next", label: "Claim Next", description: "Claim next reward" },
      { id: "battlepass:print_status", label: "Print Status", description: "Log BP progress" },
    ],
  },

  // 9 ── Economy & Rewards
  {
    id: "economy",
    label: "💰 Economy",
    description: "Coins, daily rewards & codes",
    color: [0.95, 0.85, 0.15],
    actions: [
      { id: "economy:grant_1000", label: "Grant 1000 Coins", description: "Add 1,000 coins" },
      { id: "economy:claim_daily", label: "Claim Daily", description: "Claim daily reward" },
      {
        id: "economy:redeem_test",
        label: "Redeem LAUNCH2025",
        description: "Redeem code LAUNCH2025",
      },
      { id: "economy:reset_coins", label: "Reset Coins", description: "Set coins to 0" },
    ],
  },

  // 10 ── Events & World
  {
    id: "world",
    label: "🌍 Events & World",
    description: "Day/night, weather & scheduled events",
    color: [0.15, 0.7, 0.5],
    actions: [
      { id: "world:set_day", label: "Set Day", description: "Force daytime (clock 14)" },
      { id: "world:set_night", label: "Set Night", description: "Force night (clock 0)" },
      { id: "world:list_events", label: "List Events", description: "Log scheduled events" },
      {
        id: "world:list_active",
        label: "Active Events",
        description: "Log currently active events",
      },
    ],
  },

  // 11 ── Notifications & Social
  {
    id: "social",
    label: "📢 Social",
    description: "Notifications, announcements & moderation",
    color: [0.4, 0.3, 0.85],
    actions: [
      { id: "social:send_notif", label: "Send Notif", description: "Send a test notification" },
      { id: "social:send_announce", label: "Announce", description: "Broadcast an announcement" },
      { id: "social:list_news", label: "List News", description: "Log all news items" },
    ],
  },

  // 12 ── Data & Security
  {
    id: "data",
    label: "🔐 Data & Security",
    description: "Player data, security & analytics",
    color: [0.5, 0.5, 0.55],
    actions: [
      { id: "data:print_data", label: "Print Data", description: "Log full player data" },
      { id: "data:reset_data", label: "Reset Data", description: "Reset coins & kills to 0" },
      {
        id: "data:fire_analytics",
        label: "Fire Analytics",
        description: "Send a test analytics event",
      },
      {
        id: "data:test_violation",
        label: "Test Violation",
        description: "Report a test security violation",
      },
    ],
  },

  // 13 ── Audio & Localization
  {
    id: "audio",
    label: "🔊 Audio & i18n",
    description: "Sounds, playlists & language switching",
    color: [0.7, 0.7, 0.3],
    actions: [
      { id: "audio:play_sfx", label: "Play SFX", description: "Play a test sound effect" },
      { id: "audio:stop_all", label: "Stop All", description: "Stop all playing sounds" },
      { id: "audio:switch_lang", label: "Switch Lang", description: "Toggle en ↔ es locale" },
    ],
  },

  // 14 ── Leaderboards
  {
    id: "leaderboards",
    label: "🏆 Leaderboards",
    description: "Submit scores & rankings",
    color: [0.85, 0.6, 0.15],
    actions: [
      {
        id: "leaderboards:submit_score",
        label: "Submit Score",
        description: "Submit a random score",
      },
      { id: "leaderboards:read_top", label: "Read Top 10", description: "Print top 10 entries" },
    ],
  },

  // 15 ── Tutorial & Movement
  {
    id: "tutorial",
    label: "📖 Tutorial & Movement",
    description: "Tutorial flow & movement validation",
    color: [0.55, 0.8, 0.55],
    actions: [
      { id: "tutorial:start", label: "Start Tutorial", description: "Begin FTUE basics" },
      { id: "tutorial:complete", label: "Complete Tutorial", description: "Mark tutorial done" },
      { id: "tutorial:print_status", label: "Print Status", description: "Log tutorial progress" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Layout helpers — purely from zone count (auto-adapts)
// ---------------------------------------------------------------------------

/** Compute the circle radius for the current zone count. */
export function computeLayoutRadius(zoneCount: number): number {
  return math.max(ZONE_MIN_RADIUS, zoneCount * ZONE_RADIUS_PER);
}

/**
 * Get the world position (x, z) for a zone at the given index.
 * Zones are arranged in a circle starting at the "top" (negative z).
 */
export function getZonePosition(index: number, total: number): LuaTuple<[number, number]> {
  const radius = computeLayoutRadius(total);
  const angle = (index / total) * math.pi * 2 - math.pi / 2;
  return $tuple(math.cos(angle) * radius, math.sin(angle) * radius);
}
