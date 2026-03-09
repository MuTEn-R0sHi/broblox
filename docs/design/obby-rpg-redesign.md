# Obby RPG Redesign — Game Design Document

> **Status:** In Progress  
> **Author:** Copilot + roshi  
> **Date:** 2026-03-08 (updated 2026-03-10)

---

## 1. Vision

Transform the obby from a pure-skill platformer into an **RPG-progression obby** inspired
by Takeshi's Castle and Super Mario. Players start weak, train at stations, buy gear, and
progressively unlock the ability to complete harder parkour worlds.

**Core loop:**  
Train → Attempt parkour → Fail → Train more / Buy gear → Go further → Complete world → Unlock next world

---

## 2. Core Mechanics

### 2.1 Player Attributes

Three base attributes govern all movement:

| Attribute   | What it controls                  | Start | Max | Unit      |
| ----------- | --------------------------------- | ----- | --- | --------- |
| **Speed**   | WalkSpeed / RunSpeed              | 10    | 30  | studs/sec |
| **Jump**    | JumpPower                         | 30    | 70  | studs     |
| **Stamina** | Sprint duration before exhaustion | 5     | 30  | seconds   |

The Roblox Humanoid properties are derived from attributes:

```
WalkSpeed  = 6 + (player.speed * 0.8)        →  14 at speed=10, 30 at speed=30
RunSpeed   = WalkSpeed * 1.5                  →  21 at speed=10, 45 at speed=30
JumpPower  = player.jump                      →  30 at jump=30, 70 at jump=70
```

Stamina drains while sprinting (1 point/sec), recharges while walking (0.5 point/sec)
or standing still (1 point/sec). When stamina hits 0, player is forced to walk speed
for 2 seconds (cooldown) before stamina begins recharging.

**Why these starting values?**  
Speed 10 + Jump 30 lets you walk and platform on easy terrain. Stage 1 of World 1
is completable at base stats. But you **cannot** sprint far or reach higher platforms,
creating the motivation to train.

### 2.2 Training Stations

Located in the central **Hub** (spawn area). Each station runs a mini-activity:

| Station          | Activity                                     | Attribute | Gain               |
| ---------------- | -------------------------------------------- | --------- | ------------------ |
| **Speed Track**  | Run laps on a treadmill/track. Timer-based   | Speed     | +0.1 per rep cycle |
| **Jump Pads**    | Jump onto progressively higher targets       | Jump      | +0.1 per rep cycle |
| **Stamina Ring** | Run through an obstacle circuit w/o stopping | Stamina   | +0.1 per rep cycle |

Training is intentionally slow — the grind encourages players to return daily
and to pursue coins/gear as shortcuts.

**Training rep mechanics:**

- Player interacts with station (proximity prompt or touch)
- A short mini-activity begins (3-8 seconds)
- On success: attribute increases by 0.1
- Diminishing returns: after attribute > 20, gain drops to 0.05 per rep
- Cool-down: 2 seconds between reps at the same station

### 2.3 Timer & Race System

The run timer does **not** start on game load. Instead:

- Player is in the **Hub** (free-roam, no timer)
- Player walks into a **World Portal** — a visible archway/gate
- Stepping through the portal teleports the player to the world's start line
- Crossing the **Start Line** (a thin trigger part) starts the timer
- Timer is visible on-screen (HUD)
- Timer stops when the player reaches the world's **Finish Line**
- Dying does NOT stop the timer (it keeps running)
- Timer resets if the player leaves the world (returns to Hub)

### 2.4 Items & Shop

Players spend **coins** (collected in worlds or from training bonuses) at a **Shop NPC**
or **Shop Board** in the Hub.

#### Gear (equippable, stat-boosting)

| Item            | Cost | Effect                         | Slot       |
| --------------- | ---- | ------------------------------ | ---------- |
| Running Shoes   | 100  | Speed +2                       | Feet       |
| Bouncy Boots    | 150  | Jump +5                        | Feet       |
| Energy Drink    | 50   | Stamina +3 (consumable, 1 use) | Consumable |
| Feather Cape    | 300  | Jump +3, Speed +1              | Back       |
| Rocket Boots    | 500  | Jump +8                        | Feet       |
| Sprint Trainers | 400  | Speed +4, Stamina +2           | Feet       |
| Endurance Band  | 200  | Stamina +5                     | Accessory  |
| Champion Armor  | 1000 | Speed +3, Jump +3, Stamina +3  | Body       |

