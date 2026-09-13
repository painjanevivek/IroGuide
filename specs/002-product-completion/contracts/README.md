# Product Completion Contracts

## Projects

- `GET /api/projects`: list owned persisted projects plus virtual Unsorted counts.
- `POST /api/projects`: create with idempotency and bounded input.
- `GET /api/projects/[id]`: return one owned project.
- `PATCH /api/projects/[id]`: rename, archive, restore, or transfer artifacts with
  an expected revision and mutation ID.
- `DELETE /api/projects/[id]`: hard-delete only when empty; otherwise require an
  explicit owner-scoped transfer destination or Unsorted.

All mutation routes require exact capability, same-origin, verified auth, account
unlock, bounded JSON, rate limits, strict schemas, and owner scoping.

## Readiness

- `GET /api/readiness` returns exactly `{ ok: boolean }`.
- `GET /api/admin/readiness` requires same-origin, verified operator identity,
  recent authentication, and rate limiting.

## Closed capabilities

Routes return a capability-specific closed response before authentication,
payload parsing, persistence, provider calls, Storage, email, or other effects.
