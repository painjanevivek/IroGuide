# Product activation contracts

**Status:** Proposed
**Parent plan:** `docs/plans/iroguide-product-activation-production-plan.md`

## UI contract — global availability

Every route consumes the same server-owned capability snapshot. The UI must expose one of these states:

- `free-learning`: sample learning, self-review, brief builder, account workspace, and data controls available; personalized AI critique unavailable.
- `invite-only-review`: free learning plus live critique for verified entitled accounts.
- `review-paused`: saved data remains available; no new upload or generation.
- `community-closed`: no public feed reads or writes.

Credentials and client-side state never change a capability.

## UI contract — primary navigation

Unauthenticated: `How it works`, `Example critique`, `Learn`, `Sign in`, `Create workspace`.

Authenticated free user: `Workspace`, `Learn`, `Help`, account menu. The primary CTA is `Continue your next step`, not `Review availability`.

Gated Portfolio, Community, Pricing, and Beta diagnostics are excluded from the primary task navigation. Direct routes remain truthful and provide one useful return action.

## UI contract — onboarding

- Maximum three short decision screens before entering the workspace.
- Visible progress and a `Skip for now` action on every nonessential step.
- Back navigation preserves answers.
- Refresh and sign-out/sign-in resume from the last confirmed step.
- Completing or skipping moves focus to the workspace heading and announces success.
- Role selection changes recommendations only; it never changes critique quality or safety.
- No sensitive demographic, employer, client, or confidential-project question.

## UI contract — free learning path

1. Select an owned sample appropriate to the user's role.
2. Read the brief and predict the first issue.
3. Reveal `what`, `evidence`, `why`, and `how` progressively.
4. Mark the first repair action.
5. Complete a rubric self-review or prepare a brief.
6. Save progress and return to the dashboard.

Every sample is labeled `Example critique—not an analysis of your work`.

## UI contract — dashboard state matrix

| State | Required presentation | Primary action |
| --- | --- | --- |
| Session checking | Stable skeleton; no layout jump | None |
| New account | Role-aware welcome and activation checklist | Start recommended sample |
| Onboarding incomplete | Resume card with saved progress | Continue setup |
| Sample in progress | Last finding/action and progress | Continue sample |
| Sample complete, no brief | Completion evidence and next step | Prepare a brief |
| Brief ready, no access interest | Brief summary without sensitive analytics | Request review access |
| Access requested | Honest status and useful learning alternatives | Continue self-review |
| Invite entitled | Live review CTA plus quota/status | Start private review |
| Existing reviews | Continue latest action, history, learning summary | Continue latest review |
| Loading | Skeleton with matching dimensions | None |
| Partial sync | Data remains readable; retry is explicit | Retry sync |
| Offline | Local-safe content only; no false save confirmation | Retry when online |
| Error | Plain-language cause, retained work, recovery | Retry or contact support |

## UI contract — forms

- Persistent visible labels; placeholders are examples only.
- Required and optional fields are explicitly marked.
- Character counts appear before limits are reached.
- Validation is field-specific, summarized on submit, and moves focus to the first invalid field.
- Buttons prevent duplicate submission while retaining a readable busy label.
- Enter key submits only where expected; multiline fields preserve newlines.
- User text is trimmed, normalized, and bounded without silently discarding meaningful content.
- Success messages identify what was saved and where it can be found.
- Destructive actions describe scope, recovery, and finality before confirmation.

## API contract — `GET /api/account/experience`

Authenticated, no-store response containing the user's onboarding profile, activation program progress, access-interest state, and capability-derived next action. It never returns operator notes or aggregate cohort data.

Errors: `401` unauthenticated, `423` account access locked, `503` configured storage unavailable. Responses include request ID but no secret configuration.

## API contract — `PATCH /api/account/experience`

Authenticated same-origin JSON request. Accepts versioned, bounded onboarding or activation changes. Rejects unknown keys. Uses optimistic versioning or idempotency key to prevent last-write surprises.

Errors: `400` schema failure, `401`, `409` version conflict, `413` bounded body exceeded, `423`, `429`, `503`.

## API contract — `POST /api/access-interest`

Authenticated, verified-session, same-origin, rate-limited, idempotent request. Stores categorical interest and explicit contact permission. Does not send email in the free profile. Repeated requests return the existing current state.

Errors: `400`, `401`, `409` incompatible program version, `423`, `429`, `503`.