#### Equipment Slots

Players have slots: **Feet**, **Back**, **Body**, **Accessory** (×2), **Consumable** (×3).

Only one item per slot. Equipping a new item in an occupied slot unequips the old one.
Effective stats = base attributes + sum of all equipped gear bonuses.

### 2.5 Coins

Sources:

- Collectible coins placed throughout worlds (5-50 each)
- Stage completion bonus (scales with world difficulty)
- Training station bonus (small, 1-5 coins per 10 reps)
- Daily login reward
- Quest rewards
- VIP pass multiplier (2×)

---

## 3. World System

### 3.1 Structure

```
Hub (spawn area)
├── Training Stations (speed, jump, stamina)
├── Shop
├── Leaderboards
├── World Portals
│   ├── Portal 1: Grasslands    (unlocked by default)
│   ├── Portal 2: Lava Caves    (requires: Speed 15, Jump 40, Stamina 10)
│   ├── Portal 3: Sky Kingdom   (requires: Speed 20, Jump 55, Stamina 18)
│   └── Portal 4+: Future worlds
└── Social area / cosmetics display
```

### 3.2 World Configuration

Each world is defined by a **WorldConfig**:

```typescript
interface WorldConfig {
  id: string; // "grasslands", "lava_caves", etc.
  displayName: string; // "Grasslands"
  description: string;
  theme: WorldTheme; // color palette, skybox, music, lighting
  difficulty: "easy" | "medium" | "hard" | "extreme";
  unlockRequirements: {
    speed: number; // minimum base attribute (before gear)
    jump: number;
    stamina: number;
    worldsCompleted?: string[]; // must complete these worlds first
  };
  stages: WorldStageConfig[]; // ordered list of stages
  coinMultiplier: number; // 1.0, 1.5, 2.0 etc.
  obstacles: ObstacleConfig[]; // moving/animated obstacles in this world
}

interface WorldStageConfig {
  stageNumber: number;
  displayName: string;
  recommendedSpeed: number; // hint shown to player
  recommendedJump: number;
  obstacles: string[]; // obstacle IDs active in this stage
}

interface WorldTheme {
  skyboxId?: string;
  musicId: string;
  ambientColor: [number, number, number];
  fogColor: [number, number, number];
  fogEnd: number;
  platformMaterial: Enum.Material;
  accentColor: Color3;
}
```

### 3.3 World Definitions (Launch)

#### World 1: Grasslands (Easy)

- Theme: Bright green, blue sky, cheerful music
- 6 stages (current stages reworked)
- Obstacles: static platforms, simple gaps, slow-moving platforms
- Stat requirements: none (default unlock)
- Recommended stats: Speed 10-15, Jump 30-40
- Coin multiplier: 1.0×
- New player can complete Stage 1-2 at base stats
- Stages 3-6 require some training or gear

#### World 2: Lava Caves (Medium)

- Theme: Dark red/orange, volcanic, dramatic music
- 8 stages
- Obstacles: lava floors, fire jets (timed), crumbling platforms, moving rock pillars
- Stat requirements: Speed ≥ 15, Jump ≥ 40, Stamina ≥ 10
- Recommended stats: Speed 18-22, Jump 45-55
- Coin multiplier: 1.5×

#### World 3: Sky Kingdom (Hard)

- Theme: White/gold, clouds, ethereal music
- 10 stages
- Obstacles: wind gusts (push sideways), rotating bars, disappearing clouds, conveyor platforms
- Stat requirements: Speed ≥ 20, Jump ≥ 55, Stamina ≥ 18
- Recommended stats: Speed 24-28, Jump 60-70
- Coin multiplier: 2.0×

### 3.4 Obstacle System

Obstacles are scripted parts with `TweenService` or `RunService` animations.

```typescript
interface ObstacleConfig {
  id: string;
  type: ObstacleType;
  // Type-specific parameters
  params: Record<string, unknown>;
}

type ObstacleType =
  | "moving_platform" // translates between two points
  | "rotating_bar" // rotates around center axis
  | "fire_jet" // periodic damage burst
  | "crumbling_platform" // breaks N seconds after touch, respawns
  | "conveyor" // moves player horizontally while standing
  | "wind_gust" // periodic sideways force
  | "disappearing_platform" // fades in/out on a timer
  | "swinging_pendulum" // swings back and forth
  | "spinning_disc" // flat disc that rotates
  | "falling_bridge" // sections fall sequentially
  | "bumper" // bounces player on contact
  | "spring_pad"; // launches player upward
```

