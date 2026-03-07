/**
 * Test Park Service
 *
 * Reads the shared zone registry and auto-generates:
 *   • Coloured platforms arranged in a circle around spawn
 *   • Signs with zone name + description (SurfaceGui)
 *   • Neon orbs with ProximityPrompts for each test action
 *   • BillboardGui labels above each orb
 *
 * All layout is computed from the zone count — adding a zone to the
 * registry automatically re-arranges the circle. No hardcoded positions.
 *
 * Action execution:
 *   ProximityPrompt.Triggered → look up handler in ACTION_HANDLERS →
 *   run it → send result via TestPark_ActionResult client remote.
 *
 * Teleportation:
 *   TestPark_Teleport server event → move character to zone platform.
 *
 * To add a new system:
 *   1. Add a ZoneConfig entry in shared/test-park/zone-registry.ts
 *   2. Add handlers below in ACTION_HANDLERS
 *   That's it — everything else auto-adapts.
 */

import { Service, createLogger } from "@broblox/core";
import { Workspace } from "@rbxts/services";
import {
  ZONE_REGISTRY,
  ZONE_PLATFORM_SIZE,
  ZONE_PROMPT_SPACING,
  getZonePosition,
  type ZoneConfig,
} from "shared/test-park/zone-registry";

// ── Service imports for action handlers ──────────────────────────────────
import { RemoteService } from "./RemoteService";
import { DataService } from "./DataService";
import { getProgression } from "./ProgressionService";
import { getInventory } from "./InventoryService";
import { getQuests } from "./QuestService";
import { getPetStore } from "./PetService";
import { getGachaStore } from "./GachaService";
import { getCosmeticStore } from "./CosmeticsService";
import { getBattlePassStore } from "./BattlePassService";
import { getDailyRewards } from "./RewardsService";
import { getCodeStore } from "./CodeRedemptionService";
import { getActiveEvents, getEventScheduler } from "./EventService";
import { getWorldManager } from "./WorldService";
import { getAnnouncementManager } from "./NotificationService";
import { getEventTracker } from "./AnalyticsService";
import { getAudioManager } from "./AudioService";
import { getI18n } from "./LocalizationService";
import { getTutorialManager, getSequenceRegistry } from "./TutorialService";
import { getLeaderboardStore } from "./LeaderboardService";
import { DEVELOPER_PRODUCTS, GAME_PASSES, userOwnsGamePass } from "./MarketplaceService";
import { reportViolation } from "@broblox/security";
import { fulfillRewards } from "./RewardFulfillment";

const logger = createLogger("TestParkService");

// =========================================================================
// Action Handlers
// =========================================================================

type ActionHandler = (player: Player) => string;

/**
 * Map of action ID → handler.
 * Each handler calls into real game services and returns a human-readable
 * result string. Adding a new action: add an entry here + in zone-registry.
 */
