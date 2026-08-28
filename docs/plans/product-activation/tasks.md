# Product Activation Execution Ledger

**Status:** Active
**Controlling specification:** `spec.md`
**Architectural plan:** `../iroguide-product-activation-production-plan.md`
**Starting SHA:** `ad469e4286cecf48bcbed38ff55151d7751d7df0`
**Execution branch:** `codex/product-activation`

This ledger preserves all 185 legacy activation tasks, corrects their dependency order into Phases 0-15, closes the discontinuous provider-evaluation numbering, and adds seven requirements introduced by the controlling `PLAN.md`. `[P]` means the task may run in parallel after its listed prerequisites pass. A checked task requires its validation and evidence artifact; documentation alone does not close implementation work.

## Phase gates

| Phase | Purpose | Entry criteria | Exit record |
|---:|---|---|---|
| 0 | Governance and execution artifacts | Reviewed repository at `ad469e4` | `evidence/phase-0/README.md` |
| 1 | Public UX, navigation, and visual corrections | Phase 0 | `evidence/phase-1/README.md` |
| 2 | Secure activation data foundation | Phase 0 | `evidence/phase-2/README.md` |
| 3 | Authentication continuity and onboarding | Phases 1-2 | `evidence/phase-3/README.md` |
| 4 | Truthful free learning experience | Phases 1-3 | `evidence/phase-4/README.md` |
| 5 | Guided dashboard and data controls | Phase 4 | `evidence/phase-5/README.md` |
| 6 | Evidence, account export, and access operations | Phases 2-5 | `evidence/phase-6/README.md` |
| 7 | Free-release production proof | Phases 1-6 | `evidence/phase-7/README.md` |
| 8 | Consented cohort evidence | Phase 7 and owner-approved participants | `evidence/phase-8/README.md` |
| 9 | Provider evaluation gate | Phase 8 and paid-evaluation owner approval | `evidence/phase-9/README.md` |
| 10 | Invite-only live critique | `GATE-PROVIDER-01` = GO | `evidence/phase-10/README.md` |
| 11 | Revision and retention loop | Phase 10 | `evidence/phase-11/README.md` |
| 12 | Private portfolio | Phase 11 | `evidence/phase-12/README.md` |
| 13 | Continuous operations | Begins in Phase 0; closes after latest enabled phase | `evidence/phase-13/README.md` |
| 14 | Community closed track | Retention, staffing, legal, and independent approval | `evidence/phase-14/README.md` |
| 15 | Billing closed track | Provider economics, retention, legal, and business approval | `evidence/phase-15/README.md` |

## Phase 0 — Governance and execution artifacts

**Entry:** Reviewed repository at `ad469e4`
**Shared validation:** `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint`
**Evidence:** `docs/plans/product-activation/evidence/phase-0/README.md`

- [X] `ACT-0001` Create an execution branch from the current reviewed base and record the starting SHA.
  Prerequisites: Reviewed repository at `ad469e4` | Subsystem: `planning` | Source: `ACT-0001`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0002` Confirm the worktree is clean; inventory user-owned changes and preserve them.
  Prerequisites: `ACT-0001` | Subsystem: `planning` | Source: `ACT-0002`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0003` Ratify `.specify/memory/constitution.md` with project-specific product, privacy, accessibility, testing, and activation principles.
  Prerequisites: `ACT-0002` | Subsystem: `planning` | Source: `ACT-0003`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0004` Build a route/capability matrix for public, authenticated-free, invited-live, operator, gated, and unknown states.
  Prerequisites: `ACT-0003` | Subsystem: `planning` | Source: `ACT-0004`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0005` Reconcile product foundation, launch plan, autonomous plan, README, privacy, terms, pricing research, and route copy.
  Prerequisites: `ACT-0004` | Subsystem: `planning` | Source: `ACT-0005`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0006` Mark stale or superseded claims without deleting audit history.
  Prerequisites: `ACT-0005` | Subsystem: `planning` | Source: `ACT-0006`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0007` Capture baseline screenshots at the required responsive widths and record existing defects.
  Prerequisites: `ACT-0006` | Subsystem: `planning` | Source: `ACT-0007`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0008` Record baseline bundle, Core Web Vitals lab results, accessibility scan, and full quality-gate result.
  Prerequisites: `ACT-0007` | Subsystem: `planning` | Source: `ACT-0008`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0009` Verify free production cannot contact provider, Storage creation, email delivery, Community, or billing paths.
  Prerequisites: `ACT-0008` | Subsystem: `planning` | Source: `ACT-0009`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record
- [X] `ACT-0010` [P] Define phase evidence folders, naming, screenshot, and rollback conventions.
  Prerequisites: `ACT-0009` | Subsystem: `planning` | Source: `ACT-0010`
  Verify: `git diff --check`; `npm run security:workflow-pins`; `npm run typecheck`; `npm run lint` | Evidence: phase 0 evidence record

## Phase 1 — Public UX, navigation, and visual corrections

**Entry:** Phase 0
**Shared validation:** focused Playwright; `npm run lint`; `npm run typecheck`
**Evidence:** `docs/plans/product-activation/evidence/phase-1/README.md`

