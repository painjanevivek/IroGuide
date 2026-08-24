# Phase 3 inactive review pipeline evidence

Date: 2026-08-24
Launch decision: **inactive / NO-GO for provider activation**

## Delivered boundary

- Owner-bound, ten-minute GCS V4 upload authorizations for PNG, JPEG, and WebP objects up to 4 MB.
- Signed content type and one-time session nonce metadata; Admin credentials never leave the server.
- Server-side signature, decode, format, dimensions, pixel-budget, byte-budget, page-count, and SHA-256 validation using Sharp.
- Strict upload, job, attempt, and outbox schemas with explicit forward-only transitions.
- Atomic `(uid, idempotencyKey)` job creation with request-digest conflict rejection.
- Internal bearer-authenticated worker, dispatcher, and reconciliation boundaries with bounded leases and exponential backoff.
- Shared job deadline, three-attempt ceiling, transient-only retries, deterministic result document identity, and stale-worker completion rejection.
- Privacy-safe aggregate diagnostics for queue age, attempts, terminal latency, failures, orphaned events, and cleanup backlog.
- Account and review-history deletion now remove pipeline documents and direct-upload staging objects independently of the current creation capability.
- A progressively disclosed internal workbench exists only when the full profile, internal mode, and a 32+ character worker secret are all present.

## Production safety posture

Production continues to use:

```text
IROGUIDE_LAUNCH_PROFILE=free
IROGUIDE_REVIEW_PIPELINE_MODE=disabled
```

The disabled adapter is a ready no-op. Public and internal upload/job handlers return `404` before origin checks, authentication, Firebase access, queue work, or provider work. The internal page resolves through `notFound()` and has no public navigation entry.

Activation still requires explicit approval for the full launch profile, provider budget, entitlement policy, worker secret, worker infrastructure, and application of `firebase.storage.cors.json`. This phase does not supply or infer any of those approvals.

## Verification

- `npm run check`: passed.
  - immutable GitHub Action pins: passed
  - TypeScript: passed
  - ESLint with zero warnings: passed
  - Vitest: 73 files, 276 tests passed
  - Firebase emulator rules: 18 tests passed
  - Next.js production build: passed
- Isolated Playwright run on `127.0.0.1:3107`: 13 passed, 1 intentionally skipped Community scenario.
- Dedicated inactive-pipeline browser gate on `127.0.0.1:3108`: 1 passed.
- Focused route, decoder, lease, retry, cancellation, deletion, readiness, and configuration suites: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: passed.

The first local Playwright attempt reused an unrelated process already listening on port 3000 (`LedgerSync`). It was discarded as invalid environment evidence; the isolated-port rerun above is the applicable result.

## Deployment closeout

Pending merge and free-production verification. `AUT-0312` remains open until the deployed page and every upload/job mutation boundary are confirmed as `404`.
