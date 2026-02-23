# @rbx/config-featureflags

Feature flags, kill-switches, segments, scheduling, and rollout history
for Roblox games on the BroBlox platform.

## Features

- **Typed flag definitions** — `defineFlag()` at module load; boolean, number
  and string values with category metadata
- **Percentage-based rollouts** — deterministic user-bucketing via
  `isFlagEnabledForUser()`
- **Kill switches** — `triggerKillSwitch()` / `setFlagKilled()` forces boolean
  flags off instantly
- **Override system** — value overrides, enabled overrides, rollout percentage
  overrides for testing and debugging
- **Change listeners** — `onFlagChange()` subscribes to value mutations
- **Remote snapshots** — `applyRemoteFeatureFlagSnapshot()` bulk-applies
  overrides from the dashboard via DataStore / MessagingService
- **Segments** — target rollouts to specific user-ID lists and/or user
  attribute predicates
- **Scheduling** — time-windowed activation (`startTime` / `endTime`)
- **Rollout history** — in-memory audit log of every flag change (capped at 500)

## Installation

```bash
pnpm add @rbx/config-featureflags
```

## Quick Start

### Define a flag

```typescript
import { defineFlag, isFlagEnabled, isFlagEnabledForUser } from "@rbx/config-featureflags";

defineFlag({
  name: "experiment.newUI",
  defaultValue: false,
  description: "Enable the redesigned lobby UI",
  category: "experiment",
  rolloutPercentage: 25, // 25 % of users
});
```

### Check if a flag is on

```typescript
if (isFlagEnabled("doAction.enabled")) {
  // feature is enabled globally
}
```

### Per-user rollout

```typescript
if (isFlagEnabledForUser("experiment.newUI", player.UserId)) {
  // only enabled for ~25 % of users
}
```

### Kill switch

```typescript
import { triggerKillSwitch, setFlagKilled } from "@rbx/config-featureflags";

triggerKillSwitch("doAction.enabled"); // force off
setFlagKilled("doAction.enabled", false); // restore
```

## Segments

Segments restrict a rollout to a subset of users. When segments are
defined on a flag, only users matching **at least one** segment pass
through to the rollout-percentage check; everyone else gets the
flag's default value.

```typescript
import { setFlagSegments, setUserAttribute, clearUserAttributes } from "@rbx/config-featureflags";

// Target by user ID list
setFlagSegments("experiment.newUI", [{ name: "beta-testers", userIds: [100, 200, 300] }]);

// Target by user attribute
setFlagSegments("experiment.newUI", [
  { name: "en-locale", attribute: { key: "locale", value: "en" } },
]);

// Set attributes (e.g. on PlayerAdded)
setUserAttribute(player.UserId, "locale", "en");
// Clean up on disconnect
clearUserAttributes(player.UserId);
```

## Scheduling

Time-window flag overrides. When the current time is **outside** the
window, all overrides are skipped and the flag's definition default is
returned.

```typescript
import { setFlagSchedule, clearFlagSchedule } from "@rbx/config-featureflags";

// Enable between two timestamps (seconds, Unix epoch or os.clock)
setFlagSchedule("event.doubleXP", {
  startTime: 1738800000, // 2025-02-06 00:00 UTC
  endTime: 1739404800, // 2025-02-13 00:00 UTC
});
```

## Rollout History

Every flag change is recorded in an in-memory audit log (capped at 500
entries). Each record includes the flag name, old/new values, source
(`local` | `remote` | `kill-switch` | `schedule`), and a timestamp.

```typescript
import { getRolloutHistory, getFlagHistory, clearRolloutHistory } from "@rbx/config-featureflags";

const all = getRolloutHistory(); // all entries, oldest first
const specific = getFlagHistory("doAction.enabled"); // filtered
clearRolloutHistory(); // reset
```

## Remote Sync

`sync.ts` provides DataStore + MessagingService integration for
dashboard-propagated flag overrides:

```typescript
import { initFeatureFlagSync } from "@rbx/config-featureflags/out/sync";

initFeatureFlagSync({
  environment: "production",
  datastoreName: "GameFeatureFlags",
  topic: "FeatureFlagsSync",
  entryKeyPrefix: "featureflags_",
});
```

On init the service reads the DataStore entry, applies the snapshot, and
subscribes to MessagingService for live invalidation.

### Snapshot format

