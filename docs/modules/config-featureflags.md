# Modules: Config & Feature Flags

Feature flags, kill-switches, and runtime configuration for the platform (`@broblox/config-featureflags`). **Status: Implemented**.

## Purpose

- Define typed feature flags with metadata, categories, and kill-switch classification.
- Percentage-based rollouts for gradual feature launches.
- User/group segment targeting for A/B tests and cohort experiments.
- Schedule-based activation windows for time-limited features.
- Override system for local testing and debugging.
- In-memory rollout history / audit log.
- Remote sync service to pull flag state from the dashboard.

## Public API

### Flag Definition & Registry

```typescript
import { defineFlag, getFlagDefinition, getAllFlagDefinitions } from "@broblox/config-featureflags";

defineFlag({
  name: "experiment.newMatchmaking",
  defaultValue: false,
  description: "Enable new matchmaking algorithm",
  category: "experiment",
  rolloutPercentage: 0,
});
```

### Flag Evaluation

```typescript
import { isFlagEnabled, getFlagValue, isFlagEnabledForUser } from "@broblox/config-featureflags";

if (isFlagEnabled("doAction.enabled")) {
  /* ... */
}
const value = getFlagValue("experiment.newMatchmaking");
```

### Kill-Switches

```typescript
import { triggerKillSwitch, getKillSwitches } from "@broblox/config-featureflags";

triggerKillSwitch("movement.validation.enabled"); // instantly disable
```

### Segments & Schedules

```typescript
import { setUserAttribute, setFlagSegments, setFlagSchedule } from "@broblox/config-featureflags";

setUserAttribute(player.UserId, "region", "US");
setFlagSegments("experiment.newMatchmaking", [{ attribute: "region", values: ["US"] }]);
```

### Remote Sync

```typescript
import { createFeatureFlagSyncService } from "@broblox/config-featureflags";

const handle = createFeatureFlagSyncService({ pollIntervalSeconds: 60 });
```

## Dependencies

- `@broblox/core` — Logger

## Testing

- Comprehensive test suite covering flag registration, evaluation, kill-switches, overrides, segments, schedules, rollout percentages, and history.