const ACTION_HANDLERS: Record<string, ActionHandler> = {
  // ── Combat ──────────────────────────────────────────────────────────
  "combat:list_abilities": () => {
    return "Combat abilities: melee_attack (25 dmg, 0.8 s cd), ranged_attack (15 dmg, 0.5 s cd), heavy_slam (50 dmg, 2.0 s cd)";
  },

  "combat:spawn_dummy": (player) => {
    const character = player.Character;
    if (!character) return "❌ No character";
    const hrp = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
    if (!hrp) return "❌ No HumanoidRootPart";

    const dummy = new Instance("Model");
    dummy.Name = "TestDummy";

    const body = new Instance("Part");
    body.Name = "HumanoidRootPart";
    body.Size = new Vector3(4, 6, 2);
    body.Position = hrp.Position.add(hrp.CFrame.LookVector.mul(12)).add(new Vector3(0, 3, 0));
    body.Anchored = true;
    body.Color = new Color3(1, 0.2, 0.2);
    body.Material = Enum.Material.SmoothPlastic;
    body.Parent = dummy;

    const humanoid = new Instance("Humanoid");
    humanoid.MaxHealth = 100;
    humanoid.Health = 100;
    humanoid.Parent = dummy;

    const billboard = new Instance("BillboardGui");
    billboard.Size = new UDim2(0, 200, 0, 40);
    billboard.StudsOffset = new Vector3(0, 5, 0);
    billboard.AlwaysOnTop = true;
    billboard.Parent = body;

    const nameLabel = new Instance("TextLabel");
    nameLabel.Size = new UDim2(1, 0, 1, 0);
    nameLabel.BackgroundTransparency = 1;
    nameLabel.TextColor3 = new Color3(1, 0.3, 0.3);
    nameLabel.TextStrokeTransparency = 0.4;
    nameLabel.TextScaled = true;
    nameLabel.Font = Enum.Font.GothamBold;
    nameLabel.Text = "TEST DUMMY";
    nameLabel.Parent = billboard;

    dummy.PrimaryPart = body;
    dummy.Parent = Workspace;

    task.delay(30, () => {
      if (dummy.Parent) dummy.Destroy();
    });

    return "✅ Spawned test dummy (despawns in 30 s)";
  },

  "combat:test_hit": (player) => {
    const character = player.Character;
    if (!character) return "❌ No character";
    const hrp = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
    if (!hrp) return "❌ No HumanoidRootPart";

    // Look for a nearby test dummy to hit
    const dummies = Workspace.GetChildren().filter((c) => c.Name === "TestDummy" && c.IsA("Model"));
    if (dummies.size() === 0) return "❌ No test dummies — spawn one first";

    return `✅ Found ${dummies.size()} dummy(ies). Use combat:spawn_dummy first, then UseAbility remote for full flow.`;
  },

  // ── Pets & Gacha ────────────────────────────────────────────────────
  "pets:hatch_basic": (player) => {
    const store = getGachaStore(player.UserId);
    if (!store) return "❌ Gacha store not loaded";
    const coreData = DataService.getData(player);
    const availableCoins = coreData?.coins ?? 0;
    const result = store.hatch("basic_egg", availableCoins);
    if (result.ok && result.itemId) {
      getPetStore(player.UserId)?.addPet(result.itemId);
      return `✅ Hatched: ${result.itemId} (rarity: ${result.rarity ?? "?"})`;
    }
    return `❌ Hatch failed: ${result.status}`;
  },

  "pets:hatch_premium": (player) => {
    const store = getGachaStore(player.UserId);
    if (!store) return "❌ Gacha store not loaded";
    const coreData = DataService.getData(player);
    const availableCoins = coreData?.coins ?? 0;
    const result = store.hatch("premium_egg", availableCoins);
    if (result.ok && result.itemId) {
      getPetStore(player.UserId)?.addPet(result.itemId);
      return `✅ Hatched: ${result.itemId} (rarity: ${result.rarity ?? "?"})`;
    }
    return `❌ Hatch failed: ${result.status}`;
  },

  "pets:equip_first": (player) => {
    const petStore = getPetStore(player.UserId);
    if (!petStore) return "❌ Pet store not loaded";
    const allPets = petStore.getAllPets();
    if (allPets.size() === 0) return "❌ No pets — hatch one first";
    const first = allPets[0];
    const result = petStore.equipPet(first.instanceId);
    return result.ok
      ? `✅ Equipped: ${first.speciesId} (${first.instanceId})`
      : `❌ Failed: ${result.status}`;
  },

  "pets:unequip_all": (player) => {
    const petStore = getPetStore(player.UserId);
    if (!petStore) return "❌ Pet store not loaded";
    const equipped = petStore.getEquippedPets();
    let count = 0;
    for (const pet of equipped) {
      petStore.unequipPet(pet.instanceId);
      count++;
    }
    return `✅ Unequipped ${count} pet(s)`;
  },

  "pets:print_pets": (player) => {
    const petStore = getPetStore(player.UserId);
    if (!petStore) return "❌ Pet store not loaded";
    const allPets = petStore.getAllPets();
    const equipped = petStore.getEquippedPets();
    return `Pets: ${allPets.size()} total, ${equipped.size()} equipped | ${allPets.map((p) => p.speciesId).join(", ")}`;
  },

  // ── Inventory ───────────────────────────────────────────────────────
  "inventory:add_item": (player) => {
    const inv = getInventory(player.UserId);
    if (!inv) return "❌ Inventory not loaded";
    const result = inv.addItem("health_potion", 1);
    return result.ok ? "✅ Added 1 health_potion" : `❌ Failed: ${result.message ?? result.status}`;
  },

  "inventory:print_count": (player) => {
    const inv = getInventory(player.UserId);
    if (!inv) return "❌ Inventory not loaded";
    const items = inv.getAllItems();
    return `Items: ${items.size()} / ${inv.getMaxSlots()} slots`;
  },

  "inventory:clear": (player) => {
    const inv = getInventory(player.UserId);
    if (!inv) return "❌ Inventory not loaded";
    const items = inv.getAllItems();
    let removed = 0;
    for (const item of items) {
      inv.removeItem(item.instanceId);
      removed++;
    }
    return `✅ Removed ${removed} item(s)`;
  },

  // ── Quests ──────────────────────────────────────────────────────────
  "quests:progress_daily": (player) => {
    const questStore = getQuests(player.UserId);
    if (!questStore) return "❌ Quests not loaded";
    questStore.incrementObjective("kill", 5);
    return "✅ Incremented 'kill' objective by 5";
  },

  "quests:complete_daily": (player) => {
    const questStore = getQuests(player.UserId);
    if (!questStore) return "❌ Quests not loaded";
    questStore.incrementObjective("kill", 100);
    return "✅ Force-completed daily_kill_10 (incremented kill by 100)";
  },

  "quests:reset_all": (player) => {
    const questStore = getQuests(player.UserId);
    if (!questStore) return "❌ Quests not loaded";
    const active = questStore.getActiveQuests();
    let count = 0;
    for (const q of active) {
      questStore.abandonQuest(q.questId);
      count++;
    }
    return `✅ Abandoned ${count} active quest(s)`;
  },

  "quests:print_status": (player) => {
    const questStore = getQuests(player.UserId);
    if (!questStore) return "❌ Quests not loaded";
    const active = questStore.getActiveQuests();
    const completed = questStore.getCompletedQuestIds();
    const lines = active.map((q) => {
      const obj = q.objectives.size() > 0 ? q.objectives[0] : undefined;
      const progress = obj ? `${obj.current}/${obj.target}` : "?";
      return `  ${q.questId}: ${progress} (${q.status})`;
    });
    return `Active (${active.size()}):\n${lines.join("\n")}\nCompleted: ${completed.join(", ")}`;
  },

  // ── Progression ─────────────────────────────────────────────────────
  "progression:add_100xp": (player) => {
    const prog = getProgression(player.UserId);
    if (!prog) return "❌ Progression not loaded";
    prog.addXp(100);
    return `✅ +100 XP → level ${prog.getLevel()} (${prog.getCurrentXp()}/${prog.getXpForNextLevel()})`;
  },

  "progression:add_10000xp": (player) => {
    const prog = getProgression(player.UserId);
    if (!prog) return "❌ Progression not loaded";
    prog.addXp(10000);
    return `✅ +10,000 XP → level ${prog.getLevel()} (${prog.getCurrentXp()}/${prog.getXpForNextLevel()})`;
  },

  "progression:prestige": (player) => {
    const prog = getProgression(player.UserId);
    if (!prog) return "❌ Progression not loaded";
    const ok = prog.prestige();
    return ok
      ? `✅ Prestige → ${prog.getPrestige()}`
      : "❌ Not eligible (level too low or max prestige)";
  },

  "progression:print_status": (player) => {
    const prog = getProgression(player.UserId);
    if (!prog) return "❌ Progression not loaded";
    return `Level ${prog.getLevel()} | XP ${prog.getCurrentXp()}/${prog.getXpForNextLevel()} | Prestige ${prog.getPrestige()}`;
  },

  // ── Marketplace ─────────────────────────────────────────────────────
  "marketplace:list_products": () => {
    const lines = DEVELOPER_PRODUCTS.map(
      (p) => `  ${p.name} (id:${p.productId}) — ${p.robuxPrice} R$`
    );
    return `Developer Products:\n${lines.join("\n")}`;
  },

  "marketplace:list_passes": () => {
    const lines = GAME_PASSES.map((p) => `  ${p.name} (id:${p.passId}) — ${p.robuxPrice} R$`);
    return `Game Passes:\n${lines.join("\n")}`;
  },

  "marketplace:check_vip": (player) => {
    const vip = GAME_PASSES.find((p) => p.name === "VIP");
    if (!vip) return "❌ VIP pass not configured";
    const owned = userOwnsGamePass(player.UserId, vip.passId);
    return `VIP Pass (id:${vip.passId}): ${owned ? "✅ OWNED" : "❌ Not owned"}`;
  },

  // ── Cosmetics ───────────────────────────────────────────────────────
  "cosmetics:equip_hat": (player) => {
    const store = getCosmeticStore(player.UserId);
    if (!store) return "❌ Cosmetics not loaded";
    const result = store.equip("gold_hat", "hat" as never);
    return result.ok ? "✅ Equipped gold_hat" : `❌ ${result.status}`;
  },

  "cosmetics:unequip_hat": (player) => {
    const store = getCosmeticStore(player.UserId);
    if (!store) return "❌ Cosmetics not loaded";
    const result = store.unequip("hat" as never);
    return result.ok ? "✅ Unequipped hat slot" : `❌ ${result.status}`;
  },

  "cosmetics:list_owned": (player) => {
    const store = getCosmeticStore(player.UserId);
    if (!store) return "❌ Cosmetics not loaded";
    const owned = store.getOwned();
    return `Owned cosmetics (${owned.size()}): ${owned.join(", ")}`;
  },

  // ── Battle Pass ─────────────────────────────────────────────────────
  "battlepass:add_xp": (player) => {
    const store = getBattlePassStore(player.UserId);
    if (!store) return "❌ Battle pass not loaded";
    store.addXp(500);
    return `✅ +500 BP XP → tier ${store.getTier()} (${store.getXp()} XP)`;
  },

  "battlepass:claim_next": (player) => {
    const store = getBattlePassStore(player.UserId);
    if (!store) return "❌ Battle pass not loaded";
    const claimed = store.getClaimedRewards();
    // Try claiming reward IDs sequentially
    for (let tier = 1; tier <= 10; tier++) {
      for (const track of ["free", "premium"]) {
        const rewardId = `tier${tier}_${track}`;
        if (!claimed.includes(rewardId)) {
          const result = store.claimReward(rewardId);
          if (result.ok) {
            return `✅ Claimed: ${rewardId}`;
          }
          return `❌ Claim failed: ${result.status}`;
        }
      }
    }
    return "All rewards already claimed";
  },

  "battlepass:print_status": (player) => {
    const store = getBattlePassStore(player.UserId);
    if (!store) return "❌ Battle pass not loaded";
    return `Season: ${store.getSeasonId()} | Tier ${store.getTier()} | XP ${store.getXp()} | Premium: ${store.isPremium()}`;
  },

  // ── Economy & Rewards ───────────────────────────────────────────────
  "economy:grant_1000": (player) => {
    DataService.addCoins(player, 1000);
    const data = DataService.getData(player);
    return `✅ +1,000 coins → balance: ${data?.coins ?? "?"}`;
  },

  "economy:claim_daily": (player) => {
    const store = getDailyRewards(player.UserId);
    if (!store) return "❌ Daily rewards not loaded";
    if (!store.canClaim()) return "❌ Already claimed today";
    const reward = store.claim();
    if (reward) {
      fulfillRewards(player, reward.rewards);
      return `✅ Claimed day ${reward.day} (streak: ${store.getStreak()})`;
    }
    return "❌ Claim returned undefined";
  },

  "economy:redeem_test": (player) => {
    const codeStore = getCodeStore();
    const result = codeStore.redeemCode(player.UserId, "LAUNCH2025");
    return result.success ? "✅ Code LAUNCH2025 redeemed!" : `❌ ${result.status}`;
  },

  "economy:reset_coins": (player) => {
    const data = DataService.getData(player);
    if (!data) return "❌ Data not loaded";
    DataService.addCoins(player, -data.coins);
    return "✅ Coins reset to 0";
  },

  // ── Events & World ──────────────────────────────────────────────────
  "world:set_day": () => {
    const wm = getWorldManager();
    wm.setClockTime(14);
    return "✅ Clock set to 14 (daytime)";
  },

  "world:set_night": () => {
    const wm = getWorldManager();
    wm.setClockTime(0);
    return "✅ Clock set to 0 (nighttime)";
  },

  "world:list_events": () => {
    const scheduler = getEventScheduler();
    const all = scheduler.getScheduledEvents();
    const lines = all.map((e: { id: string; label: string }) => `  ${e.id}: ${e.label}`);
    return `Scheduled Events (${all.size()}):\n${lines.join("\n")}`;
  },

  "world:list_active": () => {
    const active = getActiveEvents();
    if (active.size() === 0) return "No events currently active";
    return `Active: ${active.map((e: { id: string }) => e.id).join(", ")}`;
  },

  // ── Social & Notifications ──────────────────────────────────────────
  "social:send_notif": (player) => {
    RemoteService.getRegistry().fireClient("TestPark_ActionResult", player, {
      actionId: "social:send_notif",
      result: "🔔 This is a test notification from the park!",
      success: true,
    });
    return "✅ Test notification sent";
  },

  "social:send_announce": () => {
    const mgr = getAnnouncementManager();
    mgr.addNews({
      id: `test_${os.time()}`,
      title: "Test Announcement",
      body: "This is a test announcement from the Test Park.",
      category: "announcement",
      publishedAt: os.time(),
    });
    return "✅ Announcement published";
  },

  "social:list_news": () => {
    const mgr = getAnnouncementManager();
    const news = mgr.getNews();
    const lines = news.map((n: { id: string; title: string }) => `  ${n.id}: ${n.title}`);
    return `News Items (${news.size()}):\n${lines.join("\n")}`;
  },

  // ── Data & Security ─────────────────────────────────────────────────
  "data:print_data": (player) => {
    const data = DataService.getData(player);
    if (!data) return "❌ Data not loaded";
    return `coins: ${data.coins} | kills: ${data.kills} | lastPlayed: ${data.lastPlayedAt}`;
  },

  "data:reset_data": (player) => {
    const data = DataService.getData(player);
    if (!data) return "❌ Data not loaded";
    DataService.updateData(player, { coins: 0, kills: 0 });
    return "✅ Data reset (coins=0, kills=0)";
  },

  "data:fire_analytics": (player) => {
    const tracker = getEventTracker();
    tracker.track("test_park.action", player.UserId, { source: "test_park" });
    return "✅ Analytics event 'test_park.action' fired";
  },

  "data:test_violation": (player) => {
    reportViolation(player, "suspicious-pattern", "low", "Test violation from test park", {
      source: "test_park",
    });
    return "✅ Test violation reported (category: suspicious-pattern, severity: low)";
  },

  // ── Audio & Localization ────────────────────────────────────────────
  "audio:play_sfx": () => {
    const mgr = getAudioManager();
    mgr.play("click");
    return "✅ Played 'click' SFX";
  },

  "audio:stop_all": () => {
    const mgr = getAudioManager();
    mgr.stopEverything();
    return "✅ Stopped all audio";
  },

  "audio:switch_lang": () => {
    const i18n = getI18n();
    const current = i18n.getLocale();
    const newLocale = current === "en" ? "es" : "en";
    i18n.setLocale(newLocale);
    return `✅ Locale switched: ${current} → ${newLocale}`;
  },

  // ── Leaderboards ────────────────────────────────────────────────────
  "leaderboards:submit_score": (player) => {
    const store = getLeaderboardStore();
    const score = math.random(100, 10000);
    const result = store.submitScore("kills", player.UserId, player.Name, score);
    return `✅ Submitted score ${score} to 'kills' → ${result.status}`;
  },

  "leaderboards:read_top": () => {
    const store = getLeaderboardStore();
    const result = store.getTopEntries("kills", "alltime", 10);
    if (result.entries.size() === 0) return "Leaderboard empty";
    const lines = result.entries.map(
      (e: { playerName: string; score: number }, i: number) =>
        `  #${i + 1} ${e.playerName}: ${e.score}`
    );
    return `Top 10 (kills):\n${lines.join("\n")}`;
  },

  // ── Tutorial & Movement ─────────────────────────────────────────────
  "tutorial:start": (player) => {
    const mgr = getTutorialManager(player.UserId);
    if (!mgr) return "❌ Tutorial not loaded";
    const result = mgr.startSequence("ftue_basics");
    return result.ok ? "✅ Started ftue_basics tutorial" : `❌ ${result.status}`;
  },

  "tutorial:complete": (player) => {
    const mgr = getTutorialManager(player.UserId);
    if (!mgr) return "❌ Tutorial not loaded";
    const result = mgr.skipSequence();
    return result.ok ? "✅ Sequence skipped/completed" : `❌ ${result.status}`;
  },

  "tutorial:print_status": (player) => {
    const mgr = getTutorialManager(player.UserId);
    if (!mgr) return "❌ Tutorial not loaded";
    const reg = getSequenceRegistry();
    const sequences = reg.getAll();
    const lines = sequences.map((s: { id: string }) => {
      const completed = mgr.isCompleted(s.id);
      return `  ${s.id}: ${completed ? "✅ done" : "⬜ pending"}`;
    });
    return `Tutorial Status:\n${lines.join("\n")}`;
  },
};