- [X] `ACT-0101` Fix Projects heading collision at intermediate desktop widths.
  Prerequisites: Phase 0 | Subsystem: `public-ui` | Source: `ACT-0101`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0102` Remove Community horizontal document overflow at all target widths.
  Prerequisites: `ACT-0101` | Subsystem: `public-ui` | Source: `ACT-0102`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0103` Reposition, resize, or collapse the cookie notice so it never obscures the sole primary action.
  Prerequisites: `ACT-0102` | Subsystem: `public-ui` | Source: `ACT-0103`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0104` Verify header, footer, mobile menu, account menu, focus order, skip link, and safe-area behavior.
  Prerequisites: `ACT-0103` | Subsystem: `public-ui` | Source: `ACT-0104`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0105` Replace inconsistent `Review availability`, `Mode availability`, and similar labels with one capability-aware vocabulary.
  Prerequisites: `ACT-0104` | Subsystem: `public-ui` | Source: `ACT-0105`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0106` Change the landing primary action in free mode to a useful `Try an example critique` or `Start learning` path.
  Prerequisites: `ACT-0105` | Subsystem: `public-ui` | Source: `ACT-0106`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0107` Keep live-review availability as a secondary transparent action.
  Prerequisites: `ACT-0106` | Subsystem: `public-ui` | Source: `ACT-0107`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0108` Demote Portfolio, Community, Pricing, Projects, and Beta from the primary activation path.
  Prerequisites: `ACT-0107` | Subsystem: `public-ui` | Source: `ACT-0108`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0109` Add truthful `Coming later`, `Research preview`, `Invite only`, or `Unavailable` labels wherever relevant.
  Prerequisites: `ACT-0108` | Subsystem: `public-ui` | Source: `ACT-0109`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0110` [P] Audit 404, unexpected error, loading, no-JavaScript, and offline shells for a clear recovery route.
  Prerequisites: `ACT-0109` | Subsystem: `public-ui` | Source: `ACT-0110`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0111` [P] Audit page metadata, canonical URLs, sitemap, robots/noindex choices, FAQ structured data, and social previews against current availability.
  Prerequisites: `ACT-0110` | Subsystem: `public-ui` | Source: `ACT-0111`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0112` Verify footer support, bug report, privacy, terms, and account/data-control links.
  Prerequisites: `ACT-0111` | Subsystem: `public-ui` | Source: `ACT-0112`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record
- [X] `ACT-0113` [P] Add visual regression screenshots for every repaired route.
  Prerequisites: `ACT-0112` | Subsystem: `public-ui` | Source: `ACT-0113`
  Verify: focused Playwright; `npm run lint`; `npm run typecheck` | Evidence: phase 1 evidence record

## Phase 2 — Secure activation data foundation

**Entry:** Phase 0
**Shared validation:** focused Vitest; `npm run test:rules`; `npm run typecheck`
**Evidence:** `docs/plans/product-activation/evidence/phase-2/README.md`

- [X] `ACT-0201` Implement schemas from `product-activation/data-model.md` with strict versioning and unknown-key rejection.
  Prerequisites: Phase 0 | Subsystem: `domain-api-rules` | Source: `ACT-0501`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0202` Implement authenticated same-origin account-experience read/update contracts.
  Prerequisites: `ACT-0201` | Subsystem: `domain-api-rules` | Source: `ACT-0502`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0203` Implement idempotent access-interest create/revoke contracts.
  Prerequisites: `ACT-0202` | Subsystem: `domain-api-rules` | Source: `ACT-0503`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0204` Add per-account/client mutation limits and bounded body/content-type enforcement.
  Prerequisites: `ACT-0203` | Subsystem: `domain-api-rules` | Source: `ACT-0504`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0205` Add optimistic version conflict handling and client recovery UI.
  Prerequisites: `ACT-0204` | Subsystem: `domain-api-rules` | Source: `ACT-0505`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0206` Extend Firestore rules, indexes, Admin boundaries, and access-lock denial to new collections.
  Prerequisites: `ACT-0205` | Subsystem: `domain-api-rules` | Source: `ACT-0506`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0207` Extend purge-learning-history, purge-review-history, and full-account deletion orchestration.
  Prerequisites: `ACT-0206` | Subsystem: `domain-api-rules` | Source: `ACT-0507`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0208` Make partial cleanup retry-safe; retain the root access lock until terminal deletion.
  Prerequisites: `ACT-0207` | Subsystem: `domain-api-rules` | Source: `ACT-0508`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0209` Add migration/default behavior for accounts created before onboarding exists.
  Prerequisites: `ACT-0208` | Subsystem: `domain-api-rules` | Source: `ACT-0509`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0210` Add structured request events without payload, UID, email, or creative content.
  Prerequisites: `ACT-0209` | Subsystem: `domain-api-rules` | Source: `ACT-0510`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0211` Add cross-user, stale token, replay, duplicate, concurrency, malformed input, oversized body, and adapter-outage tests.
  Prerequisites: `ACT-0210` | Subsystem: `domain-api-rules` | Source: `ACT-0511`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0212` Add support-safe operator aggregates that cannot expose individual creative or account content.
  Prerequisites: `ACT-0211` | Subsystem: `domain-api-rules` | Source: `ACT-0512`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0213` Add fail-closed `guidedLearning` capability and the six server-owned activation collections.
  Prerequisites: `ACT-0212` | Subsystem: `domain-api-rules` | Source: `NEW`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0214` Add seven-day bounded guest sample storage and verified post-auth merge behavior.
  Prerequisites: `ACT-0213` | Subsystem: `domain-api-rules` | Source: `NEW`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record
- [X] `ACT-0215` Import legacy drafts without deleting the source until the destination write is verified.
  Prerequisites: `ACT-0214` | Subsystem: `domain-api-rules` | Source: `NEW`
  Verify: focused Vitest; `npm run test:rules`; `npm run typecheck` | Evidence: phase 2 evidence record

## Phase 3 — Authentication continuity and onboarding

**Entry:** Phases 1-2
**Shared validation:** focused Vitest and Playwright; `npm run typecheck`
**Evidence:** `docs/plans/product-activation/evidence/phase-3/README.md`

