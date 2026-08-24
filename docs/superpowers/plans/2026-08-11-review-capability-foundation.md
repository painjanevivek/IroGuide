# Review Capability Foundation Implementation Plan

> **Superseded on 2026-08-24:** The completed foundation from this plan was merged through PR #24 at `ba6e9e5`. Remaining work is tracked in `docs/plans/autonomous-completion-implementation-plan.md`. This document is retained as implementation and verification history.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the review/critic system fail closed, avoid unavailable paid operations, stop users before they enter an unusable workflow, and prevent the UI, APIs, readiness endpoint, persistence layer, and smoke tests from drifting apart.

**Architecture:** A pure launch-profile resolver produces one immutable, client-safe capability object. A server adapter is the only place allowed to read `IROGUIDE_LAUNCH_PROFILE`; the root layout distributes that object to client UI, and a centralized server policy guards every critique-generation endpoint after authentication but before entitlement, rate limiting, parsing, provider calls, or persistence. Readiness and production smoke use the same capability contract as their oracle, while two Playwright modes separately prove the enabled development workflow and the disabled production/free workflow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Zod 4, Vitest 4, Playwright 1.61, Firebase Admin/Auth/Firestore/Storage.

**Execution status:** Tasks 1-7 and the local portions of Task 8 are implemented. Verified locally on 2026-08-11 with 160/160 unit tests, 11/11 Firebase rules tests, a clean typecheck/lint/build gate, 7/7 enabled-profile Playwright tests, and 1/1 free-launch Playwright contract. Production deployment plus deployed security and production smoke remain release gates and must not be marked complete from local evidence.

## Global Constraints

- Production defaults to `free` when `IROGUIDE_LAUNCH_PROFILE` is absent or invalid; it must never infer `full` from credentials.
- `full` enables capabilities but never bypasses verified-email or trusted-entitlement authorization.
- `free` must not invoke AI providers, Resend, Firebase Storage upload/read/delete paths, or paid-operation smoke paths.
- Authentication, same-origin, and content-type checks remain ahead of capability denial so anonymous and cross-site callers retain the correct `401`/`403` security behavior.
- Firestore account data, imported drafts, existing critique text, profile controls, documentation, and readable Community content remain available.
- Disabled functionality must be asserted as expected behavior; tests may not silently skip it.
- No new paid dependency or service is introduced.
- Existing strict server provenance and Community publication rules remain unchanged.
- All user-visible unavailable states must be accessible without relying on color and must appear before upload or brief entry.

---

### Task 1: Pure launch-profile contract

**Files:**
- Create: `src/domain/launch-capabilities.ts`
- Create: `src/domain/launch-capabilities.test.ts`
- Create: `src/server/launch-capabilities.ts`

**Interfaces:**
- Produces: `LaunchProfile`, `LaunchCapabilities`, `resolveLaunchCapabilities(input)`, `getServerLaunchCapabilities()`.
- `resolveLaunchCapabilities` consumes only literal configuration values and contains no environment access.
- `getServerLaunchCapabilities` is the sole adapter from `process.env` to the pure resolver.

- [ ] **Step 1: Write failing resolver tests** covering explicit `free`, explicit `full`, non-production default `development`, missing production value defaulting to `free`, and invalid production values failing closed to `free`.

```ts
expect(resolveLaunchCapabilities({ nodeEnv: "production", launchProfile: "unexpected" })).toEqual({
  profile: "free",
  aiCritique: false,
  bugReportEmail: false,
  sourceImageStorage: false,
});
```

- [ ] **Step 2: Run `npm test -- src/domain/launch-capabilities.test.ts`** and verify RED because the resolver does not exist.
- [ ] **Step 3: Implement a frozen lookup-based resolver** with exactly three profiles and no credential inference.
- [ ] **Step 4: Run the focused test** and verify all profile cases pass.
- [ ] **Step 5: Commit with `feat(platform): add fail-closed launch capability contract`**.

### Task 2: Client capability boundary and early review notice

