# Getting started: Prereqs

## Local prerequisites (developer machine)

- Roblox Studio (latest stable)
- Node.js (LTS)
- pnpm (recommended) or npm
- Git

## CI prerequisites (GitHub)

- Repository has GitHub Actions enabled
- Secrets / environment variables will be configured later for Open Cloud publishing

## Roblox prerequisites

- A Roblox experience (universe) for each environment (recommended):
  - `dev` universe
  - `stage` universe
  - `prod` universe

Why: separates data and reduces accidental promotion mistakes.

## Permissions & safety

- Publishing keys and privileged tokens must never be accessible to clients.
- Prefer least privilege: separate Open Cloud credentials per environment.