// =========================================================================
// Zone Builder Helpers
// =========================================================================

const PLATFORM_HEIGHT = 1;
const SIGN_HEIGHT = 10;

function dirToCenter(x: number, z: number): Vector3 {
  const len = math.sqrt(x * x + z * z);
  if (len < 0.01) return new Vector3(0, 0, -1);
  return new Vector3(-x / len, 0, -z / len);
}

function createPlatform(zone: ZoneConfig, x: number, z: number, folder: Folder): void {
  const platform = new Instance("Part");
  platform.Name = "Platform";
  platform.Size = new Vector3(ZONE_PLATFORM_SIZE, PLATFORM_HEIGHT, ZONE_PLATFORM_SIZE);
  const pos = new Vector3(x, PLATFORM_HEIGHT / 2, z);
  const toCenter = dirToCenter(x, z);
  platform.CFrame = CFrame.lookAt(pos, pos.add(toCenter));
  platform.Anchored = true;
  platform.Color = new Color3(zone.color[0], zone.color[1], zone.color[2]);
  platform.Material = Enum.Material.SmoothPlastic;
  platform.TopSurface = Enum.SurfaceType.Smooth;
  platform.BottomSurface = Enum.SurfaceType.Smooth;
  platform.Parent = folder;
}

function createSign(zone: ZoneConfig, x: number, z: number, folder: Folder): void {
  const toCenter = dirToCenter(x, z);
  const signPos = new Vector3(
    x - toCenter.X * (ZONE_PLATFORM_SIZE / 2 - 2),
    SIGN_HEIGHT / 2 + PLATFORM_HEIGHT,
    z - toCenter.Z * (ZONE_PLATFORM_SIZE / 2 - 2)
  );
  const lookTarget = signPos.add(toCenter);

  const sign = new Instance("Part");
  sign.Name = "Sign";
  sign.Size = new Vector3(ZONE_PLATFORM_SIZE - 6, SIGN_HEIGHT, 1);
  sign.CFrame = CFrame.lookAt(signPos, lookTarget);
  sign.Anchored = true;
  sign.Color = new Color3(zone.color[0] * 0.6, zone.color[1] * 0.6, zone.color[2] * 0.6);
  sign.Material = Enum.Material.SmoothPlastic;
  sign.CanCollide = false;
  sign.Parent = folder;

  const gui = new Instance("SurfaceGui");
  gui.Name = "SignGui";
  gui.Face = Enum.NormalId.Front;
  gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud;
  gui.PixelsPerStud = 50;
  gui.Parent = sign;

  const title = new Instance("TextLabel");
  title.Name = "Title";
  title.Size = new UDim2(1, 0, 0.35, 0);
  title.Position = new UDim2(0, 0, 0.05, 0);
  title.BackgroundTransparency = 1;
  title.TextColor3 = new Color3(1, 1, 1);
  title.TextScaled = true;
  title.Font = Enum.Font.GothamBold;
  title.Text = zone.label;
  title.Parent = gui;

  const desc = new Instance("TextLabel");
  desc.Name = "Description";
  desc.Size = new UDim2(0.9, 0, 0.5, 0);
  desc.Position = new UDim2(0.05, 0, 0.4, 0);
  desc.BackgroundTransparency = 1;
  desc.TextColor3 = new Color3(0.85, 0.85, 0.85);
  desc.TextScaled = true;
  desc.Font = Enum.Font.Gotham;
  desc.Text = zone.description;
  desc.TextWrapped = true;
  desc.Parent = gui;
}