Each obstacle type has a shared implementation in a new package
(`@broblox/obstacles` or within `games/obby/src/server/services/ObstacleService.ts`).
Obstacles are defined in world config and instantiated at runtime from template models.

**Obstacle placement:** Instead of hardcoding positions in `.model.json`, obstacles are
placed via a **stage layout config** that references template models + transform offsets.
Static platforms remain as `.model.json` files; dynamic obstacles are spawned by
`ObstacleService` at world load.

---

## 4. Data Model

### 4.1 New PlayerData Schema

```typescript
interface ObbyPlayerData extends VersionedData {
  __version: 2;

  // ── Attributes (base values, before gear) ──
  attributes: {
    speed: number; // 10.0 – 30.0
    jump: number; // 30.0 – 70.0
    stamina: number; // 5.0 – 30.0
  };
  trainingReps: {
    speed: number; // total reps completed (for diminishing returns calc)
    jump: number;
    stamina: number;
  };

  // ── Economy ──
  coins: number;

  // ── Per-world progression ──
  worlds: Record<string, WorldProgressData>;

  // ── Inventory & equipment ──
  inventory: InventorySlot[];
  equipped: Record<EquipSlot, string | undefined>; // slot → itemId

  // ── Stats ──
  totalDeaths: number;
  totalCompletions: number; // total world completions (any world)

  // ── Existing systems (kept) ──
  unlockedItems: string[];
  equippedTrail: string | undefined;
  lastPlayedAt: number;
}

interface WorldProgressData {
  currentStage: number;
  currentCheckpoint: number;
  completions: number;
  bestFullRunTime: number | undefined;
  stageProgress: Record<number, StageProgress>;
}

interface InventorySlot {
  itemId: string;
  quantity: number;
}

type EquipSlot =
  | "feet"
  | "back"
  | "body"
  | "accessory1"
  | "accessory2"
  | "consumable1"
  | "consumable2"
  | "consumable3";
```

### 4.2 Migration from v1 → v2

```typescript
function migrateV1toV2(old: ObbyPlayerDataV1): ObbyPlayerData {
  return {
    __version: 2,
    attributes: { speed: 10, jump: 30, stamina: 5 },
    trainingReps: { speed: 0, jump: 0, stamina: 0 },
    coins: old.coins,
    worlds: {
      grasslands: {
        currentStage: old.currentStage,
        currentCheckpoint: old.currentCheckpoint,
        completions: old.totalCompletions,
        bestFullRunTime: old.bestFullRunTime,
        stageProgress: old.stageProgress,
      },
    },
    inventory: [],
    equipped: {},
    totalDeaths: old.totalDeaths,
    totalCompletions: old.totalCompletions,
    unlockedItems: old.unlockedItems,
    equippedTrail: old.equippedTrail,
    lastPlayedAt: old.lastPlayedAt,
  };
}
```

---

## 5. Architecture Changes

### 5.1 Map Structure (New)

```
games/obby/map/
├── Hub/
│   ├── Spawn.model.json              (spawn location in hub)
│   ├── TrainingSpeed.model.json      (speed training station)
│   ├── TrainingJump.model.json       (jump training station)
│   ├── TrainingStamina.model.json    (stamina training station)
│   ├── Shop.model.json               (shop area)
│   ├── Leaderboards.model.json       (leaderboard displays)
│   ├── PortalGrasslands.model.json   (world 1 portal)
│   ├── PortalLavaCaves.model.json    (world 2 portal, locked)
│   └── PortalSkyKingdom.model.json   (world 3 portal, locked)
├── Worlds/
│   ├── Grasslands/
│   │   ├── StartLine.model.json
│   │   ├── FinishLine.model.json
│   │   ├── Stage1.model.json
│   │   ├── Stage2.model.json
│   │   ├── ...
│   │   ├── Stage6.model.json
│   │   ├── Checkpoints/
│   │   │   ├── CP1-0.model.json
│   │   │   └── ...
│   │   └── KillZones/
│   │       └── ...
│   ├── LavaCaves/
│   │   ├── StartLine.model.json
│   │   ├── ...
│   └── SkyKingdom/
│       └── ...
└── ObstacleTemplates/
    ├── MovingPlatform.model.json
    ├── RotatingBar.model.json
    ├── CrumblingPlatform.model.json
    ├── FireJet.model.json
    └── ...
```

