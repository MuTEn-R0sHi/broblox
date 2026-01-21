-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local exports = {}
--[[
	*
	 * @rbx/net
	 * Networking utilities for the platform.
	 * Compatible with roblox-ts.
	 
]]
local _types = TS.import(script, TS.getModule(script, "@rbx", "net").src.types)
local ErrorCode = _types.ErrorCode
local ok = _types.ok
local err = _types.err
-- Re-export types for consumers
local _types_1 = TS.import(script, TS.getModule(script, "@rbx", "net").src.types)
exports.ErrorCode = _types_1.ErrorCode
exports.ok = _types_1.ok
exports.err = _types_1.err
-- ============================================================================
-- Types
-- ============================================================================
-- ============================================================================
-- Validation
-- ============================================================================
local function validateDoActionPayload(value)
	local _value = value
	if typeof(_value) ~= "table" then
		return err(ErrorCode.InvalidType)
	end
	local obj = value
	local _actionId = obj.actionId
	if typeof(_actionId) ~= "string" then
		return err(ErrorCode.InvalidType)
	end
	local actionId = obj.actionId
	if #actionId < 1 or #actionId > 50 then
		return err(ErrorCode.OutOfBounds)
	end
	local _timestamp = obj.timestamp
	if typeof(_timestamp) ~= "number" then
		return err(ErrorCode.InvalidType)
	end
	return ok({
		actionId = actionId,
		timestamp = obj.timestamp,
	})
end
local function validateHandshakePayload(value)
	local _value = value
	if typeof(_value) ~= "table" then
		return err(ErrorCode.InvalidType)
	end
	local obj = value
	local _protocolVersion = obj.protocolVersion
	if typeof(_protocolVersion) ~= "number" then
		return err(ErrorCode.InvalidType)
	end
	local _buildId = obj.buildId
	if typeof(_buildId) ~= "string" then
		return err(ErrorCode.InvalidType)
	end
	local dc = obj.deviceClass
	if dc ~= "kbm" and dc ~= "gamepad" and dc ~= "touch" then
		return err(ErrorCode.InvalidPayload)
	end
	return ok({
		protocolVersion = obj.protocolVersion,
		buildId = obj.buildId,
		deviceClass = dc,
	})
end
-- ============================================================================
-- Rate Limiting
-- ============================================================================
local RateLimiter
do
	RateLimiter = setmetatable({}, {
		__tostring = function()
			return "RateLimiter"
		end,
	})
	RateLimiter.__index = RateLimiter
	function RateLimiter.new(...)
		local self = setmetatable({}, RateLimiter)
		return self:constructor(...) or self
	end
	function RateLimiter:constructor(config)
		self.buckets = {}
		self.config = config
	end
	function RateLimiter:check(playerId)
		local key = tostring(playerId)
		local now = os.clock() * 1000
		local bucket = self.buckets[key]
		if not bucket then
			bucket = {
				tokens = self.config.maxRequests,
				lastRefill = now,
			}
			local _buckets = self.buckets
			local _bucket = bucket
			_buckets[key] = _bucket
		else
			local elapsed = now - bucket.lastRefill
			local refillRate = self.config.maxRequests / self.config.windowMs
			local tokensToAdd = elapsed * refillRate
			bucket.tokens = math.min(self.config.maxRequests, bucket.tokens + tokensToAdd)
			bucket.lastRefill = now
		end
		if bucket.tokens < 1 then
			return err(ErrorCode.RateLimited)
		end
		bucket.tokens -= 1
		return ok({
			remaining = math.floor(bucket.tokens),
		})
	end
	function RateLimiter:reset(playerId)
		local _buckets = self.buckets
		local _arg0 = tostring(playerId)
		_buckets[_arg0] = nil
	end
end
-- ============================================================================
-- Remote Registry
-- ============================================================================
local REMOTES = {
	Handshake = {
		name = "Net_Handshake",
		rateLimit = {
			windowMs = 60000,
			maxRequests = 3,
		},
	},
	DoAction = {
		name = "Intent_DoAction",
		rateLimit = {
			windowMs = 1000,
			maxRequests = 5,
		},
	},
}
exports.validateDoActionPayload = validateDoActionPayload
exports.validateHandshakePayload = validateHandshakePayload
exports.RateLimiter = RateLimiter
exports.REMOTES = REMOTES
return exports
