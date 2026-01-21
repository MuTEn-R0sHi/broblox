-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * @rbx/config-featureflags
	 * Feature flags and kill-switch support.
	 * Compatible with roblox-ts.
	 
]]
-- Platform flags
local flags = {}
-- Default flag values
flags["doAction.enabled"] = true
local function getFlagValue(name)
	local _name = name
	return flags[_name]
end
local function setFlagValue(name, value)
	local _name = name
	local _value = value
	flags[_name] = _value
end
local function isFlagEnabled(name)
	local _name = name
	return flags[_name] == true
end
return {
	getFlagValue = getFlagValue,
	setFlagValue = setFlagValue,
	isFlagEnabled = isFlagEnabled,
}
