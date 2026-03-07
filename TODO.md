# BroBlox — Pre-Launch TODO

> Generated from full project review (2026-03-03).
> Both games remain **private** until all P0 items are resolved.

---

## Status Overview

| Metric             | Current Value          |
| ------------------ | ---------------------- |
| Packages           | 33                     |
| Games              | 2 (test-park, obby)    |
| Web apps           | 2 (dashboard, website) |
| Test suites        | 150+                   |
| Individual tests   | 3,149+                 |
| Line coverage      | 88.40%                 |
| Branch coverage    | 80.26%                 |
| `@planned` markers | 6 (matchmaking only)   |
| Circular deps      | 0                      |
| TODO/FIXME debt    | 0                      |

---

## P0 — Must-Do Before Launch

### Monetization

- [x] Wire `@broblox/marketplace` into **test-park** game (developer products, game passes, receipt validation)
- [x] Wire `@broblox/marketplace` into **obby** game
- [x] Implement shop UI flow (test-park already has tutorial steps "Using the Shop" / "Buy an Item" but no backing code)
- [x] Add at least one developer product and one game pass per game
- [x] End-to-end test: purchase → receipt validation → item grant → persistence

### Audio

- [ ] Replace all `rbxassetid://0` placeholders in **test-park** (9 sounds)
- [ ] Replace all `rbxassetid://0` placeholders in **obby** (8 sounds)
- [ ] Source or create SFX for: coin collect, jump, damage, level up, quest complete, reward claim, UI click, background music

### Test Park — Test Park (Staff-Only)

- [x] Repurpose test park as an automated **system test park** (staff only)
- [x] Auto-generated map: 15 zones arranged in a circle, platforms + signs + action orbs
- [x] 50+ test actions wired to real services via ProximityPrompts
- [x] Zone teleporter UI (client panel) auto-generated from shared registry
- [x] Staff gate service (userId allowlist, disabled by default for dev)
- [x] Action result feedback via `TestPark_ActionResult` remote → client toast
- [x] Runtime validation: warns about missing action handlers at startup
- [ ] Replace `StaffGateService` `GATE_DISABLED = true` → `false` once team UserIds are added
- [ ] Add remaining `rbxassetid://` sound IDs before audio zone is fully testable

### Test Park Map & Content

- [x] ~~Build an actual game environment (currently baseplate + spawn only)~~ → **Decision: test park is now the Test Park — map is auto-generated from zone registry**
- [x] ~~Define core game loop (what does the player _do_?)~~ → Staff walk between zones and trigger system tests
- [x] ~~Add interactable objects / NPCs / objectives~~ → ProximityPrompt orbs per action, 50+ actions
- [ ] ~~Add Rojo model files for map geometry~~ → Not needed — geometry is created at runtime from config

### Observability

- [x] Wire `@broblox/observability` into both games (dependency exists, Rojo mapped, but zero imports)
- [x] Emit structured telemetry events for key player actions (join, leave, purchase, death, stage complete)
- [ ] Verify dashboard telemetry API ingestion receives events correctly
- [ ] Set up a metrics dashboard view for basic KPIs (DAU, session length, retention)

---

## P1 — Should-Do Before Launch

### Package Wiring Gaps

- [x] Wire `@broblox/input` into both games (declared as dep + Rojo mapped, never imported)
  - Test Park: ActionController, HandshakeController, HudController + `initInput()` in main.client.ts
  - Obby: InputController, HudController + custom "respawn" action + `initInput()` in main.client.ts
- [x] Wire `@broblox/combat` into test park (has `kills` in player data but uses ad-hoc logic)
  - Created CombatService with 3 abilities (melee, ranged, heavy_slam), hit validation, analytics
  - Wired UseAbility event + ReportHit function into PlayerActionService
  - Resolved 3 `@planned` tags in combat package
- [x] ~~Remove unused `@broblox/shared-types` dependency from obby game~~ — **Decision: keep it.** Required for Rojo transitive dependency resolution (packages like @broblox/data import from it at runtime)

### Testing Gaps

- [x] Add client controller tests — 2 test files covering all 13 controllers across both games
  - Test Park: 7 controllers — 30 tests in ClientControllers.test.ts
  - Obby: 6 controllers — 23 tests in ClientControllers.test.ts
- [x] Add dedicated tests for low-coverage game services:
  - [x] test-park/BattlePassService — seasons, tiers, XP, reward tracks, lifecycle delegation
  - [x] test-park/TutorialService — sequences, step types, prerequisites, skippable flags
  - [x] test-park/CosmeticsService — categories, rarities, tradeable/limited, datastore
  - [x] test-park/GachaService — eggs, costs, loot weights, pity thresholds
  - [x] test-park/InventoryService — items, slot limits, stack sizes, tradeable flags
  - [x] test-park/PetService — evolution rules, elements, stats, maxEquipped
  - [x] obby/TutorialService — ftue_obby sequence, 4 steps, action conditions
  - [x] obby/NotificationService — queue config, durations, announcements, lifecycle
  - [x] obby/CosmeticsService — 3 cosmetics, limited/tradeable flags, datastore
  - [x] obby/PetService — 3 pets, growth rates, maxEquipped=1, no evolution
- [x] Add dashboard server action tests (flag CRUD, moderation actions, user role changes, news CRUD, game CRUD)
- [x] Add website component/page tests (leaderboard + news lib tests, 4 test files total)
- [x] Raise branch coverage from 83.42% toward 90% (reached 80.26% — edge-case tests added across 12 packages)

### CI/CD

