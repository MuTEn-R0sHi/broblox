# @rbx/config-featureflags

Feature flags and kill-switch support for runtime configuration.

## Purpose

This package provides a simple feature flag system for:

- **Gradual rollouts** - Enable features for subset of players
- **Kill switches** - Disable features instantly without deployment
- **A/B testing** - Variant testing
- **Emergency control** - Quick response to issues

## Dependencies

- `@rbx/core` - For logging utilities

## Current Status

⚠️ **MVP Implementation** - Currently a simple in-memory Map. Future versions will support:

- Remote configuration (DataStore/MemoryStore)
- Per-player overrides
- Percentage-based rollouts
- Flag change auditing

## API Reference

### Flag Management

```typescript
import { isFlagEnabled, getFlagValue, setFlagValue } from "@rbx/config-featureflags";

// Boolean flags
if (isFlagEnabled("doAction.enabled")) {
  // Feature is enabled
}

// Get typed flag value
const maxRetries = getFlagValue<number>("network.maxRetries");
const timeout = getFlagValue<number>("network.timeoutMs");

// Set flag value (server-only)
setFlagValue("doAction.enabled", false); // Kill switch
setFlagValue("matchmaking.minPlayers", 6);
```

### Types

```typescript
type FlagValue = boolean | number | string;

interface FlagDefinition<T extends FlagValue> {
  defaultValue: T;
  description?: string;
}
```

## Default Flags

Currently defined flags:

- `doAction.enabled: true` - Enable DoAction remote endpoint

## Usage Patterns

### Kill Switch

```typescript
// Server code
if (!isFlagEnabled("trading.enabled")) {
  return err(ErrorCode.FeatureDisabled, "Trading is temporarily disabled");
}
```

### Configuration Value

```typescript
const maxPartySize = getFlagValue<number>("matchmaking.maxPartySize") ?? 4;
```

### Feature Rollout (future)

```typescript
// Coming soon: percentage-based rollouts
if (isFeatureEnabledForPlayer("newUI.enabled", player.UserId)) {
  // Show new UI
}
```

## Architecture Notes

This package is configuration-focused and should remain lightweight. It may depend on `@rbx/core` for logging but should never depend on `@rbx/net`.

Future iterations will integrate with:

- Remote configuration system (pull from DataStore/API)
- Dashboard UI for flag management
- Audit logging for flag changes

See [docs/architecture/config-schema-and-validation.md](../../docs/architecture/config-schema-and-validation.md) for broader configuration strategy.

## Roadmap

- [ ] Remote configuration backend (DataStore)
- [ ] Per-player flag overrides
- [ ] Percentage-based rollouts
- [ ] Dashboard integration
- [ ] Flag change audit logs
- [ ] Type-safe flag registry with Zod/t (ADR-0005)
