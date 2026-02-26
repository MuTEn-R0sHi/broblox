# Next Session — Planning Notes

> **Date of this review:** 2026-02-26  
> **Prepared by:** GitHub Copilot session  
> **Status of codebase:** All CI green, repo public, 33 packages, 2,400+ tests across 115+ suites

---

## Step 1 — Do this first

- [x] **Merge PR #83** (`docs/public-repo-audit`) — merged as commit `daaf694`.

---

## Deployment reality (confirmed this session)

Both test games are deployed to Roblox across three environments:

| Game      | Dev        | Staging    | Live       |
| --------- | ---------- | ---------- | ---------- |
| `starter` | ✅ private | ✅ private | ✅ private |
| `obby`    | ✅ private | ✅ private | ✅ private |

Universe IDs are known and configured. All 6 experiences are **private** for now.  
Deep links (`NEXT_PUBLIC_ROBLOX_GAME_URL_*`) activate when experiences are flipped public — a ~10-minute Vercel env var task, defer until ready.

---

## Phase 4 close-out

Phase 4 is **complete**. All deliverables shipped:

- [x] **Dashboard news CMS route** — `/dashboard/news` in `apps/dashboard` (full CRUD, RBAC, public API)
- [x] **Live leaderboard pipeline** — OrderedDataStore → dashboard API → website `/rankings`
- [x] **Website v1** — deployed to broblox-games.com

Remaining Phase 4 "nice-to-haves" deferred:

- Roblox game deep links (activate when experiences are made public)
- Dashboard worker jobs (rollouts, ban propagation, scheduled events)
- Performance budgets enforced in CI
- Roblox Moments integration

---

## Gaps found this session (not in any planning doc)

### 1. — `packages/marketplace` (MonetizationService wrapper) ✅

**Status: Complete (ADR-0008)**

`packages/marketplace` has been implemented with:

- `DeveloperProductRegistry` — product definitions + grant handlers; routes `ProcessReceipt`
- `GamePassCache` — in-memory TTL cache for `UserOwnsGamePassAsync` (default TTL: 300 s)
- `PurchaseValidator` — idempotent receipt processing (deduplicates on `PurchaseId`)
- `createMarketplaceService` — factory wiring all three into a `Service`

**Next action:** In the next Phase 6 session, wire `@broblox/marketplace` into the starter and obby games, then update `packages/gacha`, `packages/battle-pass`, and `packages/pets` to delegate Robux flows through `@broblox/marketplace`.

---

### 2. — Bro Companion / LittleBro (Phase 5b remaining, Critical)

**Severity: load-bearing for Hub + Phase 6**

Marked `🔴 Critical` in Phase 5b remaining. The BroBlox Hub concept depends on it. Currently:

- No design doc
- No ADR
- No package stub
- No game integration plan

**Next action:** Write an ADR covering:

- Cross-game companion identity (persists across `starter`, `obby`, Hub)
- Relationship to `packages/pets` (separate or extends?)
- Leveling/bonding mechanic design
- Hub "home space" concept

---

### 3. — Roblox OAuth for website (Phase 6 prerequisite)

Website Phase 6 features planned:

- BroCoins balance in nav (authenticated)
- `/profile/[player]` — cross-game stats
- `/guilds` — guild membership

None of this works without an authenticated Roblox identity. No OAuth flow is designed anywhere. This is non-trivial and should be its own roadmap item with an ADR before Phase 6 website work starts.

---

## Recommended session order

| #   | Task                                       | Effort | Why                          |
| --- | ------------------------------------------ | ------ | ---------------------------- |
| 1   | Bro Companion ADR                          | Low    | Unblocks Hub + Phase 6 scope |
| 2   | Wire `@broblox/marketplace` into games     | Medium | Activates monetization       |
| 3   | Phase 6 economy architecture               | High   | BroCoins design before build |
| 4   | Roblox OAuth design                        | Medium | Phase 6 website prerequisite |
| 5   | Flip games public + set deep link env vars | 10 min | When ready                   |

---

## What is already done (do not re-work)

- All 33 `@broblox/*` packages — fully implemented + tested (including `@broblox/marketplace`)
- Both games (starter + obby) — integrated with all packages + deployed to Roblox (6 private experiences)
- Dashboard v2 — RBAC, audit, bans, flags, match history, moderation
- Website v1 — live at broblox-games.com, all pages, Vercel deployed
- Open Cloud CI pipeline — publish/promote/rollback fully wired
- All CI workflows — green on public repo, branch protection + `build` check enforced

---

## Key reference links

- PR #83: https://github.com/MuTEn-R0sHi/broblox/pull/83
- Roadmap: `docs/roadmap/overview.md` + `docs/roadmap/future-phases.md`
- Ideas/brainstorm: `ideas/IDEAS.md`
- Current packages: `packages/` (33 total, see `docs/architecture/folders-and-packages.md`)
