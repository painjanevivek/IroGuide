# Phase 4 Evidence — Truthful Free Learning Experience

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `4a40dd9965b4723880d64c5fbbc87a6d66d65be8`
**Branch:** `codex/product-activation`
**Rollback:** redeploy or check out the starting SHA. The server-owned Phase 2 records remain versioned; disabling `IROGUIDE_GUIDED_LEARNING_ENABLED` hides account tools while retaining the static public example.

## Entry and capability outcome

Phases 0–3 passed and were pushed before implementation. This phase enables useful free learning through owned examples, explicit user answers, and image-free preparation. It does not enable personalized analysis, uploads, Storage, provider work, email delivery, Community, billing, or public publishing.

## Implemented flow

- Registered the three repository-controlled samples `form-together-friendly`, `fieldnote-mentor`, and `signal-noise-direct` with version, dimensions, role, category, mode, ownership, brief, alt text, learning outcome, evidence regions, findings, and first actions.
- Added `/learn` as a canonical public route and a useful destination from public navigation, account navigation, the sitemap, hero actions, critique-mode actions, and gated review calls to action.
- Added a complete registration-free example showing `what`, visible `evidence`, `why`, and `how`, with explicit “Example critique—not an analysis of your work” language and a server-rendered no-JavaScript fallback.
- Added role-aware prediction, evidence reveal, first-fix choice, and reflection practice. Guest progress is bounded to seven days on the device; authenticated progress uses the existing owner-scoped Phase 2 endpoint.
- Added plain-language category rubrics with `yes`, `no`, `unsure`, and `not applicable` answers, examples, verification suggestions, and at most three user-answer-derived priorities.
- Added an image-free design-brief builder for audience, purpose, style, goal, concern, constraints, and guidance style, including autosave, manual save, ready, offline, conflict, retry, reset, and deletion states.
- Added explicit review-access interest, categorical work intent, affirmative account-storage permission, immediate revocation, and truthful no-email/no-provider/no-reservation language.
- Added full learning-history deletion controls and privacy-safe sample, self-review, brief, and access-interest evidence events.
- Added responsive visual treatment using the existing typography, purple/lime palette, spacing language, focus behavior, reduced-motion handling, forced-color boundaries, and progressive rendering.

## Validation evidence

| Command or check | Result |
|---|---|
| Focused Phase 4 Vitest | Passed: 3 files / 19 tests covering sample ownership and metadata, role selection, rubric IDs, maximum-three priorities, strict client response parsing, owner-field rejection, clear-history requests, and evidence events |
| `npm run test:e2e:free` | Passed: 20 Chromium scenarios, including four dedicated free-learning scenarios for no-JavaScript rendering, bounded guest storage, the complete signed-in flow, keyboard/focus, forced colors, reduced motion, 200% zoom, responsive overflow, and zero forbidden external requests |
| `npm run typecheck` | Passed with generated Next.js 16.3.2 route types |
| `npm run lint` | Passed with zero warnings |
| `npm run check` | Passed: immutable workflow pins, evaluation-manifest validation, typecheck, lint, 95 unit files / 386 tests, 42 Firebase rules tests, and production build with `/learn` included |
| `git diff --check` | Passed; line-ending notices only |

## Browser and visual inspection

The complete flow was exercised in Chromium against the local Next.js server using deterministic owner-scoped API fixtures. The in-app browser connection could not reach the host-local preview during this phase, so no success is claimed for that transport; equivalent browser DOM, interaction, viewport, and visual checks passed through the repository Playwright runner.

Responsive captures were visually inspected and are stored outside Git at:

`C:\Users\ASUS\.codex\visualizations\2026\08\23\01a02fcd-d720-7662-b6c5-f83b14302f37\iroguide-product-activation-phase-4-2026-08-28`

The folder contains a 390-pixel guest exercise and a desktop signed-in access-state capture. Generated reports, traces, caches, and screenshots are not committed.

## Security, privacy, and residual constraints

- Browser clients accept only strict public response shapes and reject internal owner and mutation fields.
- Phase 2 authentication, same-origin enforcement, body bounds, account locks, rate limits, optimistic revisions, idempotency, no-store responses, direct-client Firebase denial, purge, and account-deletion coverage remain the persistence boundary.
- The free-learning browser scenario records every request and fails if it observes review upload, review job, Community, billing, checkout, or email work.
- Sample images are repository-controlled teaching assets. Self-review priorities are derived only from explicit answers and never imply that IroGuide inspected a design.
- Text fields explicitly warn against client names, confidential details, and links. No secret, credential, `.env` file, report, trace, cache, signed URL, user image, or private content belongs in this commit.
- Cross-browser and real-device production proof remains Phase 7 work; this phase proves Chromium behavior and the code-level accessibility variants locally.

## Gate decision

`PASS` for Phase 4. The free experience now gives new users a complete, truthful, resumable learning loop and a prepared artifact without activating any provider or launch-gated side effect. The phase commit and remote push are represented by the Git commit containing this evidence record.