### 5.2 Rojo Project (Updated)

```json
{
  "Workspace": {
    "Hub": { "$path": "map/Hub" },
    "Worlds": { "$path": "map/Worlds" },
    "ObstacleTemplates": {
      "$path": "map/ObstacleTemplates",
      "$properties": { "Archivable": false }
    }
  }
}
```

Obstacle templates are loaded into `ServerStorage` or `ReplicatedStorage` at runtime,
not placed in Workspace directly.

### 5.3 New Services

| Service              | Responsibility                                            |
| -------------------- | --------------------------------------------------------- |
| **AttributeService** | Manages player speed/jump/stamina, applies to Humanoid    |
| **TrainingService**  | Handles training station interactions, rep tracking       |
| **WorldService** ¹   | World loading, portals, world-scoped progression          |
| **ObstacleService**  | Spawns/animates dynamic obstacles per world               |
| **ShopService**      | In-game coin shop (NOT Robux — that stays in Marketplace) |
| **TimerService**     | Per-player run timer, starts at start line                |
| **StaminaService**   | Stamina drain/recharge, sprint control                    |

¹ Replaces current `WorldService` (day/night only). Day/night becomes part of world themes.

### 5.4 Modified Services

| Service                       | Changes                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| **DataService**               | New schema v2, migration, world-scoped getters             |
| **StageService**              | World-aware: `completeStage(player, worldId, stageNumber)` |
| **CheckpointService**         | World-aware checkpoints, world-scoped respawn              |
| **MovementValidationService** | Dynamic thresholds based on player attributes              |
| **MarketplaceService**        | Gear pass (unlock premium gear), rework Speed Boost pass   |
| **ProgressionService**        | XP from training + world completions, level unlocks gear   |
| **InventoryService**          | Expanded item definitions, equipment slot system           |
| **LeaderboardService**        | Per-world leaderboards + global                            |
| **UIController** (client)     | Hub UI, world select, training HUD, stamina bar, shop UI   |

### 5.5 Removed/Deprecated

| Component           | Reason                              |
| ------------------- | ----------------------------------- |
| `speed_coil` item   | Replaced by attribute system + gear |
| `gravity_coil` item | Replaced by Jump attribute + gear   |
| Auto-start timer    | Timer now starts at Start Line      |

---

## 6. Hub Layout

```
                    ┌─────────────────────┐
                    │    LEADERBOARDS     │
                    └─────────────────────┘
                              │
    ┌──────────┐    ┌────────┴────────┐    ┌──────────┐
    │ TRAINING │    │                 │    │ TRAINING │
    │  SPEED   │----│  SPAWN POINT    │----│  JUMP    │
    │  TRACK   │    │  (center)       │    │  PADS    │
    └──────────┘    └────────┬────────┘    └──────────┘
                             │
    ┌──────────┐    ┌────────┴────────┐    ┌──────────┐
    │ TRAINING │    │                 │    │          │
    │ STAMINA  │----│      SHOP       │----│  SOCIAL  │
    │  RING    │    │                 │    │  AREA    │
    └──────────┘    └─────────────────┘    └──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────┴──────┐ ┌────┴─────┐ ┌──────┴──────┐
       │  PORTAL 1   │ │ PORTAL 2 │ │  PORTAL 3   │
       │ GRASSLANDS  │ │LAVA CAVES│ │SKY KINGDOM  │
       │  (open)     │ │ (locked) │ │  (locked)   │
       └─────────────┘ └──────────┘ └─────────────┘
```

Hub size: ~200×200 studs, flat terrain, themed as a "training camp".

---

## 7. Attribute & Gear Formula

### Effective stats (what Humanoid uses):

```
effectiveSpeed   = attributes.speed   + sum(equipped gear speed bonuses)
effectiveJump    = attributes.jump    + sum(equipped gear jump bonuses)
effectiveStamina = attributes.stamina + sum(equipped gear stamina bonuses)
```

### Humanoid mapping:

```
Humanoid.WalkSpeed = 6 + (effectiveSpeed * 0.8)
                   → Range: 14 (speed=10) to 30+ (speed=30+gear)

RunSpeed           = Humanoid.WalkSpeed * 1.5
                   → Range: 21 to 45+

Humanoid.JumpPower = effectiveJump
                   → Range: 30 to 70+
```

### Gate check (can player enter world?):

