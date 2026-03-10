# Obby RPG — Next Steps

> What to build next. Updated 2026-03-10.

See [Obby RPG Redesign](../design/obby-rpg-redesign.md) for the full design doc.

---

## What's Already Done

The obby has a surprisingly complete RPG loop:

| System               | Status   | Notes                                                                                              |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| Attributes           | **Done** | Speed, jump, stamina. Base + gear bonuses. Applied to Humanoid.                                    |
| Training             | **Done** | Training stations increase base attributes. 178-line service.                                      |
| Stamina              | **Done** | Sprint stamina with drain/regen. 167-line service.                                                 |
| Equipment            | **Done** | 12 gear items across 5 slots. `@broblox/equipment` factory wired.                                  |
| Gear Shop            | **Done** | `BuyGear` remote + client Equipment screen with buy/equip/unequip.                                 |
| Coin Economy         | **Done** | Stage coins (per-world multiplier), marketplace products, rewards.                                 |
| Hazards              | **Done** | 6 hazard types, Humanoid damage, `@broblox/hazards` factory wired.                                 |
| Worlds               | **Done** | Grasslands (easy) + Lava Caves (medium). Config-driven via registry.                               |
| Stages / Checkpoints | **Done** | 458-line StageService + CheckpointService with CollectionService.                                  |
| Timers               | **Done** | Stage timer + run timer + best-time tracking in DataService.                                       |
| World Progression    | **Done** | 320-line WorldService with portals, unlock requirements, tracking.                                 |
| Progression / XP     | **Done** | ProgressionService with levels, XP, prestige.                                                      |
| Quests               | **Done** | QuestService integrated.                                                                           |
| Battle Pass          | **Done** | BattlePassService with claim rewards flow.                                                         |
| Rewards              | **Done** | RewardFulfillment: coins, XP, items, cosmetics dispatch.                                           |
| Data Persistence     | **Done** | DataService with full save/load, migration, equipment state.                                       |
| Client Controllers   | **Done** | HudController, RemoteController for hazards. EquipmentSync + Equipment screen + "Gear" HUD button. |

---

## What to Build Next (Priority Order)

### 1. Dynamic Obstacles — `ObstacleService` (High Priority)

The obby stages are currently static geometry. The design doc §8 calls for:

- **Moving platforms** — horizontal/vertical oscillating platforms
- **Rotating beams** — sweeping arms that knock players off
- **Timed sequences** — platforms that appear/disappear on a cycle
- **Per-world configs** — Grasslands gets slow/simple, Lava Caves gets fast/complex

**Approach:** Create an `ObstacleService` that scans tagged parts (like HazardService uses `CollectionService` tags) and drives them with `RunService.Heartbeat`. Could reuse the `@broblox/hazards` behaviour pattern — each obstacle type is a behaviour with `onActivate`/`onDeactivate`/`onUpdate`.

**Scope:** ~200-300 lines server service + shared obstacle type definitions.

### 2. Sky Kingdom World (High Priority)

Third world with unique mechanics:

- Wind gusts (push force applied to player)
- Disappearing/reappearing cloud platforms
- Higher stat requirements (speed 20+, jump 55+, stamina 18+)
- Add `sky_kingdom` to `worldConfigs.ts` (placeholder comment already exists)
- Higher coin multiplier (2.0×)
- New hazard variants: wind_blast (knockback), cloud_dissolve (timed floor removal)

**Scope:** worldConfig entry + 2-3 new hazard definitions + Roblox Studio map.

### 3. Client UI Polish (Medium Priority)

The equipment screen already exists in `ScreenController` (`createEquipmentScreen`) with buy, equip, and unequip wired through `RemoteController`. HUD sidebar has a "Gear" button. Remaining work:

- **Stat preview** — show before/after comparison when hovering gear
- **Visual polish** — rarity color coding, slot headers, coin balance styling
- **Tooltip details** — expanded descriptions, modifier breakdowns
- **Empty-state guidance** — "Visit training stations to earn coins" when player has 0 coins

### 4. Hub Map Polish (Medium Priority, Roblox Studio)

Physical world building:

- Training station areas with clear visuals
- Shop NPC/area with proximity prompt
- World portal visual effects
- Signage / wayfinding for new players

### 5. Consumable Items (Low Priority)

Design doc §3 mentions consumables not yet implemented:

- Speed potion (temporary speed boost)
- Jump boost (temporary jump increase)
- Shield (temporary hazard immunity)
- Uses InventoryService for stack management

### 6. PvP Racing (Low Priority, Post-Launch)

Design doc §13 lists this as an open question. Timer system exists, so the foundation is there.

---

## Suggested Session Plan

**Tomorrow's session — Dynamic Obstacles + Sky Kingdom prep:**

1. Create `@broblox/obstacles` package (or add to hazards if scope is small)
2. Define obstacle behaviour types: `moving_platform`, `rotating_beam`, `timed_sequence`
3. Create `ObstacleService` in obby with CollectionService scanning
4. Add `sky_kingdom` world config with proper unlock requirements
5. Define 2-3 Sky Kingdom hazard variants
6. Tests for all new code

**Following session — Client UI polish + Hub map:**

1. Stat preview on Equipment screen (before/after comparison)
2. Rarity color coding and visual polish
3. Hub map Studio work (training stations, shop area, portals)