## API contract — `DELETE /api/access-interest`

Authenticated same-origin revocation. Immediately removes contact permission and sets status to `revoked`. Idempotent success for an already revoked or missing record.

## API contract — `/api/self-reviews`

- `GET` returns a bounded newest-first owner list or one owner record by opaque ID.
- `POST` creates one image-free session with an idempotency key.
- `PATCH` requires the current revision and accepts only bounded rubric responses, status, and the optional goal label.
- `DELETE` removes one owner record or, with an explicit clear-history command, all owner sessions through bounded retryable cleanup.

All responses are `no-store`. Unknown keys, client-supplied user IDs, images, URLs, and unsupported rubric items are rejected. Conflicting revisions return `409`; a missing owner record is indistinguishable from another user's record.

## API contract — `/api/design-briefs`

- `GET` returns a bounded owner list or one draft by opaque ID.
- `PUT` creates or replaces a draft only with a matching revision/idempotency contract.
- `DELETE` removes one owner draft.

The free contract accepts audience, purpose, style, goal, concern, constraints, mode, step, flow version, and status. It rejects image references, signed URLs, provider inputs, and unbounded free-form content. A legacy draft remains intact until the new destination record is read back and validated.

## API contract — `POST /api/account/export`

Authenticated, same-origin, recent-session, rate-limited operation returning a versioned JSON attachment with `Cache-Control: no-store` and `Content-Disposition: attachment`. It includes only owner-scoped profile, activation progress, self-reviews, briefs, access state, critique text/provenance, comparisons, messages, and case studies that exist within bounded pagination.

It excludes tokens, secrets, signed URLs, raw provider payloads, internal security/abuse records, operator audits, and every other user's data. An export that exceeds the synchronous bound returns a truthful retryable status; it never silently truncates.

## API contract — operator review-access decisions

An allowlisted operator may filter categorical interest by cohort, category, age bucket, and status, then approve, decline, expire, or revoke one record. Every mutation requires same-origin enforcement, a current target revision, an idempotency event ID, and an allowlisted reason code. Operators cannot decide their own access. The interest update and immutable audit creation are atomic. No email is sent in the free profile.

## API contract — privacy-safe evidence

Allowlisted events:

- `onboarding_started`
- `onboarding_completed`
- `onboarding_skipped`
- `sample_started`
- `sample_finding_revealed`
- `sample_completed`
- `self_review_started`
- `self_review_completed`
- `brief_started`
- `brief_ready`
- `access_interest_recorded`
- `access_interest_revoked`
- `workspace_returned`

Allowed dimensions are categorical cohort, sample ID/version, rubric category/version, step ID, completion state, environment, and consent state. Disallowed fields include email, name, raw UID, client/project name, image, URL containing document IDs, brief text, review text, provider response, and tokens.

## Accessibility contract

- WCAG 2.2 AA target.
- Skip link, semantic landmarks, one clear page-level heading, logical heading order.
- Full keyboard operation with visible focus and no focus trap.
- Status, error, save, and progress changes announced without excessive interruption.
- Touch targets at least 44 by 44 CSS pixels where practical.
- No information conveyed by color, motion, hover, or position alone.
- 200% zoom and 320 CSS-pixel reflow without two-dimensional scrolling for ordinary content.
- Reduced-motion mode removes nonessential animation and preserves final content state.
- Sample images have useful alternative text; decorative assets are ignored.

## Performance contract

- Server-render the page title, purpose, primary action, and initial checklist state.
- Do not load GSAP or other heavy interaction code on dashboard/auth routes unless used.
- Route-level JavaScript and image budgets are recorded and regression-checked.
- Initial targets: LCP at or below 2.5 seconds, INP at or below 200 milliseconds, CLS at or below 0.1 at the 75th percentile on target devices.
- Images use correct intrinsic sizes, responsive sources, modern formats, and no avoidable above-fold lazy loading.
- Fonts avoid invisible text and unnecessary weights.

## Security and privacy contract

- Firebase ID tokens verified server-side on protected routes.
- Same-origin enforcement on mutations.
- Owner scoping and persistent account access lock on every private collection.
- Strict Zod validation, bounded JSON/form bodies, rate limits, idempotency, and no secret-bearing errors.
- CSP, secure headers, HTTPS, no-store private responses, and redacted structured logs.
- Free learning routes never contact a vision provider or create source-image storage objects.
- Account deletion includes all new activation entities.
