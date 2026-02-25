# Getting started: Prereqs

## Local prerequisites (developer machine)

- Roblox Studio (latest stable)
- Node.js (>= 22)
- pnpm (via Corepack)
- Git
- Rojo (recommended, for Roblox Studio sync)

Optional (recommended): Aftman for toolchain pinning (Rojo, etc.)

## Package manager

This repo is a `pnpm` workspace, and `pnpm` is pinned via `package.json#packageManager`.

One-time setup:

- `corepack enable`

### Installing Aftman

Aftman lets us pin Roblox tooling versions (like Rojo) in-repo via `aftman.toml`.

Linux options:

- If you have Rust installed: `cargo install aftman`
- Or download a release binary and put it on your `PATH` (see the Aftman GitHub releases page)

Verify:

- `aftman --version`

Then from the repo root:

- `aftman install`

That installs the pinned tools (including Rojo) into `.aftman/`.

## CI prerequisites (GitHub)

- Repository has GitHub Actions enabled
- Secrets / environment variables must be configured for Open Cloud publishing (see `docs/reference/ci-cd-secrets.md`)

## Roblox prerequisites

- A Roblox experience (universe) for each environment (recommended):
  - `dev` universe
  - `stage` universe
  - `prod` universe

Why: separates data and reduces accidental promotion mistakes.

## Permissions & safety

- Publishing keys and privileged tokens must never be accessible to clients.
- Prefer least privilege: separate Open Cloud credentials per environment.