- [X] `ACT-0301` Add a capability-aware pre-auth value preview explaining what the workspace provides today.
  Prerequisites: Phases 1-2 | Subsystem: `auth-onboarding` | Source: `ACT-0201`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0302` Preserve a validated same-origin return destination through sign-in/sign-up.
  Prerequisites: `ACT-0301` | Subsystem: `auth-onboarding` | Source: `ACT-0202`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0303` Handle session-checking, provider-popup blocked, duplicate email, weak password, invalid credentials, unverified email, rate limit, reset success, reset failure, and expired session states.
  Prerequisites: `ACT-0302` | Subsystem: `auth-onboarding` | Source: `ACT-0203`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0304` Add an onboarding route or workspace panel with no more than three initial decision screens.
  Prerequisites: `ACT-0303` | Subsystem: `auth-onboarding` | Source: `ACT-0204`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0305` Ask primary role: beginner designer, freelancer, UI/UX designer, or other.
  Prerequisites: `ACT-0304` | Subsystem: `auth-onboarding` | Source: `ACT-0205`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0306` Ask one primary goal and optional preferred categories; avoid unnecessary personal data.
  Prerequisites: `ACT-0305` | Subsystem: `auth-onboarding` | Source: `ACT-0206`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0307` Recommend Friendly, Mentor, or Direct educational presentation while allowing override.
  Prerequisites: `ACT-0306` | Subsystem: `auth-onboarding` | Source: `ACT-0207`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0308` Provide visible step progress, Back, Skip for now, Save and continue, and Restart controls.
  Prerequisites: `ACT-0307` | Subsystem: `auth-onboarding` | Source: `ACT-0208`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0309` Persist only confirmed answers; resume after refresh and sign-out/sign-in.
  Prerequisites: `ACT-0308` | Subsystem: `auth-onboarding` | Source: `ACT-0209`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0310` Move focus and announce step changes and completion correctly.
  Prerequisites: `ACT-0309` | Subsystem: `auth-onboarding` | Source: `ACT-0210`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0311` Ensure browser back/forward, duplicate tabs, slow save, conflict, and offline behavior do not corrupt progress.
  Prerequisites: `ACT-0310` | Subsystem: `auth-onboarding` | Source: `ACT-0211`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0312` Add account-level ability to edit or clear onboarding preferences.
  Prerequisites: `ACT-0311` | Subsystem: `auth-onboarding` | Source: `ACT-0212`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0313` Add owner-scoped rules/API validation, rate limits, idempotency, access-lock, and deletion coverage.
  Prerequisites: `ACT-0312` | Subsystem: `auth-onboarding` | Source: `ACT-0213`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0314` Add cohort-specific but standards-consistent copy and sample recommendations.
  Prerequisites: `ACT-0313` | Subsystem: `auth-onboarding` | Source: `ACT-0214`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record
- [X] `ACT-0315` Instrument privacy-safe onboarding started/completed/skipped events.
  Prerequisites: `ACT-0314` | Subsystem: `auth-onboarding` | Source: `ACT-0215`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 3 evidence record

## Phase 4 — Truthful free learning experience

**Entry:** Phases 1-3
**Shared validation:** focused Vitest, rules, and Playwright; free-side-effect spies
**Evidence:** `docs/plans/product-activation/evidence/phase-4/README.md`

- [X] `ACT-0401` [P] Define three owned, approved, versioned sample designs covering beginner, freelancer, and UI/UX needs.
  Prerequisites: Phases 1-3 | Subsystem: `learning` | Source: `ACT-0301`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0402` Record asset ownership/source, alt text, category, brief, rubric version, evidence regions, critique, actions, and learning goal.
  Prerequisites: `ACT-0401` | Subsystem: `learning` | Source: `ACT-0302`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0403` Validate sample content against the standard review contract and accessibility-risk language.
  Prerequisites: `ACT-0402` | Subsystem: `learning` | Source: `ACT-0303`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0404` Build the public example so visitors can inspect `what`, `evidence`, `why`, and `how` without registering.
  Prerequisites: `ACT-0403` | Subsystem: `learning` | Source: `ACT-0304`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0405` Build the signed-in sample exercise: read brief, predict issue, reveal evidence, choose first fix, complete reflection.
  Prerequisites: `ACT-0404` | Subsystem: `learning` | Source: `ACT-0305`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0406` Clearly label every sample as illustrative and never personalized.
  Prerequisites: `ACT-0405` | Subsystem: `learning` | Source: `ACT-0306`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0407` Provide annotation text equivalents and keyboard-operable finding selection.
  Prerequisites: `ACT-0406` | Subsystem: `learning` | Source: `ACT-0307`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0408` Add a category-driven self-review using `yes`, `no`, `unsure`, and `not applicable`.
  Prerequisites: `ACT-0407` | Subsystem: `learning` | Source: `ACT-0308`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0409` Explain each rubric item in plain language with an example and a verification suggestion.
  Prerequisites: `ACT-0408` | Subsystem: `learning` | Source: `ACT-0309`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0410` Derive at most three self-review priorities without claiming visual analysis.
  Prerequisites: `ACT-0409` | Subsystem: `learning` | Source: `ACT-0310`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0411` Add a design-brief builder for audience, purpose, style, goal, concern, and constraints.
  Prerequisites: `ACT-0410` | Subsystem: `learning` | Source: `ACT-0311`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0412` Reuse the existing bounded draft and compatibility patterns; do not attach an image in free mode.
  Prerequisites: `ACT-0411` | Subsystem: `learning` | Source: `ACT-0312`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0413` Add autosave status, manual retry, version conflict handling, and clear ready/draft states.
  Prerequisites: `ACT-0412` | Subsystem: `learning` | Source: `ACT-0313`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0414` Persist sample/self-review progress privately and support explicit clear-history controls.
  Prerequisites: `ACT-0413` | Subsystem: `learning` | Source: `ACT-0314`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0415` Add a review-access interest action with explicit contact permission, idempotency, revocation, and no email side effect.
  Prerequisites: `ACT-0414` | Subsystem: `learning` | Source: `ACT-0315`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0416` Show meaningful completion: what the user learned, prepared artifact, and next recommended action.
  Prerequisites: `ACT-0415` | Subsystem: `learning` | Source: `ACT-0316`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0417` Verify no free-learning interaction creates upload policy, Storage object, provider call, generation job, Community write, or email.
  Prerequisites: `ACT-0416` | Subsystem: `learning` | Source: `ACT-0317`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record
- [X] `ACT-0418` Add unit, rules, route, browser, accessibility, responsive, no-JavaScript fallback, and deletion tests.
  Prerequisites: `ACT-0417` | Subsystem: `learning` | Source: `ACT-0318`
  Verify: focused Vitest, rules, and Playwright; free-side-effect spies | Evidence: phase 4 evidence record

## Phase 5 — Guided dashboard and data controls

**Entry:** Phase 4
**Shared validation:** focused Vitest and Playwright; `npm run typecheck`
**Evidence:** `docs/plans/product-activation/evidence/phase-5/README.md`

- [X] `ACT-0501` Create a server-derived next-best-action model using capabilities, onboarding, progress, drafts, access, and review history.
  Prerequisites: Phase 4 | Subsystem: `dashboard` | Source: `ACT-0401`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0502` Add a compact first-run checklist with step label, outcome, completion state, and one primary continuation action.
  Prerequisites: `ACT-0501` | Subsystem: `dashboard` | Source: `ACT-0402`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0503` Add `Continue where you left off` for sample, self-review, brief, review job, checklist, comparison, and case-study states.
  Prerequisites: `ACT-0502` | Subsystem: `dashboard` | Source: `ACT-0403`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0504` Show available-now status without repeating blocking banners across every card.
  Prerequisites: `ACT-0503` | Subsystem: `dashboard` | Source: `ACT-0404`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0505` Replace the `No reviews yet` dead end with role-aware sample/brief actions.
  Prerequisites: `ACT-0504` | Subsystem: `dashboard` | Source: `ACT-0405`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0506` Distinguish empty history, filtered-empty, loading, stale cache, partial sync, offline, locked account, and fatal load states.
  Prerequisites: `ACT-0505` | Subsystem: `dashboard` | Source: `ACT-0406`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0507` Preserve existing owned review history and trusted/unverified provenance labels.
  Prerequisites: `ACT-0506` | Subsystem: `dashboard` | Source: `ACT-0407`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0508` Add recent activity using privacy-safe categorical titles; avoid leaking brief content into shared screen contexts.
  Prerequisites: `ACT-0507` | Subsystem: `dashboard` | Source: `ACT-0408`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0509` Add clear links to edit preferences, clear learning history, purge reviews, delete account, privacy, and support.
  Prerequisites: `ACT-0508` | Subsystem: `dashboard` | Source: `ACT-0409`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0510` Ensure header/avatar menus expose text labels, keyboard behavior, escape/outside click, focus return, and long-name handling.
  Prerequisites: `ACT-0509` | Subsystem: `dashboard` | Source: `ACT-0410`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0511` Add skeletons with stable dimensions and error recovery without blanking readable cached data.
  Prerequisites: `ACT-0510` | Subsystem: `dashboard` | Source: `ACT-0411`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0512` Add mobile priority ordering so the next action appears before secondary metrics.
  Prerequisites: `ACT-0511` | Subsystem: `dashboard` | Source: `ACT-0412`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0513` Remove concept cards that cannot produce an artifact in the current profile.
  Prerequisites: `ACT-0512` | Subsystem: `dashboard` | Source: `ACT-0413`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record
- [X] `ACT-0514` Add browser coverage for every dashboard state matrix row in `contracts.md`.
  Prerequisites: `ACT-0513` | Subsystem: `dashboard` | Source: `ACT-0414`
  Verify: focused Vitest and Playwright; `npm run typecheck` | Evidence: phase 5 evidence record

## Phase 6 — Evidence, account export, and access operations

**Entry:** Phases 2-5
**Shared validation:** focused Vitest, API, rules, and authorization tests
**Evidence:** `docs/plans/product-activation/evidence/phase-6/README.md`

- [X] `ACT-0601` Implement the allowlisted activation event taxonomy from `contracts.md`.
  Prerequisites: Phases 2-5 | Subsystem: `evidence-operations` | Source: `ACT-0601`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0602` Reject sensitive/unapproved fields at compile-time where possible and runtime always.
  Prerequisites: `ACT-0601` | Subsystem: `evidence-operations` | Source: `ACT-0602`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0603` Add consent, schema version, environment, deduplication, sampling, and retention behavior.
  Prerequisites: `ACT-0602` | Subsystem: `evidence-operations` | Source: `ACT-0603`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0604` [P] Build operator aggregates for landing-to-sample, sign-up-to-sample, sample completion, brief readiness, access interest, revocation, and seven-day return.
  Prerequisites: `ACT-0603` | Subsystem: `evidence-operations` | Source: `ACT-0604`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0605` Keep `not observed`, `insufficient sample`, and measured zero distinct.
  Prerequisites: `ACT-0604` | Subsystem: `evidence-operations` | Source: `ACT-0605`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0606` Implement owner-scoped versioned JSON account export with bounded pagination and prohibited-field filtering.
  Prerequisites: `ACT-0605` | Subsystem: `evidence-operations` | Source: `NEW`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0607` Implement operator-only access-interest filtering, approve, decline, expire, and revoke actions.
  Prerequisites: `ACT-0606` | Subsystem: `evidence-operations` | Source: `NEW`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0608` Require reason codes, immutable audit, replay protection, and self-approval denial for access decisions.
  Prerequisites: `ACT-0607` | Subsystem: `evidence-operations` | Source: `NEW`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record
