# Manual Testing Checklist — BroBlox Obby

> **Purpose:** Systematically verify all visible features, UI, and game systems in Roblox Studio.
> **Date created:** 2026-03-07
> **How to use:** Work through each section top-to-bottom. Check off items as you verify them. Note any failures with a brief description.

---

## Resetting Player Data

If your progress is saved and you need to test from a fresh state (tutorial, daily rewards, first-time quests, etc.):

1. **Stop** any running Play Solo session (DataStore can't be accessed from the client)
2. Open **View → Command Bar**
3. Open the file `tools/reset-obby-data.luau`, copy its full contents
4. Paste into the Command Bar and press **Enter**
5. Check the Output window — it will list each DataStore being wiped
6. Start a new **Play Solo** — all data will be fresh (stage 1, 0 coins, tutorial active, etc.)

> This wipes all 15 DataStores used by the obby game for your player. It does NOT affect other players.

---

## 0. Build & Launch

### 0.1 Build Pipeline

- [ok] `pnpm run build:packages` completes without errors
- [ok] `pnpm run build:obby` completes without errors
- [ok] `games/obby/out/` directory populated with compiled Luau files
- [ok] `rojo build default.project.json -o build.rbxl` succeeds (or use Task: "Build Obby")

### 0.2 Rojo Sync (alternative to .rbxl)

- [ok] Run Task "Dev: Obby" — watch mode starts, "Compilation finished" appears
- [ok] Run Task "Rojo: Serve Obby" — `rojo serve` starts on port 34872
- [ok] Roblox Studio Rojo plugin connects successfully
- [?] Changes in `.ts` files auto-compile and sync to Studio

### 0.3 Studio Launch

- [ok] Open `games/obby/build.rbxl` in Roblox Studio (or connect via Rojo)
- [ok] File → Play Solo (or Start Server for multi-player testing)
- [ok] **Server output** shows: `Starting Obby server...` → `Obby server booted.`
- [ok] **Client output** shows: `Starting Obby client...` → `Obby client booted.`
- [ok] No red errors in Output window on initial boot
- [ok] `ReplicatedStorage` contains `ObbyRemotes` folder with all remote instances

---

## 1. Map & World

### 1.1 Stage Structure (6 stages)

- [ok] `Workspace.Stages` contains Stage1 through Stage6
- [ok] Each stage has platforms, obstacles, and an end zone (tagged `ObbyEndZone` or named `EndPlatform`/`EndZone`)
- [ok] Server log: "Loaded 6 stages"

### 1.2 Checkpoints (13 total)

- [ok] `Workspace.Checkpoints` contains all checkpoints:
  - Stage 1: Checkpoint1-0, Checkpoint1-1
  - Stage 2: Checkpoint2-0, Checkpoint2-1
  - Stage 3: Checkpoint3-0, Checkpoint3-1
  - Stage 4: Checkpoint4-0, Checkpoint4-1
  - Stage 5: Checkpoint5-0, Checkpoint5-1
  - Stage 6: Checkpoint6-0, Checkpoint6-1, Checkpoint6-2
- [didnt find] Server log: correct checkpoint count loaded
- [ok] All checkpoints have `StageNumber` and `CheckpointIndex` attributes
- [ok] Checkpoints are touchable (Neon material, semi-transparent, non-collidable)

### 1.3 Kill Zones

- [ok] Kill zones present (tagged `ObbyKillZone` or named `killzone`/`lava`/`kill`/`killbrick`)
- [ok] Server log: "Set up N kill zones"
- [ok] No dead zones where player gets stuck without dying or reaching a checkpoint

### 1.4 Coins

- [ok] Collectible coins placed throughout stages (tagged `ObbyCoin` or have `CoinValue` attribute)
- [ok] Server log: "Set up N coins total"

### 1.5 Spawn

- [ok] `Workspace.Spawn` exists and is the initial spawn location
- [ok] Player spawns at correct position on join

### 1.6 Lighting & Day/Night

- [?] Lighting: Ambient ≈ (0.4, 0.4, 0.5), OutdoorAmbient ≈ (0.5, 0.5, 0.6)
- [not visible] Day/night cycle running (~15 min full cycle, starts at 10:00 game time)
- [not visible] Sky transitions are smooth (15s transition duration)
- [not visible] Wait ~7-8 minutes and verify sky visibly changes to nighttime

---

## 2. Core Gameplay

### 2.1 Checkpoint System

- [ok] Touch checkpoint 1-0 → "Checkpoint Reached!" notification appears
- [ok] Touch checkpoint 1-1 → notification shows updated checkpoint
- [ok] HUD stage label updates to "Stage 1" on first checkpoint
- [ok] **Forward-only:** touching an earlier checkpoint (e.g., 1-0 after 1-1) does NOT register
- [?] Rapid checkpoint touches are debounced (0.5s cooldown)
- [ok] Touching a checkpoint for a different stage than current is ignored

### 2.2 Stage Completion

- [ok] Walk through Stage 1 end zone → "Stage 1 Complete!" notification with time + coins
- [ok] Coins label in HUD updates with earned coins (base: 10 per stage)
- [ok] Stage label advances to "Stage 2"
- [ok] Timer resets on new stage
- [ok] Cannot re-trigger end zone immediately (2s cooldown)
- [didnt find] Stage completion grants 100 XP (check via GetFullPlayerData or server logs)
- [?] Stage completion grants 25 Battle Pass XP

### 2.3 Full Obby Completion

- [ ] Complete all 6 stages → "Course Complete!" notification
- [ ] Player teleports back to start after ~1.5s
- [ ] `totalCompletions` increments by 1
- [ ] `bestFullRunTime` recorded (if first run or new best)
- [ ] Stage resets to 1, checkpoint resets to 0
- [ ] Full completion has longer cooldown (10s) before re-triggering

### 2.4 Death & Respawn

- [ ] Touch kill zone (lava/killbrick) → player dies
- [ ] Respawn at last checkpoint (NOT world spawn)
- [ ] Death counter increments (check server log: "Respawning player at stage X, checkpoint Y")
- [ ] Player velocity reset on respawn (no momentum carry-over)
- [ ] Fall into void → same death/respawn behavior
- [ ] **R key respawn:** Press R → teleport to current checkpoint (no death needed)
- [ ] R spam doesn't break (0.5s respawn cooldown)
- [ ] Deathless streak resets on death (affects "Deathless Run" quest)

### 2.5 Coin Collection

- [ ] Walk through a coin → coin becomes invisible (transparency → 1)
- [ ] Coins label in HUD increases by coin value
- [ ] `PlayerDataSync` fires → coin count updates on client
- [ ] Same coin can't be collected twice (per-player, per-session)
- [ ] Quest "Token Collector" objective increments on coin collection
- [ ] Leave and rejoin → coins are collectible again (session-scoped)

---

## 3. HUD & UI

### 3.1 Top Bar

- [ ] Top bar visible at top of screen with 3 elements
- [ ] **Left:** Stage label shows correct stage (e.g., "Stage 1")
- [ ] **Center:** Timer counting up in real-time (format "X.XXs")
- [ ] **Right:** Coins label with 🪙 prefix, shows correct count
- [ ] Stage label updates on checkpoint touch and stage advance
- [ ] Timer resets when advancing to next stage
- [ ] Coins HUD updates immediately on coins earned

### 3.2 Notifications (Center Screen)

- [ ] Checkpoint reached → green notification "✓ Checkpoint X" (2s duration)
- [ ] Stage completed → blue notification with time + coins (3s)
- [ ] New best time → "(star) NEW BEST!" text included
- [ ] Coin delta → gold "+X coins!" notification (1.5s)
- [ ] Welcome announcement → "Welcome to the Obby!" on join
- [ ] Notifications stack vertically if multiple fire close together
- [ ] Notifications fade out and self-destruct on expiry

### 3.3 Leaderboard Panel (Top-Right)

- [ ] Leaderboard panel visible at top-right of screen
- [ ] Title "Leaderboard" shown
- [ ] "Updated HH:MM:SS" timestamp displayed
- [ ] Entries populate (may be empty on first run in Studio)
- [ ] Own entry highlighted in blue with "(You)" suffix
- [ ] Each entry shows: rank #, player name, wins, best time
- [ ] Long names truncated to 16 chars with "…"
- [ ] **Refresh button:** click → "Refreshing..." state → data reloads
- [ ] **Rate limit:** spam Refresh → notification "Refresh rate-limited. Try again in Xs"
- [ ] After rate limit: button grays out, re-enables after cooldown

### 3.4 Sidebar Buttons (Right Edge)

- [ ] Right sidebar visible with 7 icon buttons stacked vertically
- [ ] Buttons present (top to bottom): 📋 Quests, 🎒 Inventory, 🐾 Pets, 🥚 Shop, ✨ Cosmetics, ⭐ Battle Pass, ⚙️ Settings
- [ ] Hover on any button → tooltip label appears to the left
- [ ] Hover → button transparency changes (visual feedback)
- [ ] Click each button → corresponding modal opens (test each below)
- [ ] **Single-modal rule:** opening a new modal closes the currently open one
- [ ] **Escape key:** pressing Escape closes the active modal

### 3.5 Floating Notifications (HudController)

- [ ] Level up → "🎉 Level Up! You are now level X!" (green, 3s)
- [ ] Prestige unlock → "🏆 Prestige X Unlocked!" (gold, 4s)
- [ ] Quest complete → "✅ Quest Complete: [quest name]" (blue, 3s)
- [ ] Achievement complete → "🏅 Achievement: [achievement name]" (orange, 3s)
- [ ] Event started → "🎊 Event Started: [event label]" (purple, 4s)
- [ ] Event ended → "Event Ended: [event label]" (gray, 3s)
- [ ] All floating notifications fade out and self-destruct

---

## 4. Screens & Modals

### 4.1 Quest Tracker (📋)

- [ ] Quest tracker overlay visible on screen (shows up to 3 active quests)
- [ ] Daily quests auto-assigned on join:
  - "Stage Sprinter" — Complete 5 stages (reward: 300 XP + 75 coins)
  - "Token Collector" — Collect 10 tokens (reward: 200 XP + 50 coins)
- [ ] Weekly quests auto-assigned:
  - "Obby Marathon" — Complete 25 stages (reward: 2000 XP + 400 coins + Stage Skip)
  - "Deathless Run" — 10 stages without dying (reward: 3000 XP + 750 coins + Fire Trail)
- [ ] Quest objectives show progress (e.g., "0/5 stages", "0/10 tokens")
- [ ] Progress updates in real-time as objectives are completed
- [ ] Click 📋 button → full quest log opens/closes (toggle)
- [ ] Complete 5 stages → "Stage Sprinter" quest completes → notification + rewards granted
- [ ] Die → deathless counter resets to 0
- [ ] Completed quests marked as complete or disappear

### 4.2 Daily Rewards (Auto-Popup)

- [ ] On first join → daily reward popup appears automatically
- [ ] Shows 7-day cycle: Day 1 (50 coins) through Day 7 (500 coins + Speed Coil)
- [ ] Current day highlighted
- [ ] Streak counter visible
- [ ] **Claim button:** click → reward granted (coins/items/XP)
- [ ] After claim → popup dismisses
- [ ] `DailyRewardClaimed` floating notification appears on client
- [ ] Rejoining same day → popup shows but claim button disabled (can't re-claim)
- [ ] Day-by-day rewards:
  - Day 1: 50 coins
  - Day 2: 75 coins
  - Day 3: 100 coins + Checkpoint Token (item)
  - Day 4: 150 coins
  - Day 5: 200 coins + 50 XP
  - Day 6: 300 coins + Stage Skip (item)
  - Day 7: 500 coins + Speed Coil (bonus day)

### 4.3 Inventory (🎒)

- [ ] Click 🎒 → Inventory screen opens
- [ ] Shows all owned items with: name, category, rarity, stack count
- [ ] Items from rewards/codes appear here (Stage Skip, Speed Coil, Gravity Coil, Checkpoint Token, Fire Trail)
- [ ] Item definitions correct:
  - Stage Skip — consumable, rare, max stack 10
  - Speed Coil — tool, uncommon, max stack 1
  - Gravity Coil — tool, rare, max stack 1
  - Checkpoint Token — consumable, common, max stack 99
  - Fire Trail — misc, epic, max stack 1, tradeable
- [ ] Max 50 slots / 200 total items enforced
- [ ] Close button dismisses modal

### 4.4 Pet Collection (🐾)

- [ ] Click 🐾 → Pet Collection screen opens
- [ ] Shows all owned pets with: species name, rarity, element, stats, level
- [ ] Three species defined:
  - Cloud Bunny — common, air element
  - Spring Frog — uncommon, earth element
  - Star Phoenix — legendary, fire element
- [ ] **Equip pet:** select a pet → equip action → "equipped" indicator shown
- [ ] **Max 1 equipped:** equipping a second pet auto-unequips the first
- [ ] **Unequip pet:** works, slot shows empty
- [ ] Data refreshes after equip/unequip

### 4.5 Gacha / Egg Hatching (🥚)

- [ ] Click 🥚 → Gacha screen opens
- [ ] "Sky Egg" displayed: name, description, cost (50 coins)
- [ ] Current coin balance shown
- [ ] **Hatch (single):** click with ≥50 coins → pet hatches → result displayed
- [ ] 50 coins deducted per hatch
- [ ] Hatched pet appears in Pet Collection screen
- [ ] **Multi-hatch:** hatch up to 10 at once → cost×N deducted, N pets added
- [ ] **Insufficient funds:** hatch fails with error message, no coins deducted
- [ ] Expected loot distribution: ~70% Cloud Bunny, ~25% Spring Frog, ~5% Star Phoenix
- [ ] **Pity system:** after ~30 hatches without uncommon+, next hatch guarantees ≥uncommon
- [ ] Data refreshes after hatching (coin balance + pet collection)

### 4.6 Cosmetics (✨)

- [ ] Click ✨ → Cosmetics screen opens
- [ ] Three cosmetics defined:
  - Rainbow Trail — trail slot, rare, tradeable
  - Crown — hat slot, legendary, limited edition, non-tradeable
  - Sparkle — effect slot, uncommon, tradeable
- [ ] Owned cosmetics marked as owned; unowned shown but not equippable
- [ ] **Equip cosmetic:** select owned cosmetic → equip in slot → indicator shown
- [ ] **Unequip:** clear slot
- [ ] **Slot-based:** trail, hat, effect are separate slots
- [ ] Cannot equip a cosmetic you don't own
- [ ] Data refreshes after each action
- [ ] Close button dismisses modal

### 4.7 Battle Pass (⭐)

- [ ] Click ⭐ → Battle Pass screen opens
- [ ] Title: "Obby Season 1: Sky High"
- [ ] 10 tiers displayed with XP thresholds: 50, 100, 200, 350, 500, 700, 900, 1200, 1600, 2000
- [ ] Current tier and BP XP progress shown
- [ ] **Free track rewards visible:** coins, items, eggs at each tier
- [ ] **Premium track shown but locked** (unless premium purchased)
- [ ] **Tier progression:** complete stages → 25 BP XP each → bar fills
- [ ] **Claim reward:** click on unlocked free-tier reward → item/coins granted
- [ ] "Custom/egg" rewards (Tiers 5, 9): auto-hatch Sky Eggs, pets added to collection
- [ ] Already-claimed rewards show as claimed (cannot re-claim)
- [ ] Data refreshes after claiming
- [ ] Close button dismisses modal

### 4.8 Settings (⚙️)

- [ ] Click ⚙️ → Settings screen opens
- [ ] Volume sliders present:
  - Master volume (default 0.8)
  - SFX (default 1.0)
  - Music (default 0.5)
  - Ambient (default 0.7)
  - UI (default 1.0)
  - Voice (default 1.0)
- [ ] Adjusting sliders → server log shows "Volume X → Y"
- [ ] Close button dismisses modal

---

## 5. Progression System

### 5.1 XP & Leveling

- [ ] Complete a stage → gain 100 XP (visible via GetFullPlayerData)
- [ ] XP progress shown in relevant screens
- [ ] Linear curve: each level requires base 50 XP (growth factor 1.0)
- [ ] Level-up triggers `LevelUp` remote → "🎉 Level Up!" floating notification
- [ ] Max level: 50

### 5.2 Prestige

- [ ] At level 50 → prestige becomes available
- [ ] Prestige resets level but increments prestige rank
- [ ] Each prestige grants 15% cumulative XP bonus
- [ ] Max prestige: 5
- [ ] `PrestigeUnlocked` remote fires → "🏆 Prestige X Unlocked!" notification

### 5.3 Event Multipliers

- [ ] During "XP Boost" event (if active): stage XP doubled (100 → 200)
- [ ] During "Coin Rush" event (if active): stage coins ×1.5 (10 → 15)
- [ ] During "Speedrun Challenge" (Mar 7-9, 2026): leaderboard prestige event, no multiplier
- [ ] Multipliers apply on top of base values

---

## 6. Achievements

- [ ] **First Steps** — Complete 1 stage → unlocks → 50 XP reward
- [ ] **Quarter Century** — Complete 25 total stages → 500 coins
- [ ] **Stage Master** — Complete 100 total stages → 5000 coins + Fire Trail
- [ ] **Obby Adept** — Reach level 25 → 2000 coins
- [ ] **Dedicated Climber** — 7-day login streak → Gravity Coil
- [ ] Achievement rewards fulfilled (coins added, items in inventory, cosmetics granted)
- [ ] `AchievementCompleted` notification fires for each unlock
- [ ] Achievement progress tracks automatically (stage completions, level, streak)

---

## 7. Code Redemption

- [ ] Code input available (via RedeemCode remote — may need command bar or UI)
- [ ] Redeem `OBBY2025` → success message + 200 coins added
- [ ] HUD coins update immediately
- [ ] Redeem `OBBY2025` again → "already redeemed" error
- [ ] Redeem `SPEEDRUN` → success + speed boost (5 min)
- [ ] Redeem `SPEEDRUN` again → "already redeemed"
- [ ] Invalid code → failure/error message
- [ ] Rate limit: 1 code per 3 seconds enforced

---

## 8. Marketplace

### 8.1 Developer Products

- [ ] `BuyProduct` remote can be fired for product IDs:
  - 3000001 — 100 Coins (25 R$)
  - 3000002 — 500 Coins (99 R$)
  - 3000003 — Skip Stage (49 R$)
- [ ] (Note: real purchase prompts require a published game — verify remotes don't error in Studio)
- [ ] Product handlers: 100/500 coins add to balance; Skip Stage advances currentStage by 1

### 8.2 Game Passes

- [ ] `CheckGamePass` function callable for pass IDs:
  - 4000001 — VIP (199 R$)
  - 4000002 — Speed Boost (99 R$)
  - 4000003 — Trail Pack (149 R$)
- [ ] Returns `{ passId, owned: true/false }`
- [ ] (Ownership always false in Studio unless manually simulated)

---

## 9. Tutorial (First-Time User Experience)

- [ ] First-time player → tutorial sequence "ftue_obby" starts automatically
- [ ] **Step 1:** "Welcome to the Obby!" dialog
- [ ] **Step 2:** "Movement — Use WASD to move" (completes on first movement action)
- [ ] **Step 3:** "Checkpoints — Touch a checkpoint pad" (completes on first checkpoint touch)
- [ ] **Step 4:** "You're Ready!" final dialog
- [ ] Skip button available on all steps
- [ ] Tutorial state persisted (DataStore `"ObbyTutorial"`)
- [ ] Returning player does NOT see tutorial again

---

## 10. Audio

- [ ] Background music plays on join (playlist: "obby_music", looped)
- [ ] Nature ambient sound audible (looped)
- [ ] SFX on checkpoint touch
- [ ] SFX on fall/death
- [ ] SFX on stage completion
- [ ] UI click sounds
- [ ] (Note: sounds use `rbxassetid://0` placeholder IDs — may be silent until real assets are uploaded)

---

## 11. Events System

> Current date: Mar 7, 2026. "Speedrun Challenge" event (Mar 7-9) should be active.

- [ ] On join: `EventStarted` notification fires for "Speedrun Challenge" (if within window)
- [ ] `getActiveEvents()` returns active events (check server logs)
- [ ] When event ends (Mar 9): "Event Ended: Speedrun Challenge" notification
- [ ] Verify coin/XP multipliers apply during relevant event windows:
  - "XP Boost" (Mar 1-3): 2× XP — expired by now
  - "Coin Rush" (Mar 5-6): 1.5× coins — expired by now
  - "Speedrun Challenge" (Mar 7-9): no multiplier, leaderboard prestige

---

## 12. Security & Anti-Cheat

### 12.1 Rate Limiting

- [ ] Spam `RequestRespawn` faster than 2/1s → excess requests silently dropped
- [ ] Spam `RequestLeaderboard` faster than 1/2s → rate-limit violation reported
- [ ] Spam `HatchEgg` faster than 3/1s → excess rejected
- [ ] Server log shows: "Rate-limited: [player] on '[endpoint]'" for violations

### 12.2 Movement Validation

- [ ] Normal gameplay (jumps, long falls up to ~70 studs) → no false positives
- [ ] Server-side respawn teleports (checkpoint respawn) → `notifyTeleport` prevents flagging
- [ ] Feature flag `movement.validation.enabled` controls whether validation runs

### 12.3 Moderation

- [ ] Chat messages go through moderation filter (ChatModerationService)
- [ ] Banned player cannot rejoin (ModerationEnforcementService)

### 12.4 Payload Validation

- [ ] Invalid `RequestRespawn` payload → logged as warning, no crash
- [ ] Invalid `RedeemCode` payload (non-string) → rejected by validator
- [ ] Invalid `HatchEgg` payload → rejected
- [ ] Invalid `EquipPet`/`EquipCosmetic` payloads → rejected

---

## 13. Data Persistence

- [ ] Join game → player data loads (defaults: stage 1, checkpoint 0, 0 coins, 0 deaths)
- [ ] Complete stages, collect coins → data updates in memory
- [ ] **Leave and rejoin:** coins, stage, checkpoint, deaths, completions all preserved
- [ ] Auto-save fires every 60s (no visible effect — check server log for save activity)
- [ ] `lastPlayedAt` timestamps updated on join and leave
- [ ] `bestFullRunTime` persists across sessions
- [ ] `stageProgress` records per-stage stats (completions, deaths, best time)
- [ ] `GetFullPlayerData` returns complete snapshot: coins, level, xp, quests, pets, cosmetics, battle pass, daily reward status

---

## 14. Graceful Shutdown

- [ ] Stop Play test → server log shows: `Server shutting down...` and `app.shutdown()`
- [ ] All player sessions end gracefully (final data save)
- [ ] DataStore writes complete before shutdown
- [ ] Leaderboard meta flushed on destroy
- [ ] No errors in output during shutdown sequence

---

## 15. Edge Cases & Regression

- [ ] Two players at same checkpoint simultaneously → both register correctly (multi-player test)
- [ ] Player disconnects mid-stage → data saved at last checkpoint
- [ ] Die and immediately press R → no double-respawn or teleport glitch
- [ ] Complete full obby → coins from all 6 stages accumulate correctly
- [ ] Complete obby multiple times → `totalCompletions` increments each time
- [ ] Hatch 10 eggs at once with exactly enough coins → all succeed
- [ ] Hatch 10 eggs with coins for only 5 → partial success (as many as affordable)
- [ ] Claim all 10 battle pass tiers → all rewards granted without error
- [ ] "Deathless Run" quest: complete 10 stages → die → counter resets → complete 10 more → quest completes
- [ ] All modals respect single-modal rule (opening one closes another)
- [ ] Escape closes active modal but doesn't interfere with gameplay
- [ ] Spam any remote beyond rate limit → no server crash, violations logged
- [ ] Join with no prior data → clean defaults, tutorial starts, daily reward popup appears

---

## 16. CI / Publish Verification

> Not testable in Studio — verify via GitHub Actions.

- [ ] Push to `main` triggers "Publish Dev" workflow for **both** test-park and obby
- [ ] Manual workflow_dispatch with `game: obby` publishes only obby
- [ ] Manual workflow_dispatch with `game: all` publishes both games
- [ ] GitHub Environment `dev` has required variables:
  - `OBBY_DEV_UNIVERSE_ID`
  - `OBBY_DEV_PLACE_ID`
  - `ROBLOX_OPEN_CLOUD_API_KEY` (secret)
- [ ] Published obby is playable on Roblox (dev experience)

---

## Notes

| Symbol | Meaning           |
| ------ | ----------------- |
| [ ]    | Not tested        |
| [x]    | Passed            |
| [!]    | Failed — add note |
| [~]    | Partial / blocked |

**Test environment:** Roblox Studio (Play Solo or local server test)
**DataStore behavior:** Studio uses a local mock DataStore — data resets between sessions unless Studio API access is enabled.
**Audio:** Sound asset IDs may be `rbxassetid://0` (placeholders) — sounds won't play until real IDs are uploaded.
**Marketplace:** Purchase prompts require a published game — can only verify remotes fire without error in Studio.