function createActionOrbs(zone: ZoneConfig, x: number, z: number, folder: Folder): void {
  const toCenter = dirToCenter(x, z);
  const right = toCenter.Cross(new Vector3(0, 1, 0)).Unit;

  // Place orbs in the front half of the platform (toward center)
  const orbBaseX = x + toCenter.X * (ZONE_PLATFORM_SIZE / 5);
  const orbBaseZ = z + toCenter.Z * (ZONE_PLATFORM_SIZE / 5);

  const actions = zone.actions;
  const count = actions.size();

  for (let i = 0; i < count; i++) {
    const action = actions[i];
    const offset = (i - (count - 1) / 2) * ZONE_PROMPT_SPACING;

    const orbX = orbBaseX + right.X * offset;
    const orbZ = orbBaseZ + right.Z * offset;

    // Glowing orb
    const orb = new Instance("Part");
    orb.Name = `Orb_${action.id}`;
    orb.Size = new Vector3(3, 3, 3);
    orb.Position = new Vector3(orbX, PLATFORM_HEIGHT + 2.5, orbZ);
    orb.Anchored = true;
    orb.CanCollide = false;
    orb.Shape = Enum.PartType.Ball;
    orb.Color = new Color3(zone.color[0], zone.color[1], zone.color[2]);
    orb.Material = Enum.Material.Neon;
    orb.Parent = folder;

    // Floating label
    const billboard = new Instance("BillboardGui");
    billboard.Name = "Label";
    billboard.Size = new UDim2(0, 220, 0, 60);
    billboard.StudsOffset = new Vector3(0, 3.5, 0);
    billboard.AlwaysOnTop = true;
    billboard.Parent = orb;

    const label = new Instance("TextLabel");
    label.Size = new UDim2(1, 0, 0.55, 0);
    label.Position = new UDim2(0, 0, 0, 0);
    label.BackgroundTransparency = 1;
    label.TextColor3 = new Color3(1, 1, 1);
    label.TextStrokeTransparency = 0.4;
    label.TextScaled = true;
    label.Font = Enum.Font.GothamMedium;
    label.Text = action.label;
    label.Parent = billboard;

    const subLabel = new Instance("TextLabel");
    subLabel.Size = new UDim2(1, 0, 0.4, 0);
    subLabel.Position = new UDim2(0, 0, 0.58, 0);
    subLabel.BackgroundTransparency = 1;
    subLabel.TextColor3 = new Color3(0.75, 0.75, 0.75);
    subLabel.TextStrokeTransparency = 0.6;
    subLabel.TextScaled = true;
    subLabel.Font = Enum.Font.Gotham;
    subLabel.Text = action.description;
    subLabel.Parent = billboard;

    // ProximityPrompt
    const prompt = new Instance("ProximityPrompt");
    prompt.ActionText = action.label;
    prompt.ObjectText = zone.label;
    prompt.HoldDuration = 0.3;
    prompt.MaxActivationDistance = 10;
    prompt.RequiresLineOfSight = false;
    prompt.Parent = orb;

    // Wire handler
    prompt.Triggered.Connect((triggerPlayer) => {
      const handler = ACTION_HANDLERS[action.id];
      let result: string;
      let success: boolean;

      if (handler) {
        const [ok, out] = pcall(() => handler(triggerPlayer));
        if (ok) {
          result = out;
          success = !out.sub(1, 1).match("❌")[0];
        } else {
          result = `💥 Error: ${tostring(out)}`;
          success = false;
        }
      } else {
        result = `⚠️ No handler for "${action.id}" — add one in TestParkService.ts`;
        success = false;
      }

      logger.info(`[${zone.id}] ${triggerPlayer.Name} → ${action.id}: ${result}`);

      // Send result to triggering client
      RemoteService.getRegistry().fireClient("TestPark_ActionResult", triggerPlayer, {
        actionId: action.id,
        result,
        success,
      });
    });
  }
}