- [X] `ACT-0609` Enforce 30-day raw-event and 12-month aggregate retention contracts.
  Prerequisites: `ACT-0608` | Subsystem: `evidence-operations` | Source: `NEW`
  Verify: focused Vitest, API, rules, and authorization tests | Evidence: phase 6 evidence record

## Phase 7 — Free-release production proof

**Entry:** Phases 1-6
**Shared validation:** `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist
**Evidence:** `docs/plans/product-activation/evidence/phase-7/README.md`

- [ ] `ACT-0701` Complete privileged `/api/admin/readiness` proof with authorized operator credentials.
  Prerequisites: Phases 1-6 | Subsystem: `release-readiness` | Source: `ACT-0701`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0702` Complete a disposable verified-account journey: create, verify, sign out/in, update, save, purge, and delete.
  Prerequisites: `ACT-0701` | Subsystem: `release-readiness` | Source: `ACT-0702`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0703` Reverify Community page/API/rules denial and absence of free-profile image/provider/email side effects.
  Prerequisites: `ACT-0702` | Subsystem: `release-readiness` | Source: `ACT-0703`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0704` Run deployed DAST, security smoke, production smoke, and save workflow/deployment URLs.
  Prerequisites: `ACT-0703` | Subsystem: `release-readiness` | Source: `ACT-0704`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0705` Complete `AUT-0312`: emulator, route, concurrency, failure-injection, browser, and free-production job/upload denial tests.
  Prerequisites: `ACT-0704` | Subsystem: `release-readiness` | Source: `ACT-0705`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0706` Exercise real non-production Cloud Storage signed-policy boundaries with an approved bucket.
  Prerequisites: `ACT-0705` | Subsystem: `release-readiness` | Source: `ACT-0706`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0707` Test token revocation and document the application-lock requirement for every operator disable/delete path.
  Prerequisites: `ACT-0706` | Subsystem: `release-readiness` | Source: `ACT-0707`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0708` Run manual keyboard, screen-reader, contrast, 200% zoom, reduced-motion, and physical-device checks.
  Prerequisites: `ACT-0707` | Subsystem: `release-readiness` | Source: `ACT-0708`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0709` Record performance budgets and remediate material regressions.
  Prerequisites: `ACT-0708` | Subsystem: `release-readiness` | Source: `ACT-0709`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0710` Exercise staging rollback to the previous healthy deployment.
  Prerequisites: `ACT-0709` | Subsystem: `release-readiness` | Source: `ACT-0710`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record
- [ ] `ACT-0711` Record residual constraints, owner, severity, workaround, and removal condition.
  Prerequisites: `ACT-0710` | Subsystem: `release-readiness` | Source: `ACT-0711`
  Verify: `npm run check`; `npm run test:e2e`; `npm run test:e2e:free`; DAST and smoke where credentials exist | Evidence: phase 7 evidence record

## Phase 8 — Consented cohort evidence

**Entry:** Phase 7 and owner-approved participants
**Shared validation:** research artifact review and `GATE-EVIDENCE-01`
**Evidence:** `docs/plans/product-activation/evidence/phase-8/README.md`

- [ ] `ACT-0801` [P] Prepare role-specific but non-leading usability scripts and task scenarios.
  Prerequisites: Phase 7 and owner-approved participants | Subsystem: `research` | Source: `ACT-0606`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0802` Obtain owner approval before recruiting or contacting participants.
  Prerequisites: `ACT-0801` | Subsystem: `research` | Source: `ACT-0607`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0803` Capture informed consent, cohort, research window, facilitation level, device class, and known bias.
  Prerequisites: `ACT-0802` | Subsystem: `research` | Source: `ACT-0608`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0804` Observe whether users understand the product and finish the free artifact without assistance.
  Prerequisites: `ACT-0803` | Subsystem: `research` | Source: `ACT-0609`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0805` Test whether the sample creates confidence or merely entertainment.
  Prerequisites: `ACT-0804` | Subsystem: `research` | Source: `ACT-0610`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0806` Test whether prepared briefs and access interest predict return intent.
  Prerequisites: `ACT-0805` | Subsystem: `research` | Source: `ACT-0611`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0807` Separate participant quotes/observations from researcher interpretation.
  Prerequisites: `ACT-0806` | Subsystem: `research` | Source: `ACT-0612`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record
- [ ] `ACT-0808` Produce `GATE-EVIDENCE-01` decision with go, revise, or stop outcome.
  Prerequisites: `ACT-0807` | Subsystem: `research` | Source: `ACT-0613`
  Verify: research artifact review and `GATE-EVIDENCE-01` | Evidence: phase 8 evidence record

## Phase 9 — Provider evaluation gate

