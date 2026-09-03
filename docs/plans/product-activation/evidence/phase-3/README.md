# Phase 3 Evidence — Authentication Continuity and Onboarding

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `6284172a2847f91fbba20371fb76e3199f0b5dc2`
**Branch:** `codex/product-activation`
**Rollback:** redeploy or check out the starting SHA. Account-experience records are versioned and remain readable by the Phase 2 API; `guidedLearning` remains fail-closed unless explicitly enabled.

## Entry and capability outcome

Phases 0–2 passed and were pushed before implementation. This phase adds the authenticated learning setup that uses Phase 2 persistence. It enables no provider request, upload, Storage object, email, Community action, billing action, or public publishing.

## Implemented flow

- Preserved a strictly validated same-origin `next` destination through Google, email sign-in, email sign-up, manual-provider switching, and password-reset action URLs. External, protocol-relative, backslash, auth-loop, and oversized destinations fall back safely.
- Added a capability-aware `/onboarding` route with three decisions: current role, primary goal plus optional categories, and critique presentation style.
- Added role-aware, standards-consistent recommendations for beginner designers, freelancers, UI/UX designers, and an `other` path.
- Added Back, browser back/forward, Skip, Save and continue, Finish, Restart, Edit, and Clear preferences behavior. Only confirmed steps persist.
- Resumed `in-progress` and `skipped` accounts from the last confirmed step after refresh or sign-out/sign-in.
- Imported valid seven-day guest sample progress on the first confirmed write and removed the browser copy only after the server response verified the merge.
- Added focus movement, polite step announcements, explicit progress, 44-pixel controls, responsive reflow, and reduced-motion-compatible interaction.
- Reserved a route-aware consent-notice safe area so the cookie panel cannot cover onboarding headings or controls at desktop or mobile widths.
- Added visible session-checking, unavailable, unverified-email, offline, retry, stale-version, and duplicate-tab conflict states while retaining entered answers.
- Added privacy-safe started/completed/skipped evidence events and avoided employer, client, demographic, biography, and confidential-project fields.
- Separated onboarding completion from whole-program completion so finishing the three decisions correctly advances to `inspect-sample` rather than falsely completing activation.

## Validation evidence

| Command or check | Result |
|---|---|
| Focused Phase 3 Vitest | Passed: auth-return validation, cohort recommendations, client parsing/error handling, guest merge, optimistic revision, restart/clear, and activation-completion separation |
| `npx playwright test e2e/onboarding.spec.ts --project=chromium` | Passed: 4 scenarios covering sign-up return, three-step completion, guest import, resume, completed-path editing, browser back, mobile/offline recovery, focus movement, and open-redirect denial |
| `npm run typecheck` | Passed with generated Next.js 16.3.2 route types |
| `npm run lint` | Passed with zero warnings |
| `npm run check` | Passed: workflow pins, evaluation manifest, typecheck, lint, 93 unit files / 379 tests, 42 Firebase rules tests, and production build |
| `git diff --check` | Passed; line-ending notices only |

## Browser and visual inspection

The in-app browser verified the pre-auth learning value proposition and the account-storage-unavailable recovery state against the local Next.js process. The complete authenticated flow was exercised through deterministic browser tests with mocked owner-scoped persistence because local Firebase Admin storage is intentionally not configured in this checkout.

Responsive captures are stored outside Git at:

`C:\Users\ASUS\.codex\visualizations\2026\08\23\01a02fcd-d720-7662-b6c5-f83b14302f37\iroguide-product-activation-phase-3-2026-08-28`

The folder contains the desktop role decision and 390-pixel resumed-goal decision. Generated Playwright reports, traces, caches, and screenshots are not committed.

## Security, privacy, and residual constraints

- The browser client parses strict public response shapes and rejects returned owner/internal mutation fields.
- Mutations retain Phase 2 authentication, same-origin, body-bound, rate-limit, account-lock, optimistic-revision, idempotency, and no-store controls.
- BroadcastChannel messages contain only the latest numeric revision; no answers, account identifiers, or creative content cross tabs.
- Onboarding collects categorical learning preferences only. Unverified email is disclosed truthfully and does not falsely unlock live critique.
- Popup-blocked, duplicate-email, weak-password, invalid-credential, reset, and lockout mappings remain centralized in the existing hardened authentication provider and focused auth browser coverage.
- No secret, credential, `.env` file, report, trace, cache, signed URL, user image, or private content belongs in this commit.

## Gate decision

`PASS` for Phase 3. The onboarding path is bounded, role-aware, resumable, accessible, private, conflict-aware, and safe to use as the entry point for Phase 4 free learning. The phase commit and remote push are represented by the Git commit containing this evidence record.