**Files:**
- Create: `src/features/capabilities/launch-capabilities-provider.tsx`
- Create: `src/features/review/review-unavailable.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/features/review/review-studio.tsx`
- Modify: `src/app/globals.css`
- Create: `e2e/free-mode-review.spec.ts`
- Create: `playwright.free.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `LaunchCapabilitiesProvider`, `useLaunchCapabilities()`, and `ReviewUnavailable`.
- `ReviewStudio` becomes a small capability-aware wrapper around an unchanged `ReviewStudioFlow`.

- [ ] **Step 1: Add a free-mode Playwright test** that signs in through local E2E auth, opens `/review/new`, sees `Critique is unavailable during the free launch`, sees Dashboard/Community/Docs navigation, and proves upload controls plus `Start critique` are absent.
- [ ] **Step 2: Run `npm run test:e2e:free`** on a dedicated port and verify RED because the four-step studio still renders.
- [ ] **Step 3: Implement the provider and root-layout injection** from `getServerLaunchCapabilities()`; do not expose environment variables to the browser.
- [ ] **Step 4: Split `ReviewStudio` from `ReviewStudioFlow`** so hooks are never conditional and disabled mode returns the notice before draft reads, file reads, or API submission code can execute.
- [ ] **Step 5: Add minimal responsive/status styling** using existing colors, spacing, focus, and button primitives.
- [ ] **Step 6: Run `npm run test:e2e:free`** and verify the unavailable path passes without any `/api/reviews` request.
- [ ] **Step 7: Commit with `fix(review): stop unavailable critiques before upload`**.

### Task 3: Centralized server review-generation policy

**Files:**
- Create: `src/server/review-generation-policy.ts`
- Create: `src/server/review-generation-policy.test.ts`
- Modify: `src/app/api/reviews/route.ts`
- Modify: `src/app/api/follow-ups/route.ts`
- Modify: `src/app/api/comparisons/route.ts`
- Modify: `src/app/api/improvements/route.ts`
- Modify: `src/app/api/reviews/route.test.ts`
- Create focused route tests beside the other three routes.

**Interfaces:**
- Produces: `enforceReviewGenerationPolicy({ context, eventPrefix, user })` returning either `{ allowed: true }` or `{ allowed: false, response }`.
- Uses the stable free-launch error `AI critique is unavailable during IroGuide's free launch.`.
- Full/development access delegates to `hasReviewGenerationAccess`; no endpoint reimplements entitlement logic.

- [ ] **Step 1: Write failing policy tests** for free-mode denial, full-mode unverified denial, full-mode unentitled denial, and full/development entitled allowance.
- [ ] **Step 2: Write failing route tests** proving all four authenticated endpoints return free-mode `403` before provider/demo generation and that unauthenticated requests remain `401`.
- [ ] **Step 3: Run the focused policy and route suites** and confirm each new behavior fails for the expected missing guard.
- [ ] **Step 4: Implement the central policy and insert it immediately after verified-token authentication** in all four routes.
- [ ] **Step 5: Run focused tests** and verify provider/generator spies remain untouched on denied requests.
- [ ] **Step 6: Commit with `fix(security): centralize critique capability and entitlement gates`**.

### Task 4: Capability-aware persistence and notification side effects

**Files:**
- Modify: `src/server/review-storage.ts`
- Modify: `src/server/review-storage.test.ts`
- Modify: `src/server/bug-report-email.ts`
- Modify: `src/server/bug-report-storage.ts`
- Modify: `src/server/bug-report-storage.test.ts`
- Modify: `src/app/api/bug-reports/route.ts`

**Interfaces:**
- Review persistence always writes permitted Firestore text documents, but calls Storage only when `sourceImageStorage` is enabled.
- Bug-report email produces `status: "disabled"` without calling `fetch` when `bugReportEmail` is disabled.

- [ ] **Step 1: Add failing storage tests** proving free mode writes the review/import document without `sourceImage`, never obtains a bucket, and reports zero image deletions without Storage access.
- [ ] **Step 2: Add failing bug-report tests** proving free mode stores the report, records `emailStatus: "disabled"`, returns success, and never calls `fetch` even if Resend credentials happen to exist.
- [ ] **Step 3: Run the focused suites** and confirm RED at the external side-effect boundaries.
- [ ] **Step 4: Add capability gates around Storage and Resend calls** while preserving existing full-mode paths byte-for-byte.
- [ ] **Step 5: Run the focused suites** and verify both free and full branches pass.
- [ ] **Step 6: Commit with `fix(platform): prevent disabled paid persistence side effects`**.

### Task 5: Readiness as an explicit capability-health contract

**Files:**
- Create: `src/server/readiness.ts`
- Create: `src/server/readiness.test.ts`
- Modify: `src/app/api/readiness/route.ts`
- Modify: `src/server/firebase-admin.ts`
- Modify: `src/app/beta/readiness-diagnostics.tsx`

**Interfaces:**
- Produces: `buildReadiness({ capabilities, checks })` returning `{ ok, capabilities, checks }`.
- Disabled optional checks stay visible but do not participate in `ok`; enabled optional checks are mandatory.
- Core Firebase Admin/Firestore and project matching remain mandatory in every profile.

- [ ] **Step 1: Write failing readiness matrix tests** for healthy free, missing-core free, healthy full, and missing-any-optional full.
- [ ] **Step 2: Run the focused readiness test** and verify RED because readiness currently always requires email and live vision and omits Storage.
- [ ] **Step 3: Implement the pure readiness builder and a non-secret Storage configuration check**.
- [ ] **Step 4: Return `capabilities` from `/api/readiness`** and update diagnostics to distinguish `disabled`, `configured`, and `unhealthy` without exposing credential names.
- [ ] **Step 5: Run readiness tests and `npm run typecheck`**.
- [ ] **Step 6: Commit with `fix(operations): align readiness with launch capabilities`**.

