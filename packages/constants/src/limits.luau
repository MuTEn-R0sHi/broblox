-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * Numeric limits and bounds for validation.
	 * These constants define acceptable ranges for various values.
	 
]]
-- ============================================================================
-- Payload Size Limits
-- ============================================================================
--* Maximum string length for action IDs 
local ACTION_ID_MAX_LENGTH = 50
--* Minimum string length for action IDs 
local ACTION_ID_MIN_LENGTH = 1
--* Maximum string length for build IDs 
local BUILD_ID_MAX_LENGTH = 100
--* Maximum payload size in bytes (rough estimate) 
local MAX_PAYLOAD_SIZE_BYTES = 1024
-- ============================================================================
-- Timestamp Validation
-- ============================================================================
--[[
	*
	 * Maximum allowed timestamp drift from server time (milliseconds).
	 * Requests with timestamps outside this window are rejected.
	 
]]
local TIMESTAMP_TOLERANCE_MS = 5000
--[[
	*
	 * Maximum age of a timestamp in the past (milliseconds).
	 * Prevents replay attacks with old timestamps.
	 
]]
local TIMESTAMP_MAX_AGE_MS = 30000
-- ============================================================================
-- Vector Limits
-- ============================================================================
--* Maximum Vector3 magnitude for position updates 
local MAX_POSITION_MAGNITUDE = 10000
--* Maximum Vector3 magnitude for velocity 
local MAX_VELOCITY_MAGNITUDE = 1000
--* Maximum Vector3 magnitude for look direction (normalized = 1) 
local MAX_LOOK_DIRECTION_MAGNITUDE = 2
-- ============================================================================
-- Rate Limits
-- ============================================================================
--* Maximum concurrent connections per player 
local MAX_CONCURRENT_REQUESTS = 10
--* Maximum events per second per player (global) 
local MAX_EVENTS_PER_SECOND = 30
-- ============================================================================
-- Array/Collection Limits
-- ============================================================================
--* Maximum items in a batch request 
local MAX_BATCH_SIZE = 100
--* Maximum inventory items per player 
local MAX_INVENTORY_SIZE = 1000
--* Maximum friends in a request 
local MAX_FRIENDS_PER_REQUEST = 50
return {
	ACTION_ID_MAX_LENGTH = ACTION_ID_MAX_LENGTH,
	ACTION_ID_MIN_LENGTH = ACTION_ID_MIN_LENGTH,
	BUILD_ID_MAX_LENGTH = BUILD_ID_MAX_LENGTH,
	MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_BYTES,
	TIMESTAMP_TOLERANCE_MS = TIMESTAMP_TOLERANCE_MS,
	TIMESTAMP_MAX_AGE_MS = TIMESTAMP_MAX_AGE_MS,
	MAX_POSITION_MAGNITUDE = MAX_POSITION_MAGNITUDE,
	MAX_VELOCITY_MAGNITUDE = MAX_VELOCITY_MAGNITUDE,
	MAX_LOOK_DIRECTION_MAGNITUDE = MAX_LOOK_DIRECTION_MAGNITUDE,
	MAX_CONCURRENT_REQUESTS = MAX_CONCURRENT_REQUESTS,
	MAX_EVENTS_PER_SECOND = MAX_EVENTS_PER_SECOND,
	MAX_BATCH_SIZE = MAX_BATCH_SIZE,
	MAX_INVENTORY_SIZE = MAX_INVENTORY_SIZE,
	MAX_FRIENDS_PER_REQUEST = MAX_FRIENDS_PER_REQUEST,
}