**Entry:** Phase 8 and paid-evaluation owner approval
**Shared validation:** `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation
**Evidence:** `docs/plans/product-activation/evidence/phase-9/README.md`

- [ ] `ACT-0901` Expand owned evaluation coverage from 3 to the 80-case target across categories, quality levels, modes, ambiguous briefs, low-resolution inputs, edge cases, and accessibility-risk prompts.
  Prerequisites: Phase 8 and paid-evaluation owner approval | Subsystem: `provider-evaluation` | Source: `ACT-0801`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0902` [P] Verify ownership, consent, hashes, decoded bounds, expected rubric regions, and scenario status for every asset.
  Prerequisites: `ACT-0901` | Subsystem: `provider-evaluation` | Source: `ACT-0802`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0903` [P] Prepare blinded review sheets and reviewer calibration guidance.
  Prerequisites: `ACT-0902` | Subsystem: `provider-evaluation` | Source: `ACT-0803`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0904` Verify deterministic runner hashes, score aggregation, unsupported-finding metrics, and cost/latency capture.
  Prerequisites: `ACT-0903` | Subsystem: `provider-evaluation` | Source: `ACT-0804`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0905` Confirm primary/fallback adapters remain independently disabled and free production remains unaffected.
  Prerequisites: `ACT-0904` | Subsystem: `provider-evaluation` | Source: `ACT-0805`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0906` Run primary and fallback candidates against the complete owned suite.
  Prerequisites: `ACT-0905` | Subsystem: `provider-evaluation` | Source: `ACT-0810`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0907` Adjudicate every case with two independent human reviews and conflict handling.
  Prerequisites: `ACT-0906` | Subsystem: `provider-evaluation` | Source: `ACT-0811`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0908` Analyze evidence grounding, unsupported findings, mode consistency, safety, privacy, latency, retries, fallback, and cost.
  Prerequisites: `ACT-0907` | Subsystem: `provider-evaluation` | Source: `ACT-0812`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0909` Reject any candidate with a blocking failure or unexplained material nondeterminism.
  Prerequisites: `ACT-0908` | Subsystem: `provider-evaluation` | Source: `ACT-0813`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0910` Exercise kill switch, quota exhaustion, cap exhaustion, provider timeout, invalid output, queue drain, deletion, and rollback.
  Prerequisites: `ACT-0909` | Subsystem: `provider-evaluation` | Source: `ACT-0814`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record
- [ ] `ACT-0911` Produce `GATE-PROVIDER-01` decision; keep production free unless explicit `GO`.
  Prerequisites: `ACT-0910` | Subsystem: `provider-evaluation` | Source: `ACT-0815`
  Verify: `npm run eval:reviews:validate`; `npm run eval:reviews:unit`; approved blinded evaluation | Evidence: phase 9 evidence record

## Phase 10 — Invite-only live critique

**Entry:** `GATE-PROVIDER-01` = GO
**Shared validation:** focused Vitest, rules, E2E, accessibility, security, and staging drills
**Evidence:** `docs/plans/product-activation/evidence/phase-10/README.md`

- [ ] `ACT-1001` Add server-derived invite entitlement with expiry, reason, version, and revocation.
  Prerequisites: `GATE-PROVIDER-01` = GO | Subsystem: `review` | Source: `ACT-0901`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1002` Show review quota, availability, privacy boundary, expected processing, and support path before upload.
  Prerequisites: `ACT-1001` | Subsystem: `review` | Source: `ACT-0902`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1003` Implement upload drop/picker, preview, replace, remove, filename, type, size, dimensions, orientation, and unsupported-file states.
  Prerequisites: `ACT-1002` | Subsystem: `review` | Source: `ACT-0903`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1004` Keep large image bytes off Application Functions through approved direct private upload.
  Prerequisites: `ACT-1003` | Subsystem: `review` | Source: `ACT-0904`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1005` Enforce exact owner path, nonce, expiry, digest, content type, byte limit, dimensions, decoded format, and decompression budget.
  Prerequisites: `ACT-1004` | Subsystem: `review` | Source: `ACT-0905`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1006` Guide category and brief entry with examples, limits, draft recovery, and clear optional fields.
  Prerequisites: `ACT-1005` | Subsystem: `review` | Source: `ACT-0906`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1007` Explain Friendly, Mentor, and Direct modes with identical standards and different tone/depth only.
  Prerequisites: `ACT-1006` | Subsystem: `review` | Source: `ACT-0907`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1008` Add confirmation summarizing image, brief, mode, privacy, quota, and cancellation consequences.
  Prerequisites: `ACT-1007` | Subsystem: `review` | Source: `ACT-0908`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1009` Implement queued, validating, analyzing, retrying, saving, complete, canceled, expired, and failed progress states.
  Prerequisites: `ACT-1008` | Subsystem: `review` | Source: `ACT-0909`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1010` Preserve the brief and safe upload reference through recoverable failure.
  Prerequisites: `ACT-1009` | Subsystem: `review` | Source: `ACT-0910`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1011` Present result summary, provider/trust state, `Fix first`, strengths, score map, what/evidence/why/how, annotations, checklist, uncertainty, and follow-up suggestions.
  Prerequisites: `ACT-1010` | Subsystem: `review` | Source: `ACT-0911`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1012` Ensure annotation hover/focus has text equivalents and usable mobile behavior.
  Prerequisites: `ACT-1011` | Subsystem: `review` | Source: `ACT-0912`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1013` Collect per-finding usefulness feedback without creative content in analytics.
  Prerequisites: `ACT-1012` | Subsystem: `review` | Source: `ACT-0913`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1014` Save verified review and source-image metadata atomically or expose retryable partial state.
  Prerequisites: `ACT-1013` | Subsystem: `review` | Source: `ACT-0914`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1015` Add review deletion, account deletion, provider kill-switch, entitlement revocation, quota, and support flows.
  Prerequisites: `ACT-1014` | Subsystem: `review` | Source: `ACT-0915`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record
- [ ] `ACT-1016` Run staging and limited-cohort browser, rules, failure, privacy, accessibility, performance, and support drills.
  Prerequisites: `ACT-1015` | Subsystem: `review` | Source: `ACT-0916`
  Verify: focused Vitest, rules, E2E, accessibility, security, and staging drills | Evidence: phase 10 evidence record

## Phase 11 — Revision and retention loop

**Entry:** Phase 10
**Shared validation:** focused Vitest, rules, E2E, pagination, deletion, and cost tests
**Evidence:** `docs/plans/product-activation/evidence/phase-11/README.md`

