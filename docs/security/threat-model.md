# Security: Threat model

This platform is built for a hostile client environment. The goal is not “unhackable clients” (impossible), but **server authority + validation + detection + containment**.

## Assets (what we protect)

- Competitive integrity
  - match outcomes (wins/losses)
  - damage/hit validation
  - ranked MMR and rewards

- Economy integrity
  - premium purchases and grants
  - inventories, cosmetics, currencies

- Operational control
  - publish/promote actions
  - feature flags and configs
  - moderation actions (ban/mute)

- Player safety
  - moderation pipeline correctness
  - abuse report handling

## Attackers

- Basic exploiters
  - remote spamming
  - changing local values / UI injection

- Advanced exploiters
  - automated aimbots
  - movement manipulation
  - replay/simulation abuse
  - coordinated match fixing / boosting

- Insider / operator mistakes
  - misconfigured rollouts
  - accidental prod publish
  - overly broad permissions

## Trust boundaries

- Client → Server
  - **untrusted**
  - may send arbitrary payloads at arbitrary rates

- Server → Client
  - trusted direction, but data must be privacy-safe

- Dashboard → Backend
  - privileged actions must be RBAC-gated + audited

- Backend → Roblox Open Cloud
  - must be least-privilege and environment-isolated

## Primary exploit surfaces and mitigations

### 1) Remotes (RemoteEvents / RemoteFunctions)

Threats:

- calling remotes with malformed payloads
- calling remotes out of allowed state (cooldown bypass)
- spamming high-frequency remotes to lag/crash

Mitigations:

- Registry allowlist: only defined remotes exist
- Runtime schema validation on server
- Per-player and per-endpoint rate limiting
- Stable error codes, never throwing across boundary
- Violation events -> scoring -> enforcement policy

### 2) Client authority creep

Threats:

- trusting client position for hits
- trusting client cooldowns/ammo
- trusting client inventory

Mitigations:

- Server authoritative outcomes: damage, rewards, cooldowns, inventory mutations
- Server recalculates or validates critical values
- Client sends **intent** only

### 3) Movement + physics manipulation

Threats:

- speed/fly
- teleport/desync
- physics ownership exploitation

Mitigations:

- Server validates movement envelope (max speed/accel)
- Server authority for hit validation
- Ranked mode can enforce stricter ownership/validation

### 4) Economy duplication

Threats:

- retry duplication
- double-granting receipts
- race conditions across servers

Mitigations:

- Idempotency keys for all grants
- Conflict-safe persistence patterns
- Ledger-style recording for high-impact grants

### 5) Dashboard abuse / privilege escalation

Threats:

- stolen operator session
- excessive permissions
- un-audited admin actions
- CSRF attacks on mutating endpoints

Mitigations:

- GitHub OAuth login + allowlist + RBAC
- Immutable audit logs for all privileged actions
- Approval workflows for high-risk actions (prod promote, economy changes)
- CSRF double-submit cookie: token set in Edge middleware via Web Crypto API; `validateCsrf` helper available for constant-time XOR validation on mutating browser routes (not yet wired into route handlers). API route cookie setting exempt (game servers use API keys).
- Distributed rate limiting: per-operator limits backed by database (survives cold starts, shared across serverless instances)
- Zod validation on all server actions
- IP allowlisting via `DASHBOARD_ALLOWED_IPS` environment variable (exact IPs and CIDR ranges)

## Enforcement policy (default)

- Observe: log structured violations
- Score: aggregate suspicion score per player/session/match
- Contain:
  - throttle specific remotes
  - quarantine into unranked servers
  - kick on clear malicious behavior
- Ban:
  - manual ban with evidence preferred
  - automated bans only with high-confidence signals and safe rollback

## Security definition of done

- No inbound remote reaches gameplay logic without schema validation and rate limiting.
- All competitive outcomes are computed server-side.
- All privileged dashboard actions are RBAC-protected and audited.
- All mutating browser-facing dashboard routes are CSRF-protected (double-submit cookie).
- All server actions validate input with Zod schemas.