// =========================================================================
// Teleport Handler
// =========================================================================

function teleportPlayerToZone(player: Player, zoneId: string): void {
  const total = ZONE_REGISTRY.size();
  for (let i = 0; i < total; i++) {
    if (ZONE_REGISTRY[i].id === zoneId) {
      const [zx, zz] = getZonePosition(i, total);
      const character = player.Character;
      if (character) {
        character.PivotTo(new CFrame(zx, PLATFORM_HEIGHT + 5, zz));
        logger.info(`Teleported ${player.Name} to zone "${zoneId}"`);
      }
      return;
    }
  }
  logger.warn(`Zone "${zoneId}" not found in registry`);
}

// =========================================================================
// Validation: warn about missing handlers at startup
// =========================================================================

function validateHandlers(): void {
  let missing = 0;
  for (const zone of ZONE_REGISTRY) {
    for (const action of zone.actions) {
      if (ACTION_HANDLERS[action.id] === undefined) {
        logger.warn(`⚠️  Missing handler: "${action.id}" (zone: ${zone.label})`);
        missing++;
      }
    }
  }
  if (missing > 0) {
    logger.warn(`${missing} action handler(s) missing — prompts will show a warning on trigger`);
  }

  // Count totals
  const totalActions = ZONE_REGISTRY.reduce((sum, z) => sum + z.actions.size(), 0);
  const totalHandlers = totalActions - missing;
  logger.info(
    `Zones: ${ZONE_REGISTRY.size()} | Actions: ${totalActions} | Handlers: ${totalHandlers}`
  );
}

