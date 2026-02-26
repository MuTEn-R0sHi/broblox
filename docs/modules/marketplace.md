# Modules: Marketplace

Roblox `MarketplaceService` wrapper for developer products, game passes, and idempotent purchase receipt validation (`@broblox/marketplace`). **Status: Implemented** (ADR-0008).

## Purpose

- Wrap Roblox `MarketplaceService` behind a testable, platform-consistent API.
- Idempotent receipt processing that deduplicates on `PurchaseId` — purchases are never double-granted.
- In-memory TTL cache for game pass ownership to reduce `UserOwnsGamePassAsync` calls.
- Declarative product/pass registration with typed grant handlers.
- Follows platform security invariants: server-authoritative, idempotent, auditable.

## Public API

### DeveloperProductRegistry

```typescript
import { DeveloperProductRegistry } from "@broblox/marketplace";

const registry = new DeveloperProductRegistry();
registry.register({ productId: 12345, name: "100 Coins" }, (receipt) => {
  grantCoins(receipt.PlayerId, 100);
  return "PurchaseGranted";
});
```

### GamePassCache

```typescript
import { GamePassCache } from "@broblox/marketplace";

const cache = new GamePassCache({ ttlSeconds: 300 });
cache.register({ passId: 67890, name: "VIP" });
const owned = cache.ownsPass(userId, 67890); // cached lookup
```

### PurchaseValidator

```typescript
import { PurchaseValidator } from "@broblox/marketplace";

const validator = new PurchaseValidator();
// Deduplicates on PurchaseId, tracks granted receipts
```

### createMarketplaceService(config)

Factory combining all three components with lifecycle hooks:

```typescript
import { createMarketplaceService } from "@broblox/marketplace";

const handle = createMarketplaceService({
  products: [{ productId: 12345, name: "100 Coins" }],
  passes: [{ passId: 67890, name: "VIP" }],
  passOwnershipFetcher: (userId, passId) => mps.UserOwnsGamePassAsync(userId, passId),
  onSetupReceipt: () => {
    mps.ProcessReceipt = (r) => handle.processReceipt(r);
  },
});
```

## Dependencies

- `@broblox/core` — Logger, lifecycle

## Testing

- 47 tests across 5 suites: `create-marketplace-service.test.ts`, `developer-products.test.ts`, `game-passes.test.ts`, `purchase-validator.test.ts`, `index.test.ts`.

## See Also

- [ADR-0008](../architecture/decisions/0008-marketplace-monetization-service.md) — architecture decision record