```
canEnter(player, world) =
  player.attributes.speed   >= world.unlockRequirements.speed  AND
  player.attributes.jump    >= world.unlockRequirements.jump   AND
  player.attributes.stamina >= world.unlockRequirements.stamina AND
  (world.unlockRequirements.worldsCompleted is subset of player completed worlds)
```

Note: gate check uses **base attributes only** (no gear). Gear helps you _inside_ the
world but can't bypass the unlock threshold. This ensures players actually train.

---

## 8. Obstacle Behavior Specs

### Moving Platform

- Translates between point A and point B
- Speed configurable (2-10 studs/sec)
- Player stands on platform, moves with it
- Visual: glowing edges while moving

### Rotating Bar

- Horizontal bar rotates around center axis
- Player must time jumps to avoid being knocked off
- Speed: 30-90 degrees/sec

### Fire Jet

- Wall/floor-mounted, shoots fire periodically
- Pattern: 2s on, 3s off (configurable)
- Touching fire = kill (respawn at checkpoint)

### Crumbling Platform

- Looks normal, starts shaking 0.5s after touch
- Breaks apart 1.5s after touch
- Respawns after 5s
- Visual: crack particle effect

### Disappearing Platform

- Fades from visible to invisible on a timer
- Pattern: 3s visible, 2s invisible (configurable)
- Player falls through when invisible

### Conveyor

- Moves player horizontally while standing on it
- Direction and speed configurable
- Can help or hinder depending on direction

### Wind Gust

- Invisible force applied periodically
- Pushes player sideways (VectorForce)
- Pattern: 2s push, 4s calm

### Swinging Pendulum

- Hangs from ceiling, swings back and forth
- Player must time passage underneath
- Touching = knockback (not kill)

### Spring Pad

- Launches player upward when stepped on
- Force based on player Jump attribute (1.5× jump power)
- Visual: compressed spring animation

### Bumper

- Bounces player away on contact
- Can be used strategically (or as obstacle)
- Visual: inflatable bumper look

---

## 9. UI Changes

### Hub HUD

```
┌─────────────────────────────────────────────────┐
│  🪙 1,250 coins          ⭐ Level 12           │
│                                                 │
│  Speed: 16.5 ████████░░░░ (30)                 │
│  Jump:  42.0 ██████████░░ (70)                 │
│  Stamina: 12.0 ██████░░░░░░ (30)              │
└─────────────────────────────────────────────────┘
```

### In-World HUD

```
┌─────────────────────────────────────────────────┐
│  🪙 1,250        ⏱️ 01:23.45      Stage 3/6    │
│                                                 │
│  Stamina: ██████████████░░░░  (sprint: Shift)  │
└─────────────────────────────────────────────────┘
```

### Training Station UI (pops up near station)

```
┌──────────────────────────┐
│  ⚡ SPEED TRAINING       │
│                          │
│  Current: 14.5 / 30.0   │
│  Reps today: 47          │
│  Next gain: +0.1         │
│                          │
│  [E] Start Training      │
└──────────────────────────┘
```

### Shop UI

```
┌──────────────────────────────────────┐
│  🛒 SHOP                            │
│                                      │
│  Running Shoes    100 🪙  Speed +2  │
│  Bouncy Boots     150 🪙  Jump +5   │
│  Endurance Band   200 🪙  Stam +5   │
│  Feather Cape     300 🪙  J+3 S+1   │
│  ...                                 │
│                                      │
│  [Click to buy]  [Equip]  [Info]     │
└──────────────────────────────────────┘
```

### World Select (at portal)

