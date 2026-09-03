# Product activation validation quickstart

**Parent plan:** `docs/plans/iroguide-product-activation-production-plan.md`

This guide validates the implementation incrementally. It does not enable paid providers, Community, billing, or public publishing.

## Prerequisites

- Node.js version supported by the repository and CI.
- Dependencies installed with `npm ci`.
- JDK 21 or newer for Firebase emulator tests.
- Chromium installed with `npm run test:e2e:install`.
- Local environment uses `IROGUIDE_LAUNCH_PROFILE=free`.
- Development-only local auth may be enabled for deterministic browser tests.

## Baseline

```powershell
npm run security:workflow-pins
npm run typecheck
npm run lint
npm test
npm run test:rules
npm run build
```

Expected: all commands pass; the free profile remains the default/fail-closed production capability.

## Scenario 1 — New user reaches useful free value

1. Open the landing page without a session.
2. Confirm the primary message distinguishes free learning from unavailable personalized critique.
3. Create or use a disposable local test account.
4. Select each primary cohort and confirm the recommended sample changes appropriately.
5. Complete one sample critique.
6. Save a design brief.
7. Record and revoke review-access interest.
8. Sign out and in; confirm allowed progress resumes.

Expected: the user completes a meaningful learning task without any upload, provider request, email delivery, source-image Storage write, or Community call.

## Scenario 2 — Every state has a recovery path

Exercise session checking, unauthenticated redirect, loading, empty, partial sync, offline, validation error, rate limit, storage outage, conflict, success, and account-lock states.

Expected: no work is silently lost; focus and announcements identify errors; each recoverable failure has a retry path; permanent gates explain the next useful action.

## Scenario 3 — Accessibility and responsive quality

Test keyboard-only use, screen-reader landmarks and announcements, reduced motion, Windows High Contrast/forced colors where available, 200% zoom, and viewports at 320, 360, 390, 768, 1024, 1280, and 1440 CSS pixels.

Expected: no clipped heading, cookie obstruction, horizontal overflow, focus trap, hover-only content, or motion-dependent instruction.

## Scenario 4 — Free capability denial

```powershell
npm run test:e2e:free
npm run smoke:security
```

Expected: no review upload session or generation job can be created; Community reads/writes remain closed; private account data remains owner-scoped.

## Scenario 5 — Privacy-safe measurement

Enable the approved non-production evidence adapter with test credentials. Complete onboarding, sample, brief, and access-interest flows.

Expected: only allowlisted categorical events are written. Tests reject email, raw UID, brief text, review text, image data, document identifiers, signed URLs, and tokens.

## Scenario 6 — Deletion

Create onboarding, activation, sample, self-review, brief, and access-interest records for a disposable test account. Clear learning history, then exercise full account deletion with one injected adapter failure.

Expected: partial failure is visible and retryable; access locks prevent stale-session reads; terminal retry deletes all owned activation entities.

## Scenario 7 — Provider gate, only after approval

```powershell
npm run eval:reviews:validate
npm run eval:reviews:unit
npm run eval:provider:artifacts
```

Expected before approval: deterministic artifacts only; no paid calls. Activation remains `NO-GO` until 80 owned cases, two human reviewers, approved terms/budget, and all quality/cost/privacy gates pass.

## Final local gate

```powershell
npm run check
npm run test:e2e
npm run test:e2e:free
```

## Staging gate

- Deploy the exact reviewed SHA.
- Run DAST and production smoke against staging.
- Complete the disposable verified-account journey.
- Test rollback to the previously healthy deployment.
- Save immutable deployment, workflow, smoke, accessibility, and rollback evidence.

No production capability is enabled solely because the build is green.
