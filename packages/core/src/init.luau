-- Compiled with roblox-ts v3.0.0
--[[
	*
	 * @rbx/core
	 * Core utilities for the platform.
	 * Compatible with roblox-ts.
	 
]]
-- Logger
local LoggerImpl
do
	LoggerImpl = setmetatable({}, {
		__tostring = function()
			return "LoggerImpl"
		end,
	})
	LoggerImpl.__index = LoggerImpl
	function LoggerImpl.new(...)
		local self = setmetatable({}, LoggerImpl)
		return self:constructor(...) or self
	end
	function LoggerImpl:constructor(name)
		self.prefix = `[{name}]`
	end
	function LoggerImpl:debug(message)
		print(`{self.prefix} [DEBUG] {message}`)
	end
	function LoggerImpl:info(message)
		print(`{self.prefix} [INFO] {message}`)
	end
	function LoggerImpl:warn(message)
		warn(`{self.prefix} [WARN] {message}`)
	end
	function LoggerImpl:error(message)
		warn(`{self.prefix} [ERROR] {message}`)
	end
end
local function createLogger(name)
	return LoggerImpl.new(name)
end
-- Janitor (cleanup utility)
local Janitor
do
	Janitor = setmetatable({}, {
		__tostring = function()
			return "Janitor"
		end,
	})
	Janitor.__index = Janitor
	function Janitor.new(...)
		local self = setmetatable({}, Janitor)
		return self:constructor(...) or self
	end
	function Janitor:constructor()
		self.tasks = {}
	end
	function Janitor:add(task)
		local _tasks = self.tasks
		local _task = task
		table.insert(_tasks, _task)
	end
	function Janitor:addConnection(connection)
		self:add(function()
			return connection:Disconnect()
		end)
	end
	function Janitor:addInstance(instance)
		self:add(function()
			return instance:Destroy()
		end)
	end
	function Janitor:cleanup()
		for _, task in self.tasks do
			pcall(task)
		end
		self.tasks = {}
	end
	function Janitor:destroy()
		self:cleanup()
	end
end
-- Clock
local Clock = {
	now = function(self)
		return os.clock()
	end,
	timestamp = function(self)
		return os.time()
	end,
}
return {
	createLogger = createLogger,
	Janitor = Janitor,
	Clock = Clock,
}