```
┌──────────────────────────────────────┐
│  🌍 GRASSLANDS                      │
│  Difficulty: Easy                    │
│  Stages: 6                           │
│  Your best: 02:45.12                 │
│                                      │
│  Requirements: ✅ Met                │
│  Speed ≥ 0  (you: 14.5) ✅          │
│  Jump  ≥ 0  (you: 42.0) ✅          │
│  Stamina ≥ 0 (you: 12)  ✅          │
│                                      │
│  [Enter World]                       │
└──────────────────────────────────────┘
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Hub + Attributes + Training)

1. New `ObbyPlayerData` v2 schema + migration
2. `AttributeService` — apply speed/jump to Humanoid
3. `StaminaService` — sprint drain/recharge
4. `TrainingService` — 3 training station interactions
5. Hub map (`map/Hub/`) with spawn, 3 stations
6. Hub HUD (attribute bars, coins, level)
7. Movement validation thresholds adapt to player stats

### Phase 2: World System + Timer

1. `WorldService` (new) — world configs, portal logic, teleport
2. `TimerService` — start-line trigger, HUD display
3. Rework `StageService` to be world-aware
4. Rework `CheckpointService` to be world-aware
5. Move current 6 stages into `Worlds/Grasslands/`
6. World portals in Hub
7. World select UI

### Phase 3: Shop & Gear

1. `ShopService` — coin-based purchasing
2. Expanded `InventoryService` — equipment slots, stat bonuses
3. `AttributeService` gear bonus calculation
4. Item definitions (8+ launch items)
5. Shop UI
6. Equipment UI

### Phase 4: Dynamic Obstacles

1. `ObstacleService` — template instantiation, animation loops
2. Obstacle implementations (moving platform, rotating bar, etc.)
3. Obstacle templates (`map/ObstacleTemplates/`)
4. Add 3-4 obstacle types to Grasslands stages
5. Balance testing

### Phase 5: World 2 (Lava Caves)

1. Lava Caves map (8 stages)
2. World-specific obstacles (fire jets, crumbling platforms)
3. Lava Caves theme (skybox, music, lighting)
4. Balance & playtest

### Phase 6: World 3 (Sky Kingdom)

1. Sky Kingdom map (10 stages)
2. World-specific obstacles (wind gusts, disappearing platforms)
3. Sky Kingdom theme
4. Balance & playtest

---

## 11. Package Impact Map

| Package                  | Impact   | Changes                                          |
| ------------------------ | -------- | ------------------------------------------------ |
| `@broblox/movement`      | Major    | AttributeService integration, dynamic thresholds |
| `@broblox/data`          | Minor    | No package change, schema change is game-level   |
| `@broblox/inventory`     | Moderate | Equipment slot system, gear stat bonuses         |
| `@broblox/progression`   | Minor    | Training XP grants, no structural change         |
| `@broblox/marketplace`   | Minor    | Rework pass descriptions, no structural change   |
| `@broblox/ui`            | Moderate | Stamina bar, attribute bars, shop UI components  |
| `@broblox/world-systems` | Rewrite  | Becoming per-world theme system                  |
| `@broblox/analytics`     | Minor    | New events (training, world_enter, gear_equip)   |
| `@broblox/leaderboards`  | Minor    | Per-world board support                          |
| All others               | None     | No changes needed                                |

---

## 12. Data Flow Diagrams

### Training Flow

```
Player touches TrainingStation
  → ProximityPrompt triggers
  → TrainingService.startRep(player, "speed")
  → Mini-activity runs (3-8s)
  → On success:
     → DataService.updateAttributes(player, { speed: +0.1 })
     → AttributeService.applyToHumanoid(player)
     → TrainingReps counter incremented
     → (Every 10 reps: +1 coin bonus)
     → UI refreshes attribute bars
```

### World Entry Flow

```
Player touches WorldPortal
  → WorldService.tryEnterWorld(player, "grasslands")
  → Check unlock requirements (base attributes only)
  → If locked: show "Requirements not met" UI
  → If unlocked:
     → Teleport player to world StartPlatform
     → Set active world in player session
     → Load world-specific lighting/music
     → Timer NOT started yet
     → Player crosses StartLine trigger
       → TimerService.startTimer(player)
       → HUD shows timer
```

### Gear Equip Flow

```
Player clicks "Equip" on item in inventory
  → ShopService/InventoryService.equipItem(player, itemId, slot)
  → Validate: player owns item, slot is valid for item category
  → Unequip current item in slot (if any)
  → Set equipped[slot] = itemId
  → AttributeService.recalculateEffective(player)
  → AttributeService.applyToHumanoid(player)
  → UI refreshes stats
