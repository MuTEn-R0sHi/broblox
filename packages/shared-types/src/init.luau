-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * @rbx/shared-types
	 * Core type definitions shared across the platform.
	 * This package has NO dependencies and must remain pure.
	 * Compatible with roblox-ts (noLib: true).
	 
]]
-- ============================================================================
-- Branded Types
-- ============================================================================
--[[
	*
	 * Brand a primitive type for type-safe IDs.
	 * Example: PlayerId is a number that can't be accidentally used as a MatchId.
	 
]]
--* Unique player identifier (Roblox UserId) 
--* Unique match/game session identifier 
--* Unique request identifier for idempotency 
--* Server/job identifier 
--* Session identifier 
-- Brand constructors (runtime no-op, compile-time safety)
local createPlayerId = function(id)
	return id
end
local createMatchId = function(id)
	return id
end
local createRequestId = function(id)
	return id
end
local createServerId = function(id)
	return id
end
local createSessionId = function(id)
	return id
end
-- ============================================================================
-- Protocol Version
-- ============================================================================
--[[
	*
	 * Protocol version for client-server compatibility.
	 * Increment on breaking changes (see ADR-0002).
	 
]]
local PROTOCOL_VERSION = 1
-- ============================================================================
-- Error Codes
-- ============================================================================
--[[
	*
	 * Stable error codes for remote responses.
	 * Never change existing codes; only add new ones.
	 
]]
local ErrorCode
do
	local _inverse = {}
	ErrorCode = setmetatable({}, {
		__index = _inverse,
	})
	ErrorCode.Unknown = 0
	_inverse[0] = "Unknown"
	ErrorCode.InvalidPayload = 1001
	_inverse[1001] = "InvalidPayload"
	ErrorCode.PayloadTooLarge = 1002
	_inverse[1002] = "PayloadTooLarge"
	ErrorCode.MissingField = 1003
	_inverse[1003] = "MissingField"
	ErrorCode.InvalidType = 1004
	_inverse[1004] = "InvalidType"
	ErrorCode.OutOfBounds = 1005
	_inverse[1005] = "OutOfBounds"
	ErrorCode.RateLimited = 2001
	_inverse[2001] = "RateLimited"
	ErrorCode.Cooldown = 2002
	_inverse[2002] = "Cooldown"
	ErrorCode.InvalidState = 2003
	_inverse[2003] = "InvalidState"
	ErrorCode.NotFound = 2004
	_inverse[2004] = "NotFound"
	ErrorCode.AlreadyExists = 2005
	_inverse[2005] = "AlreadyExists"
	ErrorCode.InsufficientResources = 2006
	_inverse[2006] = "InsufficientResources"
	ErrorCode.FeatureDisabled = 2007
	_inverse[2007] = "FeatureDisabled"
	ErrorCode.ProtocolMismatch = 3001
	_inverse[3001] = "ProtocolMismatch"
	ErrorCode.ClientOutdated = 3002
	_inverse[3002] = "ClientOutdated"
	ErrorCode.ServerOutdated = 3003
	_inverse[3003] = "ServerOutdated"
	ErrorCode.Unauthorized = 4001
	_inverse[4001] = "Unauthorized"
	ErrorCode.Forbidden = 4002
	_inverse[4002] = "Forbidden"
	ErrorCode.SessionExpired = 4003
	_inverse[4003] = "SessionExpired"
	ErrorCode.InternalError = 5001
	_inverse[5001] = "InternalError"
	ErrorCode.ServiceUnavailable = 5002
	_inverse[5002] = "ServiceUnavailable"
	ErrorCode.Timeout = 5003
	_inverse[5003] = "Timeout"
end
-- ============================================================================
-- Result Type
-- ============================================================================
local ok = function(value)
	return {
		ok = true,
		value = value,
	}
end
local err = function(code, options)
	local _object = {
		ok = false,
		code = code,
	}
	if options then
		for _k, _v in options do
			_object[_k] = _v
		end
	end
	return _object
end
local function isOk(result)
	return result.ok == true
end
local function isErr(result)
	return result.ok == false
end
local function unwrap(result)
	if isOk(result) then
		return result.value
	end
	error(`Unwrap failed: code {result.code}`)
end
local function unwrapOr(result, defaultValue)
	if isOk(result) then
		return result.value
	end
	return defaultValue
end
local function mapResult(result, fn)
	if isOk(result) then
		return ok(fn(result.value))
	end
	return result
end
local function flatMapResult(result, fn)
	if isOk(result) then
		return fn(result.value)
	end
	return result
end
-- ============================================================================
-- Device Classes
-- ============================================================================
-- ============================================================================
-- Common DTOs
-- ============================================================================
-- ============================================================================
-- Utility Types
-- ============================================================================
return {
	isOk = isOk,
	isErr = isErr,
	unwrap = unwrap,
	unwrapOr = unwrapOr,
	mapResult = mapResult,
	flatMapResult = flatMapResult,
	createPlayerId = createPlayerId,
	createMatchId = createMatchId,
	createRequestId = createRequestId,
	createServerId = createServerId,
	createSessionId = createSessionId,
	PROTOCOL_VERSION = PROTOCOL_VERSION,
	ErrorCode = ErrorCode,
	ok = ok,
	err = err,
}
