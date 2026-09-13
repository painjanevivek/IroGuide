# Phase 5 Evidence — Guided Dashboard and Data Controls

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `74e5a52528e22309311df4c1bd42c9c01db337b2`
**Branch:** `codex/product-activation`
**Rollback:** redeploy or check out the starting SHA. The new guide endpoint is read-only; disabling `IROGUIDE_CAPABILITY_GUIDED_LEARNING` fails the guide closed without deleting review or learning records.

## Entry and capability outcome

Phases 0–4 passed and were pushed before implementation. This phase adds a server-owned recommendation model and a progressive workspace presentation. It changes no provider, Storage, email, Community, billing, or publishing capability.

## Implemented flow

- Added a strict versioned dashboard-guide domain model derived from onboarding, sample progress, self-reviews, briefs, access state, review drafts, active review jobs, review history, and launch capabilities.
- Added authenticated owner-scoped `GET /api/dashboard/guide` with the existing account lock, rate-limit, redacted-error, and no-store security envelope.
- Added one role-aware next action, a bounded four-step artifact checklist, categorical recent activity, and explicit “Available now” status.
- Added continuation outcomes for onboarding, sample, self-review, brief, review draft/job, comparison, private case study, access, and saved review states.
- Replaced the empty-review dead end with useful free-learning context and removed unsupported progress cards when no verified comparison exists.
- Added stable route and guide skeletons, a route error boundary, retryable locked/fatal states, offline stale-guide status, and readable cached history during partial sync.
- Added all-category history filtering and a recoverable filtered-empty state while preserving verified/unverified provenance labels.
- Added direct links for preferences, learning-history deletion, review purge, account deletion, privacy, and support. Source-image copy now reflects the active capability.
- Added query-addressable learning tools so every dashboard continuation link opens the requested artifact workflow.
- Simplified the narrow dashboard header and kept the guide before review metrics in DOM and visual order.

## Validation evidence

| Command or check | Result |
|---|---|
| Focused Phase 5 Vitest | Passed: 4 files / 27 tests covering next-action state transitions, bounded activity, strict client parsing, locked recovery, and owner-scoped no-store API behavior |
| Focused Phase 5 Playwright | Passed: 8 Chromium scenarios covering new, onboarding-resume, sample-resume, sample-complete, brief-ready, access-requested, invited, existing-history, stable loading, offline, locked, partial-sync, filtered-empty, direct tool routing, and 320-pixel reflow |
| `npm run test:e2e:free` | Passed: 20 Chromium free-launch scenarios, including zero review/provider/Storage side effects and retained cached review access |
| `npm run typecheck` | Passed with generated Next.js 16.3.2 route types |
| `npm run lint` | Passed with zero warnings |
| `npm run check` | Passed: immutable workflow pins, evaluation-manifest validation, typecheck, lint, 98 unit files / 402 tests, 42 Firebase rules tests, and production build including `/api/dashboard/guide` |
| `git diff --check` | Passed; line-ending notices only |

## Browser and visual inspection

The dashboard state matrix was exercised in Chromium with deterministic owner-scoped guide fixtures and a schema-valid cached critique. The captures were visually inspected for action priority, typography, empty-state clarity, history readability, control density, and 320-pixel reflow.

The in-app browser transport still could not reach the host-local preview, so no success is claimed for that transport. Equivalent DOM, interaction, viewport, keyboard, and visual checks passed through Playwright.

Responsive captures remain outside Git at:

`C:\Users\ASUS\.codex\visualizations\2026\08\23\01a02fcd-d720-7662-b6c5-f83b14302f37\iroguide-product-activation-phase-5-2026-08-28`

The folder contains the 320-pixel guided workspace and a desktop cached/offline partial-sync workspace. Generated reports, traces, caches, and screenshots are not committed.

## Security, privacy, and residual constraints

- The guide endpoint derives data using the verified server owner ID and never accepts a client owner identifier.
- The public response exposes only categorical activity labels, categories, bounded counts, timestamps, routes, and instructional copy. It excludes brief text, review text, email, UID, document IDs, provider payloads, and signed URLs.
- Comparison and case-study continuation flags remain false until their persistence phases exist; their domain states are already bounded for later integration.
- Cached critiques remain explicitly unverified and are excluded from verified progress metrics.
- Account export is intentionally deferred to Phase 6; the dashboard does not expose a dead export control before the endpoint exists.
- Cross-browser, screen-reader, physical-device, Web Vitals, staging DAST, deployment, and rollback proof remain Phase 7 work.
- No secret, credential, `.env` file, generated report, trace, cache, user image, signed URL, or private content belongs in this commit.

## Gate decision

`PASS` for Phase 5. A signed-in user now receives one honest next step, understands what artifact it creates, can recover from incomplete network/account states without losing readable work, and can reach all current privacy controls. The phase commit and remote push are represented by the Git commit containing this evidence record.