```

---

## 13. Open Questions

1. **Rebirth/Prestige** — Keep the existing prestige system? Could reset attributes
   to base but grant a permanent small bonus (e.g., +0.5% speed per prestige).
   Decision: Keep, fits the RPG loop well.

2. **Training daily cap?** — Should there be a max number of training reps per day
   to encourage return visits? Suggestion: soft cap (diminishing returns after 100
   reps/day), no hard cap.

3. **Gear durability?** — Should gear degrade and need replacement? Suggestion: No,
   keep it simple. Once bought, it's permanent (except consumables).

4. **PvP racing?** — Should players be able to race each other through a world?
   Suggestion: Not in launch, but the timer system supports it. Phase 7+ feature.

5. **Pets** — Current pet system exists. Should pets grant stat bonuses?
   Suggestion: Yes, small passive bonuses (e.g., +1 speed). Gives gacha a purpose.

6. **World rotation / seasonal worlds?** — Limited-time worlds that appear for
   events? Great for retention but high content cost. Post-launch consideration.

---

## 14. Success Metrics

| Metric                  | Target               | How measured                     |
| ----------------------- | -------------------- | -------------------------------- |
| Session length          | 15+ min average      | Analytics: session duration      |
| D1 retention            | 40%+                 | Analytics: return within 24h     |
| D7 retention            | 20%+                 | Analytics: return within 7 days  |
| World 1 completion rate | 30% of players       | Analytics: world_completed event |
| Training engagement     | 60% of players train | Analytics: training_rep event    |
| Shop conversion         | 25% buy ≥1 item      | Analytics: shop_purchase event   |
| Average coins earned    | 200+ per session     | Analytics: coin_earned sum       |

---

## 15. Implementation Status

> Updated: 2026-03-10

### Completed (PRs merged to main)

| Component                           | PR      | What shipped                                                                                                                                                                                                                               |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`@broblox/equipment` package**    | #176    | GearRegistry, EquipmentStore, createEquipmentService factory. 54 tests.                                                                                                                                                                    |
| **`@broblox/hazards` package**      | #177    | HazardRegistry, HazardManager (5 behaviours), createHazardService factory. 37 tests.                                                                                                                                                       |
| **Obby: HazardService**             | #177    | 6 hazard definitions (lava, fire jet, poison, crumble, spike, hot surface). Real Humanoid damage, DataService.incrementDeaths, CollectionService tag scanning, Heartbeat updates, HazardToggle/HazardDamage remotes. 16 integration tests. |
| **Obby: Lava Caves world config**   | #177    | `lava_caves` added to worldConfigs with unlock requirements (speed 15, jump 40, stamina 10, worldsCompleted: grasslands).                                                                                                                  |
| **Obby: Client hazard controllers** | #177    | HudController (hazard damage screen flash), RemoteController (HazardToggle/HazardDamage listeners).                                                                                                                                        |
| **Obby: Shared types & remotes**    | #177    | HazardTogglePayload, HazardDamagePayload types. HazardToggle, HazardDamage remote event definitions.                                                                                                                                       |
| **Obby: EquipmentService**          | earlier | 12-item gear catalog (5 slots: feet, back, body, accessory1, accessory2). createEquipmentService factory wired with DataService persistence. 215 lines, full test suite.                                                                   |
| **Obby: AttributeService**          | earlier | `getEffective()` computes base attributes + gear bonuses via `getEquipmentStore`. Applies WalkSpeed/JumpPower to Humanoid. Syncs to client.                                                                                                |
| **Obby: BuyGear (shop)**            | earlier | PlayerActionService `BuyGear` remote: coin check, level requirement check, coin deduction, gear grant, EquipmentSync to client.                                                                                                            |
| **Obby: Coin economy**              | earlier | DataService.addCoins, StageService per-stage coin rewards (coinMultiplier per world), MarketplaceService coin products, RewardFulfillment coin grants.                                                                                     |
| **Obby: Timer system**              | earlier | DataService startStageTimer/startRunTimer/bestTime tracking. CheckpointService integrates stage and run timers.                                                                                                                            |

### Next Up

| Component                     | Priority | Notes                                                                                         |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| **Obby: Dynamic obstacles**   | High     | ObstacleService — moving/rotating/animated platforms, timed sequences, per-world configs (§8) |
| **Obby: Sky Kingdom world**   | High     | Third world: wind gusts, disappearing platforms, higher stat requirements (§10.3)             |
| **Hub map buildout**          | Medium   | Roblox Studio work: training stations, shop area, world portals, visual polish (§6)           |
| **Obby: Client shop UI**      | Medium   | Shop GUI showing gear catalog, prices, level reqs, owned/equipped state                       |
| **Obby: Client equipment UI** | Medium   | Equipment GUI showing inventory, equip/unequip, stat previews                                 |
| **Obby: Consumable items**    | Low      | Speed potions, jump boosts, shield — via InventoryService (§3 consumables)                    |
| **PvP racing**                | Low      | Race challenges between players through worlds (§13 open question)                            |
