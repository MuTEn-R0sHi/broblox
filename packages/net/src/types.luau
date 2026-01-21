-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * Local type definitions for @rbx/net
	 * These are inlined to avoid cross-package dependencies for roblox-ts compilation.
	 * The canonical definitions live in @rbx/shared-types.
	 
]]
-- ============================================================================
-- Error Codes (subset needed by net)
-- ============================================================================
local ErrorCode
do
	local _inverse = {}
	ErrorCode = setmetatable({}, {
		__index = _inverse,
	})
	ErrorCode.InvalidPayload = 1001
	_inverse[1001] = "InvalidPayload"
	ErrorCode.InvalidType = 1004
	_inverse[1004] = "InvalidType"
	ErrorCode.OutOfBounds = 1005
	_inverse[1005] = "OutOfBounds"
	ErrorCode.RateLimited = 2001
	_inverse[2001] = "RateLimited"
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
local err = function(code, message)
	return {
		ok = false,
		code = code,
		message = message,
	}
end
return {
	ErrorCode = ErrorCode,
	ok = ok,
	err = err,
}