```typescript
{
  updatedAt: number;
  flags: {
    [name: string]: {
      enabled?: boolean;
      rolloutPercentage?: number;
      isKilled?: boolean;
      value?: FlagValue;
      segments?: FlagSegment[];
      schedule?: FlagSchedule;
    };
  };
}
```

## Default Platform Flags

| Flag                          | Default | Category   | Kill-switch | Rollout % |
| ----------------------------- | ------- | ---------- | ----------- | --------- |
| `doAction.enabled`            | `true`  | gameplay   | yes         | —         |
| `movement.validation.enabled` | `true`  | security   | yes         | —         |
| `debug.verboseLogging`        | `false` | debug      | no          | —         |
| `debug.showDevUI`             | `false` | debug      | no          | —         |
| `experiment.newMatchmaking`   | `false` | experiment | no          | 0         |

## Architecture

```
@rbx/config-featureflags
├── index.ts      - Flag engine: types, registry, overrides, segments,
│                   scheduling, history, listeners
├── sync.ts       - DataStore + MessagingService sync service
└── index.test.ts - 53 unit tests against the real API
```

## API Reference

### Types

| Type                        | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `FlagValue`                 | `boolean \| number \| string`                                                              |
| `FlagDefinition<T>`         | Flag metadata (name, default, category, rollout %, kill-switch, segments, schedule)        |
| `FlagCategory`              | `"gameplay" \| "networking" \| "economy" \| "ui" \| "security" \| "debug" \| "experiment"` |
| `FlagSegment`               | Segment rule: `name`, optional `userIds[]`, optional `attribute { key, value }`            |
| `FlagSchedule`              | Time window: optional `startTime`, optional `endTime` (seconds)                            |
| `FlagChangeRecord`          | Audit entry: `flagName`, `newValue`, `oldValue`, `source`, `timestamp`                     |
| `FlagChangeListener`        | `(name, newValue, oldValue) => void`                                                       |
| `RemoteBooleanFlagOverride` | Per-flag override from a remote snapshot                                                   |
| `RemoteFeatureFlagSnapshot` | Full snapshot (`updatedAt`, `flags`)                                                       |

### Functions

| Function                                      | Description                                          |
| --------------------------------------------- | ---------------------------------------------------- |
| `defineFlag(def)`                             | Register a flag definition at module load            |
| `getFlagDefinition(name)`                     | Get flag definition                                  |
| `getAllFlagDefinitions()`                     | Get all definitions                                  |
| `getFlagsByCategory(cat)`                     | Filter by category                                   |
| `getFlagValue<T>(name)`                       | Resolved value (override > kill > enabled > default) |
| `getFlagValueOr<T>(name, fallback)`           | With fallback                                        |
| `setFlagValue(name, value)`                   | Set override                                         |
| `clearFlagOverride(name)`                     | Clear single override                                |
| `clearAllOverrides()`                         | Clear everything                                     |
| `isFlagEnabled(name)`                         | Boolean convenience (schedule-aware)                 |
| `isFlagEnabledForUser(name, userId)`          | Percentage + segment + schedule check                |
| `getKillSwitches()`                           | All kill-switch definitions                          |
| `triggerKillSwitch(name)`                     | Force kill-switch flag off                           |
| `setFlagKilled(name, killed)`                 | Set/clear killed state                               |
| `setFlagEnabledOverride(name, enabled)`       | Boolean enabled override                             |
| `clearFlagEnabledOverride(name)`              | Clear enabled override                               |
| `setFlagRolloutPercentageOverride(name, pct)` | Override rollout %                                   |
| `clearFlagRolloutPercentageOverride(name)`    | Clear rollout override                               |
| `applyRemoteFeatureFlagSnapshot(snap)`        | Bulk-apply remote overrides                          |
| `onFlagChange(listener)`                      | Subscribe; returns unsubscribe                       |
| `setUserAttribute(userId, key, value)`        | Set segment attribute                                |
| `getUserAttribute(userId, key)`               | Get attribute                                        |
| `clearUserAttributes(userId)`                 | Clear user attributes                                |
| `setFlagSegments(name, segments)`             | Set segment overrides                                |
| `clearFlagSegments(name)`                     | Clear segments                                       |
| `setFlagSchedule(name, schedule)`             | Set schedule override                                |
| `clearFlagSchedule(name)`                     | Clear schedule                                       |
| `getRolloutHistory()`                         | Full audit log                                       |
| `getFlagHistory(name)`                        | Filtered audit log                                   |
| `clearRolloutHistory()`                       | Reset audit log                                      |