- [ ] `ACT-1101` Persist checklist item state, notes, timestamps, and source review version.
  Prerequisites: Phase 10 | Subsystem: `retention` | Source: `ACT-1001`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1102` Add clear issue states: planned, in progress, fixed, intentionally unchanged, needs clarification.
  Prerequisites: `ACT-1101` | Subsystem: `retention` | Source: `ACT-1002`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1103` Implement bounded follow-up conversations using server-loaded owned review references.
  Prerequisites: `ACT-1102` | Subsystem: `retention` | Source: `ACT-1003`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1104` Add stable pagination, message limits, cost limits, citations to issue IDs, deletion propagation, and outage recovery.
  Prerequisites: `ACT-1103` | Subsystem: `retention` | Source: `ACT-1004`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1105` Implement revision upload with explicit original/revised relationship.
  Prerequisites: `ACT-1104` | Subsystem: `retention` | Source: `ACT-1005`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1106` Persist comparison outcomes with rubric/prompt/category/goal compatibility signatures.
  Prerequisites: `ACT-1105` | Subsystem: `retention` | Source: `ACT-1006`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1107` Show improved, remaining, regressed, unmatched, and low-confidence issue matches.
  Prerequisites: `ACT-1106` | Subsystem: `retention` | Source: `ACT-1007`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1108` Withhold score deltas when evidence is incompatible and explain why.
  Prerequisites: `ACT-1107` | Subsystem: `retention` | Source: `ACT-1008`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1109` Preserve uncertainty and prevent unsupported causal claims.
  Prerequisites: `ACT-1108` | Subsystem: `retention` | Source: `ACT-1009`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1110` Add recurring-issue insights only after minimum comparable sample counts.
  Prerequisites: `ACT-1109` | Subsystem: `retention` | Source: `ACT-1010`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1111` Normalize stable categories while preserving rubric versions and migration history.
  Prerequisites: `ACT-1110` | Subsystem: `retention` | Source: `ACT-1011`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1112` Add `Continue revision`, next-action reminders, and second-review completion tracking.
  Prerequisites: `ACT-1111` | Subsystem: `retention` | Source: `ACT-1012`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1113` Measure time to first value, checklist use, follow-up use, second review, seven-day return, and recurring issue improvement.
  Prerequisites: `ACT-1112` | Subsystem: `retention` | Source: `ACT-1013`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1114` Run legacy compatibility, owner isolation, pagination, cost, deletion, accessibility, responsive, and E2E suites.
  Prerequisites: `ACT-1113` | Subsystem: `retention` | Source: `ACT-1014`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record
- [ ] `ACT-1115` Produce `GATE-RETENTION-01` with invest, revise, or stop outcome.
  Prerequisites: `ACT-1114` | Subsystem: `retention` | Source: `ACT-1015`
  Verify: focused Vitest, rules, E2E, pagination, deletion, and cost tests | Evidence: phase 11 evidence record

## Phase 12 — Private portfolio

**Entry:** Phase 11
**Shared validation:** focused Vitest, rules, E2E, export, redaction, and accessibility tests
**Evidence:** `docs/plans/product-activation/evidence/phase-12/README.md`

- [ ] `ACT-1201` Require an owned verified review and compatible comparison before generating evidence-backed claims.
  Prerequisites: Phase 11 | Subsystem: `portfolio` | Source: `ACT-1101`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1202` Create sections for context, first direction, critique, decision, iteration, outcome, and reflection.
  Prerequisites: `ACT-1201` | Subsystem: `portfolio` | Source: `ACT-1102`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1203` Trace every generated statement to an owned source review/comparison or mark it user-authored.
  Prerequisites: `ACT-1202` | Subsystem: `portfolio` | Source: `ACT-1103`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1204` Support edit, reorder, draft autosave, conflict handling, preview, and deletion.
  Prerequisites: `ACT-1203` | Subsystem: `portfolio` | Source: `ACT-1104`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1205` Prevent private source URLs, hidden prompts, operator data, or unapproved client identifiers from entering exports.
  Prerequisites: `ACT-1204` | Subsystem: `portfolio` | Source: `ACT-1105`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1206` Keep publishing disabled until separate consent, revocation, expiry, abuse, and deletion design passes.
  Prerequisites: `ACT-1205` | Subsystem: `portfolio` | Source: `ACT-1106`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1207` Add private export only after redaction, watermark, expiry/revocation, accessible document, and deletion tests.
  Prerequisites: `ACT-1206` | Subsystem: `portfolio` | Source: `ACT-1107`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1208` Validate whether users actually use case studies before promoting Portfolio in navigation.
  Prerequisites: `ACT-1207` | Subsystem: `portfolio` | Source: `ACT-1108`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record
- [ ] `ACT-1209` Produce `GATE-PORTFOLIO-01` decision.
  Prerequisites: `ACT-1208` | Subsystem: `portfolio` | Source: `ACT-1109`
  Verify: focused Vitest, rules, E2E, export, redaction, and accessibility tests | Evidence: phase 12 evidence record

## Phase 13 — Continuous operations

**Entry:** Begins in Phase 0; closes after latest enabled phase
**Shared validation:** scheduled-check configuration, probes, restore and rollback drill evidence
**Evidence:** `docs/plans/product-activation/evidence/phase-13/README.md`

