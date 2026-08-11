# IroGuide Free-Mode Launch Profile Design

**Date:** 2026-08-11

**Status:** Approved concept; written specification awaiting review

**Scope:** Production capability gating, readiness, smoke verification, and unavailable-feature UX

## Objective

Launch IroGuide without enabling services that require paid infrastructure or paid AI usage. The application must remain secure and honest: intentionally disabled capabilities must not make production unhealthy, must not be called accidentally, and must not lead users into actions that cannot complete.

The strict review-provenance model remains unchanged. Disabling paid capabilities must never relax authentication, entitlement, provider attestation, ownership, storage, or Community publication rules.

## Product Decision

IroGuide will use a centralized launch profile instead of independent feature flags or credential inference.

### Selected approach: centralized profile

`IROGUIDE_LAUNCH_PROFILE` accepts two production values:

- `free`: disables paid AI generation, source-image cloud storage, and bug-report email delivery.
- `full`: enables those capabilities, after which their credentials and infrastructure become required readiness checks.

Production defaults to `free` when the variable is absent or invalid. Non-production defaults to a development profile that preserves local demo and automated browser workflows without enabling paid production services.

### Alternatives rejected

1. **Independent booleans:** Flexible, but permits contradictory states and configuration drift across the UI, APIs, readiness, and smoke tests.
2. **Infer capability from credentials:** Simple, but cannot distinguish an intentionally disabled feature from an outage or accidentally deleted secret.

## Capability Model

A pure configuration module will derive one immutable capability object from the launch profile:

```ts
type LaunchCapabilities = {
  profile: "free" | "full" | "development";
  aiCritique: boolean;
  bugReportEmail: boolean;
  sourceImageStorage: boolean;
};
```

Rules:

- `free`: all three optional capabilities are `false`.
- `full`: all three are `true` and must be healthy.
- `development`: AI critique is available for explicit local demo/test providers; paid production integrations remain off unless a test explicitly supplies them.
- Unknown production values resolve to `free`, never `full`.
- Capability state is safe to serialize to clients; credentials and provider details are not.

The server configuration is authoritative. A provider/context created in the root layout will expose the same safe capability object to client components, avoiding duplicate public environment variables.

## Server Behavior

### AI critique endpoints

When `aiCritique` is disabled, authenticated requests to these paid-generation paths must fail before invoking a provider:

- `POST /api/reviews`
- `POST /api/follow-ups`
- `POST /api/comparisons`
- `POST /api/improvements`

Existing authentication, same-origin, content-type, and rate-limit ordering remains intact. An unauthenticated caller still receives `401`; an authenticated caller receives `403` with stable free-launch copy. No OpenRouter or custom-provider request may occur.

Entitlement checks remain in place behind the capability gate for future `full` launches. Enabling the full profile does not grant access by itself; verified email and trusted entitlement are still required.

### Review persistence

When `sourceImageStorage` is disabled:

- text review documents and imported drafts may continue to use Firestore;
- source-image bytes are never sent to Firebase Storage;
- persistence returns `imageSavedToAccount: false` without treating that intentional state as an error;
- local browser previews remain local and are disclosed as such;
- Community publication still requires trusted server provenance and never accepts client-imported content.

When enabled, the existing private user-scoped Storage path and rules remain mandatory.

### Bug reports

When `bugReportEmail` is disabled:

- validated reports continue to be stored in Firestore;
- Resend is never called;
- the stored delivery status records an intentional disabled state rather than a configuration failure;
- the public submission remains successful if Firestore storage succeeds.

When enabled, `RESEND_API_KEY`, `BUG_REPORT_TO_EMAIL`, and `BUG_REPORT_FROM_EMAIL` are required.

## Readiness Contract

`GET /api/readiness` will return both enablement and health:

```json
{
  "ok": true,
  "capabilities": {
    "profile": "free",
    "aiCritique": false,
    "bugReportEmail": false,
    "sourceImageStorage": false
  },
  "checks": {
    "accountStorage": true,
    "firebaseProjectMatch": true,
    "bugReportEmail": false,
    "liveVision": false,
    "sourceImageStorage": false
  }
}
```

