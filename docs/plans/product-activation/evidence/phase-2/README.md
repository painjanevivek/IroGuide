# Phase 2 Evidence — Secure Activation Data Foundation

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `94e421a`
**Branch:** `codex/product-activation`
**Rollback:** redeploy or check out the starting SHA; the capability remains fail-closed unless `IROGUIDE_GUIDED_LEARNING_ENABLED` is exactly `true`.

## Entry and capability outcome

Phases 0 and 1 passed and were pushed before this work began. Phase 2 adds the server-owned persistence and API boundary needed by onboarding and free learning, but leaves `guidedLearning` disabled by default. Provider calls, source-image Storage, email delivery, Community, billing, paid evaluation, and public publishing remain disabled.

## Implemented foundation

- Added strict, versioned Zod contracts for account experience, owned sample progress, self-review, image-free briefs, review-access interest, and access-decision audit records.
- Added `GET/PATCH/DELETE /api/account/experience`, `GET/POST/PATCH/DELETE /api/self-reviews`, `GET/PUT/DELETE /api/design-briefs`, and `POST/DELETE /api/access-interest`.
- Centralized the fail-closed capability check, same-origin and content-type gates, verified Firebase identity, independent account/client limits, bounded JSON parsing, no-store headers, redacted logs, and stable error mapping.
- Added optimistic revisions, bounded mutation receipts, idempotent replay behavior, allowlisted state transitions, owner checks, and unambiguous owner-prefixed document IDs.
- Denied every Firebase client read/write path to all six collections and added the required indexes.
- Added deterministic old-account defaults, explicit mutation-only legacy draft import, destination read-back verification, and source retention.
- Added one 4 KiB guest envelope with seven-day expiry, allowlisted sample IDs, monotonic merge, and clear-only-after-server-verification behavior.
- Extended learning-history purge and full account deletion, including access-decision references; partial cleanup remains retryable and keeps the root deletion lock.
- Added bounded categorical support aggregates with an explicit truncation indicator and no individual account or creative content.
- Added an accessible reusable save/conflict/offline recovery notice for Phase 3 client flows.

## Validation evidence

| Command or check | Result |
|---|---|
| Focused activation Vitest | Passed: 41 tests; replay, concurrency, ownership, transitions, guest expiry/merge, explicit deletion scope, malformed and oversized bodies, adapter outage, conflict, lock, deletion retry, and external-side-effect denial covered |
| `npm run test:rules` | Passed: 42 Firestore/Storage emulator tests, including all six direct-denial paths |
| `npm run typecheck` | Passed with generated Next.js 16.3.2 route types |
| `npm run lint` | Passed with zero warnings |
| `npm test` | Passed: 90 files, 362 tests |
| `npm run check` | Passed: workflow pins, evaluation manifest validation, typecheck, lint, unit tests, rules tests, and production build |
| `git diff --check` | Passed; line-ending notices only |

## Browser and runtime inspection

The in-app browser confirmed the local application still rendered the public progressively disclosed landing experience. Direct JSON navigation is blocked by the browser client, so the gated endpoint was probed against the same running Next.js process with `Invoke-WebRequest`: `GET /api/account/experience` returned `404`, `Cache-Control: no-store, max-age=0`, `Cross-Origin-Resource-Policy: same-origin`, and the truthful guided-learning-unavailable response before authentication or persistence work.

No authenticated activation UI ships in this foundation phase; those browser flows begin in Phase 3. Route-handler behavior is covered by focused unit tests and the production build route manifest.

## Security and privacy review

- API responses omit raw UID and internal mutation receipts.
- Error and event logs contain request metadata, safe user hashes, statuses, and counts only; they contain no email, brief text, image, URL, token, provider content, or raw account ID.
- Free activation imports no provider, upload, email, Community, billing, or public-publishing operation.
- Request bodies are capped at 32 KiB and reject unknown fields, client ownership fields, URLs/images, unsupported rubric/sample IDs, invalid states, and stale revisions.
- Root deletion locks block new private reads/writes during account deletion and remain after partial or completed identity cleanup to deny stale tokens.
- No secret, credential, `.env.local`, emulator log, generated browser output, cache, or test report belongs in this commit.

## Gate decision

`PASS` for Phase 2. The persistence boundary is production-oriented, owner-scoped, fail-closed, replay-safe, deletion-aware, and ready for the Phase 3 authentication-continuity and onboarding UI. The phase commit and remote push are represented by the Git commit containing this evidence record.
