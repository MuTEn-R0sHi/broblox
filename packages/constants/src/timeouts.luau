-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * Timeout constants in seconds/milliseconds.
	 * All timeouts should be defined here for consistency.
	 
]]
-- ============================================================================
-- Client-Side Timeouts
-- ============================================================================
--* How long to wait for remotes folder to appear (seconds) 
local REMOTES_WAIT_TIMEOUT_SECONDS = 30
--* Remote invocation timeout before giving up (milliseconds) 
local REMOTE_INVOKE_TIMEOUT_MS = 10000
--* Handshake retry delay on failure (milliseconds) 
local HANDSHAKE_RETRY_DELAY_MS = 2000
--* Maximum handshake retry attempts 
local HANDSHAKE_MAX_RETRIES = 3
-- ============================================================================
-- Server-Side Timeouts
-- ============================================================================
--* Session expiry time when player disconnects (seconds) 
local SESSION_EXPIRY_SECONDS = 300
--* Data save retry timeout (milliseconds) 
local DATA_SAVE_TIMEOUT_MS = 5000
--* How long BindToClose waits for saves (seconds) 
local SHUTDOWN_TIMEOUT_SECONDS = 30
-- ============================================================================
-- Cooldowns
-- ============================================================================
--* Default action cooldown (milliseconds) 
local DEFAULT_COOLDOWN_MS = 1000
--* Minimum allowed cooldown (milliseconds) 
local MIN_COOLDOWN_MS = 100
--* Maximum allowed cooldown (milliseconds) 
local MAX_COOLDOWN_MS = 60000
return {
	REMOTES_WAIT_TIMEOUT_SECONDS = REMOTES_WAIT_TIMEOUT_SECONDS,
	REMOTE_INVOKE_TIMEOUT_MS = REMOTE_INVOKE_TIMEOUT_MS,
	HANDSHAKE_RETRY_DELAY_MS = HANDSHAKE_RETRY_DELAY_MS,
	HANDSHAKE_MAX_RETRIES = HANDSHAKE_MAX_RETRIES,
	SESSION_EXPIRY_SECONDS = SESSION_EXPIRY_SECONDS,
	DATA_SAVE_TIMEOUT_MS = DATA_SAVE_TIMEOUT_MS,
	SHUTDOWN_TIMEOUT_SECONDS = SHUTDOWN_TIMEOUT_SECONDS,
	DEFAULT_COOLDOWN_MS = DEFAULT_COOLDOWN_MS,
	MIN_COOLDOWN_MS = MIN_COOLDOWN_MS,
	MAX_COOLDOWN_MS = MAX_COOLDOWN_MS,
}
