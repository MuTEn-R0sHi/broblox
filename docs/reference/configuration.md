# Reference: Configuration

## Types of configuration

- Build-time: constants compiled into the client/server
- Runtime: fetched/replicated config snapshots
- Feature flags: kill-switches and rollouts

## Environment separation

Recommended environments:

- dev
- stage
- prod

Rules:

- Never share credentials across environments.
- Prefer separate universes for hard isolation.

## Config validation

- Every config file has a schema.
- Invalid configs fail CI and cannot be promoted.

## Sensitive data

- Secrets do not live in the repo.
- The game client never receives secrets.
- Server-only secrets are stored via secure mechanisms (Open Cloud secrets store / backend).
