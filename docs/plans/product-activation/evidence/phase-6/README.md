# Phase 6 Evidence — Evidence, Account Export, and Access Operations

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `8c9a96b7771cf62dadc9139652d54b60e92df81e`
**Branch:** `codex/product-activation`
**Rollback:** redeploy or check out the starting SHA. The evidence adapter remains a ready no-op unless explicitly configured; removing operator access to the new route stops access decisions without changing user interest records.

## Entry and capability outcome

Phases 0–5 passed and were pushed before implementation. This phase adds consent-aware activation evidence, owner-scoped JSON export, and server-authorized review-access operations. It does not enable a critique provider, source-image Storage, email delivery, Community, billing, or public publishing.

## Implemented evidence boundary

- Expanded the strict discriminated event taxonomy for landing, sign-up, sample start, brief start, and workspace return milestones. Unknown fields and event variants are rejected before persistence.
- Kept collection dependent on a verified account and the existing versioned analytics-consent receipt. Anonymous landing impressions are intentionally not recorded; landing conversion therefore describes consenting signed-in accounts only.
- Added server-derived schema version, deployment environment, consent version, deterministic sample rate, de-identified account hash, event deduplication, and no-store API behavior.
- Persisted raw events with Firestore TTL timestamps for 30 days and daily count-only aggregates with TTL timestamps for 365 days. Aggregate rows contain no account hash or product content.
- Added operator funnel summaries for landing-to-sample, sign-up-to-sample, sample completion, brief readiness, access interest, interest revocation, and seven-day return.
- Kept `not-observed`, `insufficient-sample`, `measured-zero`, and `measured` as separate states so absence of evidence is never presented as zero performance.

## Implemented export and operations

- Added recent-authenticated, same-origin, rate-limited `POST /api/account/export` and a dashboard download control.
- The versioned JSON attachment is private/no-store and bounded to 200 rows per collection and 2 MiB synchronously. It includes the owner profile, learning records, access state, critique records/provenance, drafts, and later comparison, message, and private case-study records when present.
- Recursive export sanitization removes owner IDs, tokens, signed/source-image access, Storage paths, raw provider payloads, abuse/security records, and operator notes while normalizing Firestore timestamps.
- Added operator-only categorical filtering and approve, decline, expire, and revoke decisions. Decisions bind the verified operator, require allowlisted reason codes and an expected revision, deny self-decisions, deny approval after contact revocation, and create immutable audit records atomically.
- Replay of an identical decision is safe; event-ID reuse with different actor, target, decision, or reason conflicts. No decision path sends email.
- Direct Firebase client access to aggregate evidence remains denied, and all prior server-owned evidence and access collections remain denied.

## Validation evidence

| Command or check | Result |
|---|---|
| Focused Phase 6 Vitest | Passed: 7 files / 33 tests covering taxonomy, sensitive-field rejection, ordered funnel semantics, export security, route ownership/origin, access authorization, audit, replay, self-decision, conflicts, and invalid filters |
| Focused Phase 6 Playwright | Passed: 2 Chromium scenarios covering the owner export download, operator filtering/approval, zero email/provider/billing work, and 390-pixel reflow |
| `npm run typecheck` | Passed with generated Next.js 16.3.2 route types |
| `npm run lint` | Passed with zero warnings |
| `npm run test:rules` | Passed: 43 Firestore and Storage rules tests, including direct aggregate-evidence denial |
| `npm run check` | Passed: immutable workflow pins, evaluation-manifest validation, typecheck, lint, 102 unit files / 412 tests, 43 rules tests, and the production build including both new APIs and the operator route |
| `npm run test:e2e:free` | Passed: 20 Chromium scenarios; free learning still creates no provider, source-image Storage, email, Community, or billing work |
| `git diff --check` | Passed; line-ending notices only |

## Browser and visual inspection

The operator access flow was inspected at desktop and 390-pixel widths. The result preserves the existing paper, ink, violet, lime, and coral visual system; the action order remains legible, controls stay at least 40–44 pixels high, and the document has no horizontal overflow.

The in-app browser transport remains unable to reach the host-local preview, so no success is claimed for that transport. Equivalent DOM, interaction, responsive, download, and visual checks passed through Playwright.

Responsive captures remain outside Git at:

`C:\Users\ASUS\.codex\visualizations\2026\08\23\01a02fcd-d720-7662-b6c5-f83b14302f37\iroguide-product-activation-phase-6-2026-08-28`

The folder contains desktop and mobile operator-access captures. Generated downloads, reports, traces, caches, and screenshots are not committed.

## Security, privacy, and residual constraints

- Evidence is limited to categorical product events; email, raw UID, briefs, review text, images, URLs, document identifiers, provider content, and tokens are invalid event fields.
- The live operator report derives de-identified unique-account funnels from the bounded 30-day raw window. Twelve-month aggregates remain count-only and are not presented as account-level cohorts.
- Export requires recent authentication and an unlocked account. Large accounts receive a bounded support path rather than an unbounded memory response.
- Operator candidates expose categorical interest and status only; no email, name, free text, brief, review, or image is returned.
- Real operator credentials, production TTL activation, staging deployment, DAST, and rollback proof remain Phase 7 work.
- No secret, credential, `.env` file, generated report, trace, cache, export attachment, user image, signed URL, or private content belongs in this commit.

## Gate decision

`PASS` for Phase 6. Consenting users can receive a bounded portable copy of owned data, product evidence distinguishes missing evidence from measured outcomes, and operators can manage review interest without opening the provider or email gates. The phase commit and remote push are represented by the Git commit containing this evidence record.