An enabled capability must pass its health check. A disabled capability is excluded from the readiness conjunction but remains visible as disabled. Core Firebase authentication/Firestore configuration and project matching remain required because the free product still uses accounts, text drafts, saved reviews, and bug-report storage.

Therefore:

- a correctly configured `free` deployment returns `200` even though optional capability health values are `false`;
- a `full` deployment missing any required provider, bucket, or email configuration returns `503`;
- readiness cannot become green merely because credentials are absent; only the explicit profile makes a capability optional.

## User Experience

The root layout will provide launch capabilities to client UI. The free-mode experience will:

- replace the new-review studio with a concise availability notice before upload or brief entry;
- replace or relabel "New review," "Start critique," follow-up, comparison, and improvement actions so they cannot trigger disabled APIs;
- preserve access to existing dashboard history, imported drafts, documentation, profile controls, and readable Community content;
- describe cloud source-image persistence and email delivery as unavailable during the free launch without mentioning internal credentials;
- provide useful navigation to the dashboard, Community, or documentation rather than a disabled control with no explanation.

The notice will use existing typography, spacing, button, and status patterns. It will remain keyboard accessible, responsive, and understandable without relying on color.

## Production Smoke Contract

The smoke suite will fetch readiness once and use the returned capabilities as the test oracle.

In `free` mode:

- readiness must return `200` with `profile=free`;
- the Firebase cross-user test still verifies Firestore owner isolation, while reporting Storage as intentionally disabled and making no bucket request;
- the authenticated review test creates a disposable verified Firebase user without entitlement and expects a `403` free-launch denial;
- no paid provider, Resend, or Firebase Storage operation occurs.

In `full` mode:

- readiness requires all optional services;
- Firestore and Storage owner-isolation checks both run;
- the authenticated review test provisions a verified disposable user with a signed review-entitlement claim, expects review generation and persistence, and cleans up afterward.

Disabled capabilities are asserted behavior, not skipped tests. A free-mode result may state `PASS ... intentionally disabled`, but the assertion fails if an API call is attempted or if the server reports a contradictory capability state.

## Testing Strategy

Implementation will follow red-green-refactor cycles:

1. Pure capability tests for defaults, explicit profiles, and fail-closed invalid production values.
2. Readiness tests proving disabled optional services do not fail `free`, while missing enabled services fail `full`.
3. Route tests proving authenticated free-mode requests receive `403` and provider functions are not called.
4. Storage tests proving free mode saves text documents without uploading image bytes.
5. Bug-report tests proving free mode stores the report and records disabled email delivery without calling Resend.
6. UI tests proving unavailable critique actions are replaced by accessible explanatory navigation.
7. Production-smoke helper tests for free and full expectations.
8. Focused tests, `npm run check`, Playwright smoke, production deployment, `npm run smoke:security`, and `npm run smoke:production`.

## Deployment and Rollback

1. Ship code with production defaulting to `free`.
2. Set `IROGUIDE_LAUNCH_PROFILE=free` explicitly in Vercel Production for operational clarity.
3. Deploy and confirm readiness, security smoke, and production smoke.
4. Roll back by reverting the deployment; do not switch to `full` unless every paid dependency, entitlement workflow, and smoke check is ready.

Future activation of `full` is an operational security change requiring explicit approval, complete credentials, Firebase Storage provisioning and rules verification, provider cost controls, Resend sender verification, and a fresh production smoke.

## Acceptance Criteria

- Production can report healthy without Firebase Storage, Resend, or paid AI configuration when explicitly in `free` mode.
- No disabled paid service is contacted by server routes or production smoke tests.
- Authenticated users cannot bypass free mode or the existing entitlement model.
- Text-only account data continues to work through Firestore.
- All unavailable user actions are removed or replaced with clear, accessible status messaging.
- Production smoke reports all 17 checks successful through positive free-mode assertions, not bypass flags.
- Security smoke remains 38/38 and strict provenance tests remain green.
