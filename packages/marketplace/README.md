# @broblox/marketplace

Roblox `MarketplaceService` wrapper — developer products, game passes, and idempotent purchase receipt validation.

## Overview

This package provides a thin, testable layer on top of Roblox's `MarketplaceService`, handling the three core monetization operations required before Phase 6 economy work can proceed:

| Concern            | Component                  | Description                                      |
| ------------------ | -------------------------- | ------------------------------------------------ |
| Developer products | `DeveloperProductRegistry` | Register products + grant handlers               |
| Game passes        | `GamePassCache`            | Ownership checks with TTL cache                  |
| Receipt safety     | `PurchaseValidator`        | Idempotent receipt processing (no double-grants) |
| Wiring             | `createMarketplaceService` | Factory that composes all three into a `Service` |

## Quick Start

```ts
import { createMarketplaceService } from "@broblox/marketplace";

const mps = game.GetService("MarketplaceService");

const handle = createMarketplaceService({
  products: [{ productId: 12345, name: "100 Coins" }],
  passes: [{ passId: 67890, name: "VIP" }],

  // Wire Roblox's ownership API
  passOwnershipFetcher: (userId, passId) => mps.UserOwnsGamePassAsync(userId, passId),

  // Wire ProcessReceipt — Roblox calls this on every purchase
  onSetupReceipt: () => {
    mps.ProcessReceipt = (r) => handle.processReceipt(r);
  },

  // Wire player lifecycle
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

// Register a grant handler for the "100 Coins" product
handle.registerProduct({ productId: 12345, name: "100 Coins" }, (receipt) => {
  grantCoins(receipt.PlayerId, 100);
  return "PurchaseGranted";
});

// After a game pass prompt finishes, update the cache immediately
mps.PromptGamePassPurchaseFinished.Connect((player, passId, wasPurchased) => {
  handle.setPassOwned(player.UserId, passId, wasPurchased);
});
```

## API

### `createMarketplaceService(config)`

Factory that returns a `MarketplaceServiceHandle` + `Service` for the game lifecycle.

| Option                  | Type                   | Default | Description                                  |
| ----------------------- | ---------------------- | ------- | -------------------------------------------- |
| `products`              | `DeveloperProduct[]`   | `[]`    | Product definitions to register on init      |
| `passes`                | `GamePass[]`           | `[]`    | Game pass definitions to register on init    |
| `passOwnershipCacheTtl` | `number` (seconds)     | `300`   | How long to cache ownership results          |
| `passOwnershipFetcher`  | `PassOwnershipFetcher` | —       | Wraps `UserOwnsGamePassAsync`                |
| `onSetupReceipt`        | `() => void`           | —       | Called in `onStart` to wire `ProcessReceipt` |
| `onPlayerRemoving`      | lifecycle hook         | —       | Clears player pass cache on leave            |
| `onPlayerAdded`         | lifecycle hook         | —       | Reserved for future per-player state         |

### `DeveloperProductRegistry`

```ts
registry.register(product, handler); // Register product + grant handler
registry.unregister(productId); // Remove registration
registry.handleReceipt(receipt); // Route receipt → handler (pcall-safe)
```

### `GamePassCache`

```ts
cache.userOwnsGamePass(userId, passId); // Cache-first ownership check
cache.setOwned(userId, passId, owned); // Update cache directly
cache.invalidatePlayer(userId); // Clear all entries for player
```

### `PurchaseValidator`

```ts
validator.process(receipt); // Idempotent — deduplicates on PurchaseId
validator.isGranted(purchaseId); // Check if already processed this session
```

## Security

- **Server-only.** All receipt processing happens server-side; the client only triggers prompts.
- **Idempotent grants.** `PurchaseValidator` deduplicates on `PurchaseId` within a server session. Product handlers should also be idempotent for cross-restart safety (e.g., check inventory before granting).
- **pcall-safe.** Handler errors return `"NotProcessedYet"` rather than throwing, so Roblox will retry delivery.
- **Cache hygiene.** Pass ownership cache entries are cleared on player leave to avoid stale data.

## Dependencies

- `@broblox/core` — `createLogger`, service lifecycle
- `@broblox/shared-types` — (indirect, via core)
