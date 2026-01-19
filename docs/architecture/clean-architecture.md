# Architecture: Clean architecture rules

This platform follows a clean architecture approach: **dependency direction is controlled**, and domain logic stays isolated from engine details.

## Core idea

- High-level policy (domain rules) must not depend on low-level details (Roblox services, Instances, HTTP).
- Low-level details adapt to the domain via interfaces.

## Layers (practical for Roblox)

1. **Domain (pure logic)**
   - Deterministic rules: cooldown checks, MMR calculations, reward eligibility.
   - Data structures and invariants.
   - No `game:GetService()`, no Instances.

2. **Application (use cases)**
   - Orchestrates domain rules.
   - Coordinates persistence, messaging, and networking.
   - Defines interfaces for gateways (storage, clocks, telemetry).

3. **Infrastructure (adapters)**
   - Roblox service adapters (DataStore, MemoryStore, MessagingService).
   - Remote transport and validation middleware.
   - Teleport integration.

4. **Presentation**
   - Client UI, camera, input.
   - Server-to-client snapshot application.

## Dependency rule (non-negotiable)

- Domain must not import Application/Infrastructure/Presentation.
- Application may import Domain.
- Infrastructure depends on Application contracts.
- Games depend on packages; packages never depend on games.

## Concrete structure (recommended)

Inside each shared package:

- `shared/` for domain + DTOs
- `server/` for application + infrastructure adapters
- `client/` for presentation controllers

## Anti-patterns to avoid

- Business rules inside RemoteEvent handlers (hard to test; easy to exploit).
- Client-side authority for outcomes.
- Mixing persistence code into gameplay logic.
- Unbounded event connections and memory leaks.

## Testability requirement

Any code that decides outcomes (damage, rewards, MMR, bans) must be:

- covered by unit tests
- runnable without Roblox services

## Change process

If a change violates the dependency rule, write an ADR explaining why.