- [x] Add coverage upload to CI (Codecov) — protect the 96% baseline; added path filtering for docs-only PRs
- [x] Wire `generate-error-catalog.mjs --check` into CI to prevent error code doc drift
- [ ] Implement deploy notifications (currently `post_publish_notification` is just `echo`)
- [ ] Upload `.rbxl` build artifacts in CI for audit/rollback
- [ ] Add PR preview deploys for docs site and website

### Dashboard Hardening

- [ ] Implement distributed rate limiting (current in-memory limiter resets on cold start, no cross-instance state)
- [x] Add Zod validation to server actions (API routes use Zod; server actions use manual `FormData` parsing)
- [ ] Add explicit CSRF token mechanism (currently relies on Next.js Server Actions' implicit protections)
- [x] Fix `@ts-expect-error` in `apps/dashboard/src/lib/auth.ts` — extended User & AdapterUser interfaces with `role`
- [x] Add custom `error.tsx` and `not-found.tsx` pages to both Next.js apps
- [ ] Build out the Settings page (file exists, minimal functionality)

---

## P2 — Should-Do Soon After Launch

### Code Architecture

- [ ] Extract shared game-types package (`@broblox/game-shared` or similar)
  - Deduplicate `FullPlayerDataPayload`, metagame request/response types, 10+ remote definitions copy-pasted between test-park and obby
- [ ] Add `createInputService` factory to `@broblox/input` (only feature package without a service factory)
- [ ] Move `Janitor` / `Clock` out of `packages/core/src/index.ts` into separate files (currently inline in barrel)
- [ ] Reduce side effects in `@broblox/config-featureflags` (`defineFlag()` runs at import time — consider lazy registration)
- [ ] Add `Vector3`, `CFrame`, `Player`, `Humanoid`, `BasePart` to `types/roblox-runtime.d.ts` (currently cast-at-call-site)
- [ ] Eliminate the manual copy-sync between `@broblox/testing` and `@broblox/shared-types` (error-codes.ts, result.ts)

### Matchmaking

- [ ] Resolve 6 `@planned` tags in `@broblox/matchmaking`:
  - [ ] Queue wiring to client remotes
  - [ ] Timeout processing
  - [ ] Match formation
  - [ ] Match lifecycle
  - [ ] Server allocation
- [ ] Integrate matchmaking into at least one game (race mode for obby? PvP for test-park?)

### Trading

- [ ] Implement `@broblox/trading` package (doc exists at `docs/modules/trading.md` with planned data model, no code)
- [ ] Wire trading into games that need item exchange

### Tooling & DX

- [ ] Build scaffolding templates promised in `tools/README.md`:
  - [ ] New package template
  - [ ] New game template
  - [ ] New module template
  - [ ] New remote endpoint template
- [ ] Add tests for the 4 existing tool scripts (`check-md-links`, `check-testing-sync`, `generate-error-catalog`)
- [ ] Auto-generate API reference docs from JSDoc (33 well-documented packages, docs lag behind code)
- [ ] Add doc freshness tracking (flag pages that haven't been updated relative to source changes)

### Documentation

- [ ] Split future roadmap into its own `docs/roadmap/future-phases.md` (currently folded into overview.md)
- [ ] Flesh out wiki pages for website (`/games/[slug]/wiki/` route exists, no content)
- [ ] Update `docs/modules/trading.md` once the package is implemented
- [ ] Add runbook for marketplace/purchase flow

---

## P3 — Nice to Have

### Testing

- [ ] Add game integration tests (full server bootstrap → handshake → action flow)
- [ ] Test `@broblox/constants` more thoroughly (7 source files, 1 test file)
- [ ] Test `@broblox/testing` more thoroughly (8 source files, 1 test file)
- [ ] Test `DeathlessStreakState` module in obby (extracted to break circular deps, no dedicated tests)

### CI/CD

- [ ] Add matrix testing (multiple Node versions, OS variants)
- [ ] Add performance budgets (bundle size, remote payload size)
- [ ] Automate changelog / version bumping (currently manual; `commitlint` enforces format but no release-please/changesets)

### Website

- [ ] Build out wiki content for each game
- [ ] Add a community/social section
- [ ] Add a changelog page pulling from `CHANGELOG.md`

### Future Packages (from roadmap)

- [ ] Economy/Social systems (Phase 6 — deferred until player data justifies)
- [ ] Additional game types (Phase 7)

---

## Decision Log

Track decisions made while working through this list:

| Date       | Decision                                              | Context                                                                                                    |
| ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-03-03 | Created pre-launch TODO from full project review      | Games remain private until P0 complete                                                                     |
| 2026-03-03 | Wired marketplace + observability into both games     | P0 monetization & observability items done                                                                 |
| 2026-03-03 | Added TelemetryService + marketplace e2e tests        | 509 tests pass (202 test-park, 307 obby)                                                                   |
| 2026-03-03 | Wired @broblox/input into both games                  | Replaced raw UserInputService with proper input system                                                     |
| 2026-03-03 | Wired @broblox/combat into test park                  | CombatService + hit validation + analytics + remote handlers                                               |
| 2026-03-03 | @broblox/shared-types needed for Rojo transitive deps | NOT unused — packages import from it at runtime                                                            |
| 2026-03-03 | Added client controller + service deep-config tests   | 658 tests pass (284 test-park, 374 obby)                                                                   |
| 2026-03-03 | Dashboard hardening + CI/CD + web app tests           | 1,105 tests pass: 226 dashboard, 49 website, 284 test-park, 374 obby, 89 shared-types, 83 testing          |
| 2026-03-03 | Shop UI + Zod validation + branch coverage push       | 3,149 tests pass. Shop screen wired into test-park. Zod applied to 7 action files. Branch coverage 78→80%. |