// =========================================================================
// Service
// =========================================================================

const parkFolder = new Instance("Folder");
parkFolder.Name = "TestPark";

export const TestParkService: Service = {
  onInit() {
    logger.info(`Building test park — ${ZONE_REGISTRY.size()} zones...`);

    const total = ZONE_REGISTRY.size();

    for (let i = 0; i < total; i++) {
      const zone = ZONE_REGISTRY[i];
      const [zx, zz] = getZonePosition(i, total);

      const zoneFolder = new Instance("Folder");
      zoneFolder.Name = `Zone_${zone.id}`;
      zoneFolder.Parent = parkFolder;

      createPlatform(zone, zx, zz, zoneFolder);
      createSign(zone, zx, zz, zoneFolder);
      createActionOrbs(zone, zx, zz, zoneFolder);

      logger.debug(
        `  Built "${zone.label}" at (${math.round(zx)}, ${math.round(zz)}) — ${zone.actions.size()} actions`
      );
    }

    parkFolder.Parent = Workspace;
    logger.info("Test park geometry ready.");
  },

  onStart() {
    validateHandlers();

    // Register teleport handler
    const registry = RemoteService.getRegistry();
    registry.onEvent("TestPark_Teleport", (player, request) => {
      teleportPlayerToZone(player, request.zoneId);
    });

    logger.info("Test park active.");
  },
};

/** Get the world position of a zone by ID (for external use). */
export function getZoneWorldPosition(zoneId: string): Vector3 | undefined {
  const total = ZONE_REGISTRY.size();
  for (let i = 0; i < total; i++) {
    if (ZONE_REGISTRY[i].id === zoneId) {
      const [zx, zz] = getZonePosition(i, total);
      return new Vector3(zx, PLATFORM_HEIGHT + 5, zz);
    }
  }
  return undefined;
}