- [ ] `ACT-1301` Add scheduled dependency, secret, workflow-pin, rules, DAST, and capability-drift checks.
  Prerequisites: Begins in Phase 0; closes after latest enabled phase | Subsystem: `operations` | Source: `ACT-1201`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1302` [P] Define SLOs for public readiness, auth, account APIs, activation saves, review completion, queue age, provider latency, deletion, and future gated services.
  Prerequisites: `ACT-1301` | Subsystem: `operations` | Source: `ACT-1202`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1303` [P] Define error budgets, alert thresholds, paging/severity, owners, backups, escalation, and automatic capability rollback.
  Prerequisites: `ACT-1302` | Subsystem: `operations` | Source: `ACT-1203`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1304` Build dashboards for errors, latency, saturation, queues, reservations, cleanup, deletion, and cost without creative content.
  Prerequisites: `ACT-1303` | Subsystem: `operations` | Source: `ACT-1204`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1305` Add synthetic probes for landing, auth boundary, free learning, access interest, review denial/enabled path, deletion, and support.
  Prerequisites: `ACT-1304` | Subsystem: `operations` | Source: `ACT-1205`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1306` Verify backup and restore for owned text, activation state, review/job state, audit state, and future billing ledger.
  Prerequisites: `ACT-1305` | Subsystem: `operations` | Source: `ACT-1206`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1307` Run quarterly deletion, provider kill-switch, Community kill-switch, webhook replay, and deployment rollback drills as applicable.
  Prerequisites: `ACT-1306` | Subsystem: `operations` | Source: `ACT-1207`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1308` [P] Maintain staging parity for headers, rules, storage policy, queues, capabilities, and observability.
  Prerequisites: `ACT-1307` | Subsystem: `operations` | Source: `ACT-1208`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1309` Add release checklist with migration, rollback, smoke, support note, screenshot, accessibility, and change communication.
  Prerequisites: `ACT-1308` | Subsystem: `operations` | Source: `ACT-1209`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1310` [P] Maintain incident runbooks for auth, data exposure, provider degradation, stuck jobs, deletion backlog, cost spike, and deployment failure.
  Prerequisites: `ACT-1309` | Subsystem: `operations` | Source: `ACT-1210`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1311` Add support-safe diagnostics and user-facing status messages.
  Prerequisites: `ACT-1310` | Subsystem: `operations` | Source: `ACT-1211`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1312` Review privacy, terms, retention, provider processing, support promises, and jurisdictional requirements with qualified owners before broad launch.
  Prerequisites: `ACT-1311` | Subsystem: `operations` | Source: `ACT-1212`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record
- [ ] `ACT-1313` Track and safely retire obsolete flags, schemas, migrations, sample versions, and compatibility paths.
  Prerequisites: `ACT-1312` | Subsystem: `operations` | Source: `ACT-1213`
  Verify: scheduled-check configuration, probes, restore and rollback drill evidence | Evidence: phase 13 evidence record

## Phase 14 — Community closed track

**Entry:** Retention, staffing, legal, and independent approval
**Shared validation:** Community denial and safety regression suites
**Evidence:** `docs/plans/product-activation/evidence/phase-14/README.md`

- [ ] `ACT-1401` Keep Community out of primary navigation and user activation metrics.
  Prerequisites: Retention, staffing, legal, and independent approval | Subsystem: `community` | Source: `ACT-1301`
  Verify: Community denial and safety regression suites | Evidence: phase 14 evidence record
- [ ] `ACT-1402` Keep page, API, rules, dispatcher, notification, and projection paths closed by default.
  Prerequisites: `ACT-1401` | Subsystem: `community` | Source: `ACT-1302`
  Verify: Community denial and safety regression suites | Evidence: phase 14 evidence record
- [ ] `ACT-1403` Continue regression tests for consent, withdrawal, blocking, reporting, moderation, appeals, counters, deletion, and audits.
  Prerequisites: `ACT-1402` | Subsystem: `community` | Source: `ACT-1303`
  Verify: Community denial and safety regression suites | Evidence: phase 14 evidence record
- [ ] `ACT-1404` Configure no scheduled dispatcher while rollout is closed.
  Prerequisites: `ACT-1403` | Subsystem: `community` | Source: `ACT-1304`
  Verify: Community denial and safety regression suites | Evidence: phase 14 evidence record
- [ ] `ACT-1405` Require retention evidence, named Trust and Safety owner/backup, policy, response windows, legal/privacy contact, incident runbook, load tests, worker proof, alert routing, and independent approvals.
  Prerequisites: `ACT-1404` | Subsystem: `community` | Source: `ACT-1305`
  Verify: Community denial and safety regression suites | Evidence: phase 14 evidence record
- [ ] `ACT-1406` If and only if `evaluateCommunityLaunch` is launchable, create a separate staff-only rollout commit and monitor before any wider step.
  Prerequisites: `ACT-1405` | Subsystem: `community` | Source: `ACT-1306`
  Verify: Community denial and safety regression suites | Evidence: phase 14 evidence record

## Phase 15 — Billing closed track

**Entry:** Provider economics, retention, legal, and business approval
**Shared validation:** billing absence check and closed-gate documentation
**Evidence:** `docs/plans/product-activation/evidence/phase-15/README.md`

- [ ] `ACT-1501` Do not install a billing SDK or advertise purchasable plans before `GATE-BILLING-01`.
  Prerequisites: Provider economics, retention, legal, and business approval | Subsystem: `billing` | Source: `ACT-1401`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1502` Keep Pricing labeled as research and remove purchase-shaped disabled controls from primary journeys.
  Prerequisites: `ACT-1501` | Subsystem: `billing` | Source: `ACT-1402`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1503` After approval, write provider-specific ADR and threat model.
  Prerequisites: `ACT-1502` | Subsystem: `billing` | Source: `ACT-1403`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1504` Implement authenticated same-origin checkout/portal sessions and raw-body signed replay-safe webhooks.
  Prerequisites: `ACT-1503` | Subsystem: `billing` | Source: `ACT-1404`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1505` Derive entitlements server-side; payment redirect/client labels never grant access.
  Prerequisites: `ACT-1504` | Subsystem: `billing` | Source: `ACT-1405`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1506` Add atomic usage reservation, commit, release, refund, dispute, and reconciliation.
  Prerequisites: `ACT-1505` | Subsystem: `billing` | Source: `ACT-1406`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1507` Cover trial, renewal, grace, past due, cancel, refund, tax display, invoice, export, deletion, ordering, duplication, and outage states.
  Prerequisites: `ACT-1506` | Subsystem: `billing` | Source: `ACT-1407`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1508` Add billing SLOs, webhook-age, entitlement-divergence, duplicate-ledger, cost/revenue, refund, and dispute alerts.
  Prerequisites: `ACT-1507` | Subsystem: `billing` | Source: `ACT-1408`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record
- [ ] `ACT-1509` Enable only through a separate approved production rollout commit.
  Prerequisites: `ACT-1508` | Subsystem: `billing` | Source: `ACT-1409`
  Verify: billing absence check and closed-gate documentation | Evidence: phase 15 evidence record

## Requirement traceability

| Requirement range | Primary tasks | Verification evidence |
|---|---|---|
| FR-001–FR-005 | ACT-0001–ACT-0113 | Phases 0–1 |
| FR-006–FR-011 | ACT-0201–ACT-0315 | Phases 2–3 |
| FR-012–FR-021 | ACT-0401–ACT-0418 | Phase 4 |
| FR-022–FR-025 | ACT-0501–ACT-0514 | Phase 5 |
| FR-026–FR-032 | ACT-0601–ACT-0612 | Phase 6 |
| FR-033–FR-040 | ACT-0701–ACT-1509 | Phases 7–15 |
| NFR-001–NFR-008 | Cross-cutting tasks in every phase | Per-phase security, accessibility, reliability, performance, and rollback evidence |

## Legacy ID reconciliation

All 185 source IDs are present exactly once. The mapping is grouped below to preserve audit history while making the corrected phase number visible in the authoritative ID.

