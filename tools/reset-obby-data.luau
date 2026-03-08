--[[
  Reset Obby Player Data — Studio Command Bar Script

  Wipes ALL DataStore keys for a player so you can test
  from a completely fresh state (tutorial, daily rewards, quests, etc.).

  HOW TO USE:
    1. Open the obby game in Roblox Studio
    2. Make sure you are NOT in a Play Solo session (STOP it first)
    3. Open View → Command Bar
    4. Paste this entire script into the Command Bar and press Enter
    5. Start a new Play Solo — you will have a clean slate

  The Command Bar must run in edit mode (not during Play Solo)
  because DataStoreService is server-only and the Command Bar
  runs as client during Play Solo sessions.

  NOTE: If Studio API access is enabled (Game Settings → Security),
  this removes data from the REAL cloud DataStore. Use with caution
  outside of dev environments.
]]

local DSS = game:GetService("DataStoreService")

-- ⚠️ SET YOUR USER ID HERE (find it at https://www.roblox.com/users/YOUR_ID/profile)
local userId = 0 -- CHANGE THIS before running!
assert(userId ~= 0, "[ResetData] You must set 'userId' to your real UserId before running this script.")

print(string.format("[ResetData] Wiping ALL obby data for UserId: %d ...", userId))

-- Every DataStore + key used by the obby game
local stores = {
	-- Core player data (PlayerDataStore key format: player_{userId})
	{ store = "obby_player_data",   key = "player_" .. userId },

	-- Package stores (key format: {prefix}{userId})
	{ store = "ObbyProgression",    key = "progression_" .. userId },
	{ store = "ObbyQuests",         key = "quests_" .. userId },
	{ store = "ObbyDailyRewards",   key = "daily_" .. userId },
	{ store = "ObbyAchievements",   key = "achievements_" .. userId },
	{ store = "ObbyBattlePass",     key = "bp_" .. userId },
	{ store = "ObbyTutorial",       key = "tutorial_" .. userId },
	{ store = "ObbyInventory",      key = "inventory_" .. userId },
	{ store = "ObbyPets",           key = "pets_" .. userId },
	{ store = "ObbyGacha",          key = "gacha_" .. userId },
	{ store = "ObbyCosmetics",      key = "cosmetics_" .. userId },
	{ store = "ObbyCodes",          key = "codes_" .. userId },
	{ store = "ObbyAnalytics",      key = "ret_" .. userId },

	-- Moderation stores (BanStore/MuteStore append _Bans/_Mutes suffix)
	{ store = "ObbyModeration_Bans",  key = "bans_" .. userId },
	{ store = "ObbyModeration_Mutes", key = "mutes_" .. userId },
}

local wiped = 0
local failed = 0

for _, entry in ipairs(stores) do
	local ok, result = pcall(function()
		local ds = DSS:GetDataStore(entry.store)
		ds:RemoveAsync(entry.key)
	end)

	if ok then
		wiped += 1
		print(string.format("  ✓ %s → %s", entry.store, entry.key))
	else
		failed += 1
		-- 404/not-found is fine — means no data existed
		if string.find(tostring(result), "not found") or string.find(tostring(result), "404") then
			print(string.format("  ~ %s → %s (no data)", entry.store, entry.key))
			wiped += 1
			failed -= 1
		else
			warn(string.format("  ✗ %s → %s: %s", entry.store, entry.key, tostring(result)))
		end
	end
end

print(string.format("\n[ResetData] Done! Wiped: %d, Failed: %d", wiped, failed))
print("[ResetData] STOP the Play session and restart to test with fresh data.")
