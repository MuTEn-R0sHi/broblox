# ADR-0008: Marketplace / MonetizationService wrapper

## Status

Accepted

## Context

`packages/gacha`, `packages/battle-pass`, and `packages/pets` all assume Robux purchases can be made but none of them process purchases.
Roblox's `MarketplaceService` requires a server-side `ProcessReceipt` callback to be registered; without it all developer product purchases silently fail.
Phase 6 economy work (BroCoins, trading) is blocked until a safe monetization layer exists.

Three related concerns must be solved:

1. **Developer products** — one-time purchasable items that can be bought multiple times (coins, gems, loot boxes).  Roblox fires `ProcessReceipt` for each; the server must grant the reward and return `PurchaseGranted`.
2. **Game passes** — permanent ownership grants (VIP, double XP).  Ownership must be checked efficiently without hammering `UserOwnsGamePassAsync` every frame.
3. **Receipt safety** — `ProcessReceipt` can be retried by Roblox if the server crashes or returns `NotProcessedYet`.  Double-granting must be prevented.

## Decision

Build `packages/marketplace` as a thin, injectable wrapper with three components:

| Component                  | Responsibility                                                         |
| -------------------------- | ---------------------------------------------------------------------- |
| `DeveloperProductRegistry` | Registry of product definitions + grant handlers; routes receipts      |
| `GamePassCache`            | In-memory TTL cache for `UserOwnsGamePassAsync` results                |
| `PurchaseValidator`        | Idempotent receipt processing — deduplicates on `PurchaseId`           |

All three are composed by `createMarketplaceService`, which returns a standard `Service` object compatible with the game's `Application` lifecycle (`onInit`, `onStart`, `onDestroy`).

### Idempotency

- `PurchaseValidator` keeps an in-memory `Set<PurchaseId>` of grants within the current server session.
  If Roblox retries a receipt that was already granted, `PurchaseGranted` is returned immediately without re-invoking the handler.
- Handlers should also be idempotent on a per-player basis (e.g., check inventory before granting) to cover cross-restart retries where the in-memory set has been cleared.
- This satisfies ADR-0003 (idempotency requirement for all grants).

### Ownership cache TTL

- Default TTL: **300 seconds** (5 minutes).
- Sufficient to avoid repeated Roblox API calls per player, while ensuring that pass revocations (rare, but possible) propagate within a reasonable window.
- The cache entry for a player is invalidated on player leave (`invalidatePlayer`).
- After a `PromptGamePassPurchaseFinished` success, the caller calls `handle.setPassOwned(userId, passId, true)` to update the cache immediately without waiting for a re-fetch.

### Injection pattern

The package does not call `game:GetService("MarketplaceService")` directly.
Instead, callers inject:
- `passOwnershipFetcher` — wraps `UserOwnsGamePassAsync`
- `onSetupReceipt` — a callback that wires `MarketplaceService.ProcessReceipt`

This keeps the package fully testable without Roblox globals (consistent with ADR-0006 test strategy).

## Alternatives considered

### Inline in gacha / battle-pass / pets

Each package independently handling its own purchases would duplicate idempotency logic and make it impossible to share a single `ProcessReceipt` callback (Roblox only allows one per place).  Rejected.

### Full DataStore idempotency

Storing every `PurchaseId` in a DataStore would survive server restarts.  The added complexity and DataStore budget cost is not justified for Phase 5–6 scope where restart-driven double-grants are extremely rare.  Re-evaluate if grant volume or exploit surface warrants it.

### Third-party library

No suitable roblox-ts library exists that fits our security model (explicit validation, stable error codes, injectable adapters).  Custom implementation is the right choice.

## Consequences

- `MarketplaceService` is the single `ProcessReceipt` owner; other packages call `handle.processReceipt`.
- Games that need Robux purchases **must** register their product handlers via `handle.registerProduct` before any player can trigger a purchase.
- `packages/gacha`, `packages/battle-pass`, and `packages/pets` should be updated in Phase 6 to wire their Robux-based hatching/unlock flows through `@rbx/marketplace`.
- This unblocks Phase 6 economy (BroCoins, trading) and removes the prerequisite gap noted in `docs/roadmap/future-phases.md`.

## Rollout plan

1. ✅ Add `packages/marketplace` with `DeveloperProductRegistry`, `GamePassCache`, `PurchaseValidator`, `createMarketplaceService`.
2. Add `@rbx/marketplace` to `tsconfig.roblox.json` and `vitest.config.ts`.
3. In the next Phase 6 session: wire `@rbx/marketplace` into the starter and obby games.
4. Update `packages/gacha`, `packages/battle-pass`, `packages/pets` to delegate Robux flows to `@rbx/marketplace`.
5. Write an ADR for Phase 6 BroCoins / economy once the marketplace layer is proven in a deployed game.
