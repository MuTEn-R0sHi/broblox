-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * Build and version information.
	 * These should be updated by CI/CD or build scripts.
	 
]]
-- ============================================================================
-- Version Information
-- ============================================================================
--[[
	*
	 * Current build ID.
	 * Format: <game>-<semver>[-<commit>]
	 * Examples: "test-park-1.0.0", "test-park-1.0.0-abc123"
	 
]]
local BUILD_ID = "test-park-0.0.0"
--[[
	*
	 * Build timestamp (Unix seconds).
	 * Set during build process, defaults to 0 for development.
	 
]]
local BUILD_TIMESTAMP = 0
--[[
	*
	 * Git commit hash (short).
	 * Set during build process, empty in development.
	 
]]
local BUILD_COMMIT = ""
--[[
	*
	 * Build environment.
	 
]]
--[[
	*
	 * Current build environment.
	 * Determined by build configuration.
	 
]]
local BUILD_ENVIRONMENT = "development"
-- ============================================================================
-- Environment Checks
-- ============================================================================
--[[
	*
	 * Check if running in development mode.
	 
]]
local function isDevelopment()
	return BUILD_ENVIRONMENT == "development"
end
--[[
	*
	 * Check if running in staging mode.
	 
]]
local function isStaging()
	return BUILD_ENVIRONMENT == "staging"
end
--[[
	*
	 * Check if running in production mode.
	 
]]
local function isProduction()
	return BUILD_ENVIRONMENT == "production"
end
-- ============================================================================
-- Feature Detection
-- ============================================================================
--[[
	*
	 * Whether debug features are enabled.
	 * Only enabled in development/staging.
	 
]]
local function isDebugEnabled()
	return BUILD_ENVIRONMENT ~= "production"
end
--[[
	*
	 * Whether verbose logging is enabled.
	 
]]
local function isVerboseLoggingEnabled()
	return BUILD_ENVIRONMENT == "development"
end
return {
	isDevelopment = isDevelopment,
	isStaging = isStaging,
	isProduction = isProduction,
	isDebugEnabled = isDebugEnabled,
	isVerboseLoggingEnabled = isVerboseLoggingEnabled,
	BUILD_ID = BUILD_ID,
	BUILD_TIMESTAMP = BUILD_TIMESTAMP,
	BUILD_COMMIT = BUILD_COMMIT,
	BUILD_ENVIRONMENT = BUILD_ENVIRONMENT,
}