- `ACT-0001 -> ACT-0001`
- `ACT-0002 -> ACT-0002`
- `ACT-0003 -> ACT-0003`
- `ACT-0004 -> ACT-0004`
- `ACT-0005 -> ACT-0005`
- `ACT-0006 -> ACT-0006`
- `ACT-0007 -> ACT-0007`
- `ACT-0008 -> ACT-0008`
- `ACT-0009 -> ACT-0009`
- `ACT-0010 -> ACT-0010`
- `ACT-0101 -> ACT-0101`
- `ACT-0102 -> ACT-0102`
- `ACT-0103 -> ACT-0103`
- `ACT-0104 -> ACT-0104`
- `ACT-0105 -> ACT-0105`
- `ACT-0106 -> ACT-0106`
- `ACT-0107 -> ACT-0107`
- `ACT-0108 -> ACT-0108`
- `ACT-0109 -> ACT-0109`
- `ACT-0110 -> ACT-0110`
- `ACT-0111 -> ACT-0111`
- `ACT-0112 -> ACT-0112`
- `ACT-0113 -> ACT-0113`
- `ACT-0501 -> ACT-0201`
- `ACT-0502 -> ACT-0202`
- `ACT-0503 -> ACT-0203`
- `ACT-0504 -> ACT-0204`
- `ACT-0505 -> ACT-0205`
- `ACT-0506 -> ACT-0206`
- `ACT-0507 -> ACT-0207`
- `ACT-0508 -> ACT-0208`
- `ACT-0509 -> ACT-0209`
- `ACT-0510 -> ACT-0210`
- `ACT-0511 -> ACT-0211`
- `ACT-0512 -> ACT-0212`
- `ACT-0201 -> ACT-0301`
- `ACT-0202 -> ACT-0302`
- `ACT-0203 -> ACT-0303`
- `ACT-0204 -> ACT-0304`
- `ACT-0205 -> ACT-0305`
- `ACT-0206 -> ACT-0306`
- `ACT-0207 -> ACT-0307`
- `ACT-0208 -> ACT-0308`
- `ACT-0209 -> ACT-0309`
- `ACT-0210 -> ACT-0310`
- `ACT-0211 -> ACT-0311`
- `ACT-0212 -> ACT-0312`
- `ACT-0213 -> ACT-0313`
- `ACT-0214 -> ACT-0314`
- `ACT-0215 -> ACT-0315`
- `ACT-0301 -> ACT-0401`
- `ACT-0302 -> ACT-0402`
- `ACT-0303 -> ACT-0403`
- `ACT-0304 -> ACT-0404`
- `ACT-0305 -> ACT-0405`
- `ACT-0306 -> ACT-0406`
- `ACT-0307 -> ACT-0407`
- `ACT-0308 -> ACT-0408`
- `ACT-0309 -> ACT-0409`
- `ACT-0310 -> ACT-0410`
- `ACT-0311 -> ACT-0411`
- `ACT-0312 -> ACT-0412`
- `ACT-0313 -> ACT-0413`
- `ACT-0314 -> ACT-0414`
- `ACT-0315 -> ACT-0415`
- `ACT-0316 -> ACT-0416`
- `ACT-0317 -> ACT-0417`
- `ACT-0318 -> ACT-0418`
- `ACT-0401 -> ACT-0501`
- `ACT-0402 -> ACT-0502`
- `ACT-0403 -> ACT-0503`
- `ACT-0404 -> ACT-0504`
- `ACT-0405 -> ACT-0505`
- `ACT-0406 -> ACT-0506`
- `ACT-0407 -> ACT-0507`
- `ACT-0408 -> ACT-0508`
- `ACT-0409 -> ACT-0509`
- `ACT-0410 -> ACT-0510`
- `ACT-0411 -> ACT-0511`
- `ACT-0412 -> ACT-0512`
- `ACT-0413 -> ACT-0513`
- `ACT-0414 -> ACT-0514`
- `ACT-0601 -> ACT-0601`
- `ACT-0602 -> ACT-0602`
- `ACT-0603 -> ACT-0603`
- `ACT-0604 -> ACT-0604`
- `ACT-0605 -> ACT-0605`
- `ACT-0701 -> ACT-0701`
- `ACT-0702 -> ACT-0702`
- `ACT-0703 -> ACT-0703`
- `ACT-0704 -> ACT-0704`
- `ACT-0705 -> ACT-0705`
- `ACT-0706 -> ACT-0706`
- `ACT-0707 -> ACT-0707`
- `ACT-0708 -> ACT-0708`
- `ACT-0709 -> ACT-0709`
- `ACT-0710 -> ACT-0710`
- `ACT-0711 -> ACT-0711`
- `ACT-0606 -> ACT-0801`
- `ACT-0607 -> ACT-0802`
- `ACT-0608 -> ACT-0803`
- `ACT-0609 -> ACT-0804`
- `ACT-0610 -> ACT-0805`
- `ACT-0611 -> ACT-0806`
- `ACT-0612 -> ACT-0807`
- `ACT-0613 -> ACT-0808`
- `ACT-0801 -> ACT-0901`
- `ACT-0802 -> ACT-0902`
- `ACT-0803 -> ACT-0903`
- `ACT-0804 -> ACT-0904`
- `ACT-0805 -> ACT-0905`
- `ACT-0810 -> ACT-0906`
- `ACT-0811 -> ACT-0907`
- `ACT-0812 -> ACT-0908`
- `ACT-0813 -> ACT-0909`
- `ACT-0814 -> ACT-0910`
- `ACT-0815 -> ACT-0911`
- `ACT-0901 -> ACT-1001`
- `ACT-0902 -> ACT-1002`
- `ACT-0903 -> ACT-1003`
- `ACT-0904 -> ACT-1004`
- `ACT-0905 -> ACT-1005`
- `ACT-0906 -> ACT-1006`
- `ACT-0907 -> ACT-1007`
- `ACT-0908 -> ACT-1008`
- `ACT-0909 -> ACT-1009`
- `ACT-0910 -> ACT-1010`
- `ACT-0911 -> ACT-1011`
- `ACT-0912 -> ACT-1012`
- `ACT-0913 -> ACT-1013`
- `ACT-0914 -> ACT-1014`
- `ACT-0915 -> ACT-1015`
- `ACT-0916 -> ACT-1016`
- `ACT-1001 -> ACT-1101`
- `ACT-1002 -> ACT-1102`
- `ACT-1003 -> ACT-1103`
- `ACT-1004 -> ACT-1104`
- `ACT-1005 -> ACT-1105`
- `ACT-1006 -> ACT-1106`
- `ACT-1007 -> ACT-1107`
- `ACT-1008 -> ACT-1108`
- `ACT-1009 -> ACT-1109`
- `ACT-1010 -> ACT-1110`
- `ACT-1011 -> ACT-1111`
- `ACT-1012 -> ACT-1112`
- `ACT-1013 -> ACT-1113`
- `ACT-1014 -> ACT-1114`
- `ACT-1015 -> ACT-1115`
- `ACT-1101 -> ACT-1201`
- `ACT-1102 -> ACT-1202`
- `ACT-1103 -> ACT-1203`
- `ACT-1104 -> ACT-1204`
- `ACT-1105 -> ACT-1205`
- `ACT-1106 -> ACT-1206`
- `ACT-1107 -> ACT-1207`
- `ACT-1108 -> ACT-1208`
- `ACT-1109 -> ACT-1209`
- `ACT-1201 -> ACT-1301`
- `ACT-1202 -> ACT-1302`
- `ACT-1203 -> ACT-1303`
- `ACT-1204 -> ACT-1304`
- `ACT-1205 -> ACT-1305`
- `ACT-1206 -> ACT-1306`
- `ACT-1207 -> ACT-1307`
- `ACT-1208 -> ACT-1308`
- `ACT-1209 -> ACT-1309`
- `ACT-1210 -> ACT-1310`
- `ACT-1211 -> ACT-1311`
- `ACT-1212 -> ACT-1312`
- `ACT-1213 -> ACT-1313`
- `ACT-1301 -> ACT-1401`
- `ACT-1302 -> ACT-1402`
- `ACT-1303 -> ACT-1403`
- `ACT-1304 -> ACT-1404`
- `ACT-1305 -> ACT-1405`
- `ACT-1306 -> ACT-1406`
- `ACT-1401 -> ACT-1501`
- `ACT-1402 -> ACT-1502`
- `ACT-1403 -> ACT-1503`
- `ACT-1404 -> ACT-1504`
- `ACT-1405 -> ACT-1505`
- `ACT-1406 -> ACT-1506`
- `ACT-1407 -> ACT-1507`
- `ACT-1408 -> ACT-1508`
- `ACT-1409 -> ACT-1509`

## Ledger rules

- Mark a task `[X]` only after its stated validation passes and its evidence is recorded.
- A phase may be marked `gate-closed` only after all authorized preparation is complete and the exact external approval, credential, participant, budget, legal, or operating dependency is named.
- Never infer provider, Community, billing, email, publishing, or participant-outreach authority from completion of code.
- Stage only phase-owned files; review the full staged diff for secrets, capability bypasses, user changes, generated output, and unrelated formatting.
- Push only a green focused Conventional Commit. Never force-push.
