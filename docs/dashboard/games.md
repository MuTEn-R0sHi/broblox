# Dashboard: Game Registry

The dashboard is a **multi-game control plane**. Before you can scope feature flags, moderation
actions, or audit events to a specific Roblox experience, you must register it in the Game registry.

---

## Concepts

### What is a registered game?

A registered game is a record in the dashboard database that maps a friendly name and slug to one or
more Roblox universe IDs and place IDs — one set per environment (dev, stage, prod).

Once registered, all game-aware resources (flags, bans, mutes, matches, audit logs) can be linked to
a specific game via its `gameId` foreign key.

### Global vs game-scoped flags

Feature flags can be:

| Type       | `gameId` field | Behaviour                                                      |
| ---------- | -------------- | -------------------------------------------------------------- |
| **Global** | `null`         | Returned for every game that calls the flags endpoint          |
| **Scoped** | set            | Returned only when the caller identifies using that game's IDs |

When the flags endpoint receives `?universeId=` or `?gameId=`, it merges global flags with the
game's own flags. **Game-scoped flags shadow global flags** on key conflict — giving you per-game
overrides without duplicating every flag.

---

## Registering a game

Navigate to **Dashboard → Games → New Game**.

| Field         | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| `Name`        | Human-readable display name (e.g. "Starter Combat")           |
| `Slug`        | URL-safe identifier used in API calls (e.g. `starter-combat`) |
| `Description` | Optional description shown in the games list                  |
| `Icon URL`    | Optional image URL for the games list card                    |
| `Universe ID` | Roblox universe ID per environment (dev / stage / prod)       |
| `Place ID`    | Roblox starting place ID per environment (dev / stage / prod) |

> **Why separate per-environment IDs?**  
> Most studios have three separate Roblox universes — a dev sandbox, a stage canary, and the live
> production universe. The dashboard uses these IDs to route Open Cloud API calls and to let
> game servers identify themselves when fetching flags.

---

## Permissions

| Permission     | Who has it      | What it allows                                        |
| -------------- | --------------- | ----------------------------------------------------- |
| `games:view`   | ENGINEER, ADMIN | List and view game details                            |
| `games:create` | ENGINEER, ADMIN | Register a new game                                   |
| `games:manage` | ENGINEER, ADMIN | Edit an existing game's name, IDs, active status      |
| `games:delete` | ADMIN only      | Permanently delete a game and cascade-remove its data |

---

## Fetching flags from a game server

Game servers should pass the Roblox universe ID when fetching flags so the dashboard can resolve the
correct game and merge global + per-game flags automatically.

```lua
local HttpService = game:GetService("HttpService")

local DASHBOARD_URL = "https://dashboard.broblox-games.com"
local FLAGS_API_KEY  = "your-optional-api-key"

local function fetchFlags(environment: string): { [string]: boolean }
    local universeId = game.GameId  -- Roblox built-in
    local url = DASHBOARD_URL
        .. "/api/flags/" .. environment
        .. "?universeId=" .. tostring(universeId)

    local ok, result = pcall(function()
        return HttpService:RequestAsync({
            Url     = url,
            Method  = "GET",
            Headers = { ["x-api-key"] = FLAGS_API_KEY },
        })
    end)

    if ok and result.Success then
        local body = HttpService:JSONDecode(result.Body)
        return body.flags or {}
    end

    return {} -- fall back to local defaults on failure
end
```

Using `universeId` instead of `gameId` means the game server never needs to know its own dashboard
record ID — only the Roblox universe ID that is already available as `game.GameId`.

---

## Game detail page

Each registered game has a detail page at `/games/:id` showing:

- Roblox IDs per environment (copy-to-clipboard)
- Aggregated stats (flags, bans, matches)
- Quick links to scoped views:
  - `/flags?gameId=…` — flags for this game
  - `/matches?gameId=…` — match history for this game
  - `/moderation/bans?gameId=…` — bans for this game
  - `/audit?gameId=…` — audit log scoped to this game

---

## Audit trail

Every game CRUD action is recorded:

| Action        | Description                          |
| ------------- | ------------------------------------ |
| `game.create` | Game registered (after: name + slug) |
| `game.update` | Game metadata changed (before/after) |
| `game.delete` | Game permanently removed             |

---

## Deactivating vs deleting a game

Use **Deactivate** (`isActive = false`) when a game has been sunset but you want to keep its
historical data (flags, bans, audit logs). Deactivated games are hidden from the default list.

Use **Delete** when you want to permanently remove a game and all associated records from the
database. This is irreversible and requires the `games:delete` permission (ADMIN only).