### Task 6: Remove every review dead-end entry point

**Files:**
- Modify: `src/features/auth/user-menu.tsx`
- Modify: `src/features/marketing/landing-scroll-header.tsx`
- Modify: `src/features/dashboard/dashboard.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/features/review/review-studio.tsx`
- Modify or wrap: `src/features/review/follow-up-chat.tsx`
- Modify or wrap: `src/features/review/comparison-panel.tsx`
- Modify or wrap: `src/features/review/improvement-panel.tsx`
- Modify: `e2e/free-mode-review.spec.ts`

**Interfaces:**
- Every CTA reads `useLaunchCapabilities()` or renders inside one capability-aware parent.
- Disabled labels use `Review availability`, `Critique unavailable`, or navigation to existing content; they never claim an action can run.

- [ ] **Step 1: Expand the free-mode E2E test** to cover dashboard, user menu, landing header, and a saved review result; assert no enabled-looking generation CTA is present.
- [ ] **Step 2: Run the E2E test** and verify RED on each misleading entry point.
- [ ] **Step 3: Replace/relabel generation CTAs and render one compact explanation instead of follow-up/comparison/improvement controls** when AI critique is disabled.
- [ ] **Step 4: Gate dashboard source-image URL resolution** so free mode never reads Firebase Storage and existing critique text remains available.
- [ ] **Step 5: Run free-mode E2E and the ordinary local review smoke** to prove disabled and enabled workflows both remain coherent.
- [ ] **Step 6: Commit with `fix(review): remove free-launch critique dead ends`**.

### Task 7: Capability-driven production smoke

**Files:**
- Modify: `scripts/production-smoke.mjs`
- Modify: `scripts/production-smoke.test.mjs`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Produces: `getSmokeExpectations(readinessPayload)` with explicit free/full expectations.
- Production smoke fetches readiness once and uses its capabilities for Firestore/Storage and authenticated-review behavior.

- [ ] **Step 1: Write failing helper tests** for contradictory readiness payloads, free-mode no-Storage expectations, free-mode authenticated `403`, and full-mode entitled success.
- [ ] **Step 2: Run `npm test -- scripts/production-smoke.test.mjs`** and verify RED.
- [ ] **Step 3: Refactor smoke orchestration** so free mode creates verified unentitled users, expects stable `403`, never constructs a Storage client, and still tests Firestore owner isolation; full mode creates verified entitled users and retains the complete provider/persistence/Storage path.
- [ ] **Step 4: Document `IROGUIDE_LAUNCH_PROFILE=free` and the exact activation prerequisites for `full`**.
- [ ] **Step 5: Run helper tests** and verify both mode contracts.
- [ ] **Step 6: Commit with `fix(testing): make production smoke capability-aware`**.

### Task 8: Full verification, deployment gate, and rollback evidence

**Files:**
- Modify: `docs/superpowers/specs/2026-08-11-free-mode-launch-profile-design.md` status to `Approved and implemented` only after all local gates pass.
- Update this plan's checkboxes with actual results.

**Interfaces:**
- No new interface; this task proves the complete system contract.

- [ ] **Step 1: Run focused tests for capabilities, policy, routes, storage, email, readiness, and smoke helpers.**
- [ ] **Step 2: Run `npm run test:e2e:free`** and require zero review API requests in free mode.
- [ ] **Step 3: Run `npm run test:e2e -- e2e/review-smoke.spec.ts`** and require the enabled development/demo path to complete.
- [ ] **Step 4: Run `npm run check`**; investigate any failure instead of bypassing it.
- [ ] **Step 5: Deploy only with `IROGUIDE_LAUNCH_PROFILE=free`**, then run `npm run smoke:security` and `npm run smoke:production` against the deployed URL.
- [ ] **Step 6: Require security smoke `38/38` and production smoke `17/17`; a mismatch between UI/API/readiness capability state blocks release.**
- [ ] **Step 7: Commit verification/docs with `docs(review): record free-launch guardrails and verification`**.

## Permanent Regression Guardrails

1. `IROGUIDE_LAUNCH_PROFILE` is the only operational switch; credentials never enable features.
2. The client receives server-derived capabilities; no `NEXT_PUBLIC_*` duplicate flag exists.
3. Every critique-generation endpoint uses the same policy function and entitlement model.
4. External paid calls sit behind unit-tested negative assertions.
5. CI runs both the enabled local-demo browser journey and disabled free-launch journey.
6. Production smoke derives expectations from readiness and fails on contradictions.
7. Changing `free` to `full` requires an explicit operational approval, provider cost controls, Firebase Storage provisioning/rules verification, Resend verification, an entitled smoke identity, and fresh green security/production smoke reports.
8. Rollback is a deployment revert; operators must never repair an outage by changing an unknown profile to `full`.
