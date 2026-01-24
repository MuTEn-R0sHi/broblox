-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local exports = {}
--[[
	*
	 * @rbx/constants
	 * Centralized configuration constants for the platform.
	 * This package has NO dependencies and must remain pure.
	 * Compatible with roblox-ts.
	 *
	 * Note: validation.ts contains Roblox-specific helpers (typeOf, math.*)
	 * and is only available in Roblox runtime. The numeric constants
	 * (timeouts, limits, build) are safe for Node.js testing.
	 
]]
-- Pure constants (safe for both Roblox and Node.js)
for _k, _v in TS.import(script, TS.getModule(script, "@rbx", "constants").src.timeouts) or {} do
	exports[_k] = _v
end
for _k, _v in TS.import(script, TS.getModule(script, "@rbx", "constants").src.limits) or {} do
	exports[_k] = _v
end
for _k, _v in TS.import(script, TS.getModule(script, "@rbx", "constants").src.build) or {} do
	exports[_k] = _v
end
return exports
