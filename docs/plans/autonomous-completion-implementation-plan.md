# IroGuide Autonomous Completion Implementation Plan

> Supersession note (2026-08-28): completed infrastructure and safety evidence in this document remains valid. New product-activation execution follows `docs/plans/product-activation/revision.md` and its authoritative `tasks.md` ledger; no existing capability gate is relaxed.

**Status:** In execution

**Created:** 2026-08-24

**Execution owner:** Codex acting on the user's behalf

**Starting branch:** `codex/autonomous-completion-plan`, based on `origin/codex/implementation-plan-execution`

**Current production policy:** `IROGUIDE_LAUNCH_PROFILE=free`

**Locked decisions:** Community remains gated; paid provider and monetization remain `NO-GO` until their evidence gates pass

## 1. Mission and completion boundary

This plan finishes every remaining technical, operational, verification, and documentation task that can be performed by Codex. It deliberately separates implementation from activation: Codex may build and test inactive infrastructure, but it must not spend money, accept legal terms, invent business approval, expose private content, activate Community, enable billing, or turn on a paid provider merely because credentials exist.

The work has four possible outcomes:

1. **Free release complete:** merged, deployed, smoke-tested, observable, and rollback-ready.
2. **Provider-ready but inactive:** direct uploads, durable jobs, contracts, evaluation, and operations are implemented behind a deny-by-default capability.
3. **Retention and Community ready but gated:** private learning features and Community safety tooling are complete, but public rollout waits for measured retention and named operating ownership.
4. **Monetization ready but inactive:** billing can be implemented only after provider value, budget, legal, tax, and support gates independently pass.

## 2. Existing baseline

The branch `origin/codex/implementation-plan-execution` already provides:

- free-profile enforcement across UI, API, storage, email, Community, and provider boundaries;
- bounded request parsing, trusted client identity, distributed rate-limit readiness, and retry-safe deletion;
- strict review provenance and compatible progress cohorts;
- versioned comparison, follow-up, review-job, Community-safety, and activation-decision contracts;
- private case-study preparation with source traceability;
- provider evaluation fixtures and human scoring rules;
- Community and monetization `NO-GO` gates;
- 221 passing unit tests, 12 Firebase rules tests, a production build, and free-profile Playwright coverage at commit `8cb229c`.

This plan does not redo that work. It integrates it, validates deployed behavior, and then proceeds through the remaining gated capabilities.

## 3. Authority and responsibility model

### 3.1 Work Codex performs autonomously

Codex will perform all technically available actions, including:

- create and manage `codex/*` branches;
- resolve merge conflicts without discarding user changes;
- implement application, API, schema, Firebase rules, migration, test, workflow, observability, and documentation changes;
- install declared dependencies and browser/emulator tooling;
- create fixtures, seed scripts, migration scripts, and rollback scripts;
- run local services, emulators, tests, builds, Playwright, DAST, and smoke checks;
- inspect connected Vercel/Firebase/Upstash configuration when access exists;
- deploy previews or staging, execute non-destructive smoke tests, and gather evidence when connected credentials and permissions permit;
- create Conventional Commits after each accepted phase;
- push branches and prepare a pull request when execution is explicitly started;
- update the implementation ledger with exact commands, results, commit SHA, deployment URL, and rollback status.

### 3.2 Decisions Codex cannot manufacture

The following are owner gates, not coding tasks:

- granting access to Firebase, Vercel, Upstash, DNS, email, provider, analytics, or payment accounts when no connection exists;
- approving provider spend, daily/monthly caps, or commercial pricing;
- accepting provider, payment, privacy, tax, or legal terms;
- naming the human support and Trust and Safety on-call owners;
- supplying consented production evaluation assets or recruiting real users;
- approving public Community activation;
- approving production billing activation;
- resolving protected-branch reviews when repository policy requires a human approver.

Codex will prepare the decision package, recommended option, evidence, and exact next action for each gate. It will continue all safe preparatory work while a gate is closed.

### 3.3 Stop conditions

Execution must stop before activation when any of these is true:

- a required external account or permission is unavailable;
- a destructive production operation has no tested rollback;
- a financial, legal, privacy, moderation, or production-promotion decision lacks explicit approval;
- quality, security, deletion, readiness, or cost evidence is red;
- a task would contradict the free-profile or Community gate;
- staging behavior differs from the exact commit proposed for production.

## 4. Engineering rules for every phase

- Use TypeScript with strict schemas at every untrusted boundary.
- Keep server-only authorization, Firebase Admin, provider, storage, rate limit, and billing concerns under `src/server/`.
- Keep pure contracts and state machines under `src/domain/`.
- Keep feature-local hooks and view models under `src/features/<area>/`.
- Use progressive rendering: shell first, bounded loading state, partial data, final result, and explicit recovery state.
- Keep uploaded work color-neutral; use IroGuide accent colors for status and hierarchy rather than altering user artwork.
- Use cursor pagination, bounded batches, idempotency keys, outbox/reconciliation patterns, and repairable derived counters.
- Never log images, prompts, briefs, review content, emails, tokens, raw account IDs, payment payloads, or deletion retry tokens.
- Add the narrowest failing test first, implement, then run the focused test and `npm run check`.
- Run `npm run test:e2e:free` after every phase that affects routes, capability UI, auth, or account state.
- Commit each phase with `feat(<scope>): <summary>` or `fix(<scope>): <summary>` and a bullet body.
- Do not enable a capability in the same commit that first implements its safety controls.

## 5. Delivery sequence

```text
Integration
  -> Free staging proof
  -> Free production release
  -> Inactive provider infrastructure
  -> Provider evaluation and approval gate
  -> Invite-only live critique
  -> Retention learning loop
  -> Community implementation and approval gate
  -> Monetization implementation and approval gate
  -> Ongoing operations
```

Community and monetization are not schedule-driven. They advance only when their evidence dependencies pass.

## 6. Phase 0 — Integrate the completed baseline

**Objective:** Move the seven reviewed implementation commits into the authoritative development line without losing unrelated work.

### Tasks

- [x] `AUT-0001` Fetch all remotes and verify `origin/codex/implementation-plan-execution` resolves to `8cb229c` or a reviewed successor.
- [x] `AUT-0002` Compare the implementation branch with current `main`; classify overlapping changes and stale documents.
- [x] `AUT-0003` Create an integration branch from the latest `main` and merge the implementation branch non-destructively.
- [x] `AUT-0004` Resolve conflicts using current product decisions: free profile, gated Community, no paid activation.
- [x] `AUT-0005` Mark `docs/superpowers/plans/2026-08-11-review-capability-foundation.md` as superseded without deleting its audit history.
- [x] `AUT-0006` Run dependency install, workflow-pin verification, typecheck, lint, unit tests, Firebase rules tests, production build, and free-profile Playwright.
- [x] `AUT-0007` Review the complete diff for secrets, generated output, accidental capability changes, misleading copy, and unrelated formatting.
- [x] `AUT-0008` Commit, push, prepare the pull request, and merge when branch policy permits.

### Acceptance

- `main` contains the complete baseline and has a clean worktree.
- No implementation-plan task regresses.
- All local quality gates pass on the merged commit.
- Community, AI critique, source-image storage, email delivery, and billing remain disabled in `free`.

### Commit

```text
fix(integration): merge the free launch baseline

- integrate the audited implementation phases without discarding mainline work
- archive superseded planning checklists and preserve decision history
- verify capability gates, account safety, rules, build, and free-profile E2E
```

### Execution record — 2026-08-24

- **Outcome:** Complete. PR #24 merged the seven baseline commits into `main` at `ba6e9e5`; the autonomous execution branch was recreated from that authoritative merge.
- **Verification:** Immutable workflow pins passed; 221 unit tests and 12 Firebase rules tests passed; typecheck, zero-warning lint, production build, and the free-profile Playwright contract passed.
- **Security:** Next.js and its ESLint configuration were patched to `16.3.2`, the PostCSS override was patched to `8.5.26`, safe transitive resolutions were refreshed, and `npm audit` reports zero vulnerabilities.
- **Capability state:** `free` remains fail-closed for paid critique, Community writes, source-image storage, email delivery, and billing.
- **Rollback:** The dependency and documentation commit can be reverted independently from the already merged baseline; no production capability was activated.

## 7. Phase 1 — Complete staging and production proof for the free release

**Objective:** Convert locally passing code into deployment evidence for the exact release candidate.

### Tasks

- [x] `AUT-0101` Inventory connected deployment targets and verify which environment is staging versus production.
- [x] `AUT-0102` Validate environment names without printing secret values: launch profile, Firebase client/Admin project IDs, Storage bucket, trusted client identity, Upstash, admin allowlist, canonical URL, and smoke-test credentials.
- [x] `AUT-0103` Ensure staging and production explicitly set `IROGUIDE_LAUNCH_PROFILE=free`.
- [x] `AUT-0104` Confirm paid provider, Community, source-image storage, and email credentials cannot override the launch profile.
- [x] `AUT-0105` Deploy a preview/staging candidate from the merged SHA.
- [ ] `AUT-0106` Verify public `/api/readiness` exposes only `{ ok }`; verify privileged `/api/admin/readiness` reports account storage, project match, trusted client identity, rate-limit adapter, request budgets, and capability states.
- [ ] `AUT-0107` Execute a disposable-account journey: sign up, verify, sign out/in, profile update, dashboard, draft ownership, review-text history, purge history, and account deletion.
- [ ] `AUT-0108` Verify Community page/API/rules denial, disabled critique UI/API, absent source-image cloud reads, and stored-without-email bug reports.
- [ ] `AUT-0109` Run deployed DAST, security smoke, and production smoke against staging; save the reports and workflow URLs.
- [x] `AUT-0110` Exercise rollback in staging and verify the previously healthy deployment can be restored.
- [x] `AUT-0111` Promote the exact verified SHA to production when platform policy permits.
- [x] `AUT-0112` Run non-destructive post-deploy readiness, route, security-header, Community-denial, and free-profile smoke tests.
- [x] `AUT-0113` Record release evidence, known limitations, rollback deployment, and operator contact.

### Required external inputs

- Existing deployment/Firebase/Upstash access must be connected or granted.
- A protected-branch or production-promotion confirmation may be required by platform policy.

### Acceptance

- Staging and production run the same verified commit.
- Readiness is green without paid credentials.
- No disabled external service is contacted.
- Account creation, private data, retry-safe deletion, and rollback are proven against deployed infrastructure.
- DAST and smoke reports are attached to the release record.

### Rollback

Restore the last healthy deployment, keep `IROGUIDE_LAUNCH_PROFILE=free`, invalidate the failed deployment, and repeat readiness before reopening traffic.

### Commit

```text
fix(release): record deployed free-profile verification

- validate production-equivalent identity, rate limiting, Firebase, and request budgets
- prove account ownership, deletion recovery, and disabled capability denials
- attach staging, smoke, DAST, production, and rollback evidence
```

### Execution record — 2026-08-24

- **Outcome:** Gate-closed. Public free production is deployed and verified; privileged readiness and the disposable verified-email account journey remain blocked by missing operator credentials.
- **Production:** Merge `3d62296` resolves through `https://iroguide.com` to immutable deployment `dpl_4TBXnYe7BuEEF6arajL8fbzqqyPo`; automatic Production Smoke run `32687191585` passed and uploaded its report.
- **Staging:** `https://iro-guide-staging-vivek-painjanes-projects.vercel.app` resolves to Preview `dpl_67ciVP3q6wws4cTc6HT3d3zx9rDC`, deployed from a clean `b81276d` worktree with the explicit `free` profile.
- **Verification:** Production smoke passed 16/16; DAST passed 38/38; public readiness returned only `{ "ok": true }`; Community mutation returned the gated `404`; anonymous review and admin readiness preserved their authentication boundaries.
- **Runtime evidence:** Readiness logged a successful structured event; Community mutation logged `community_mutation.capability_blocked`; no source-image Storage request was observed during the public free journey.
- **Rollback:** The staging alias was moved to prior healthy Preview `dpl_G4KEJYpia5AmMtjjRK7LKQJrFCNQ`, readiness passed, and the alias was restored to the candidate with readiness still green.
- **Remaining gate:** Configure a disposable verified-email smoke identity and inbox plus an authorized admin UID/email before completing `AUT-0106`–`AUT-0109` in full.

## 8. Phase 2 — Add privacy-safe product evidence without paid AI

**Objective:** Measure whether target users understand and return to the free product before incurring provider or Community costs.

### Tasks

- [x] `AUT-0201` Define an internal event adapter with a no-op default and consent-aware client boundary.
- [x] `AUT-0202` Instrument only privacy-safe events already defined in `docs/retention-evidence-model.md`.
- [x] `AUT-0203` Add event-schema validation, sampling, deduplication, environment labels, and tests proving sensitive fields are rejected.
- [x] `AUT-0204` Create an operator-only aggregate report for sign-in completion, dashboard return, documentation engagement, review-availability interest, deletion success, and case-study interest.
- [x] `AUT-0205` Add a bounded feedback/research-consent workflow that does not imply live critique availability.
- [x] `AUT-0206` Prepare cohort scripts, interview prompts, consent text, and an evidence template for beginner designers, freelancers, and UI/UX designers.
- [x] `AUT-0207` Run accessibility, responsive, performance, and content-honesty verification on the deployed free experience.
- [x] `AUT-0208` Produce a go/no-go evidence report for funding a limited provider evaluation.

### Required external inputs

- The owner supplies or approves a consented participant cohort.
- If a third-party analytics product is desired, the owner approves its privacy terms; otherwise the server event adapter remains first-party/no-op.

### Acceptance

- Analytics cannot receive raw creative content or direct identifiers.
- Consent and deletion behavior are documented and tested.
- The report distinguishes observed behavior from hypotheses.
- No event or feedback form claims that a live critique occurred.

### Commit

```text
feat(insights): add privacy-safe free-launch evidence

- validate and minimize consent-aware product events
- add operator aggregates without exposing creative or account content
- prepare cohort research and provider-funding decision evidence
```

### Execution record — 2026-08-24

- **Outcome:** Technically complete and deployed. Participant research remains gate-closed until the owner approves a consented cohort; prepared scripts are not counted as participant evidence.
- **Collection boundary:** The first-party adapter defaults to `noop`. Firestore mode requires an explicit setting, a 32-character-or-longer HMAC secret, privileged readiness, consent, schema validation, deterministic sampling, and idempotent writes.
- **Privacy:** Client payloads cannot contain email, raw user ID, document ID, image URL, review text, or open creative content. Firestore client access to evidence and research collections is denied.
- **Operator view:** `/admin/insights` returns aggregates only and labels absent data “not observed.” `/research` accepts categorical answers only and requires explicit research consent.
- **Verification:** Focused schema/security tests passed; responsive Playwright passed 2/2 at a 390-pixel viewport; `npm run check` passed 245 unit tests and 14 Firebase authorization-rules tests before the production build completed.
- **Production evidence:** Merge `8e689e7` is deployed as `dpl_8GYDP1P4Ssyv6eqsLyhkED13KUPn`; automatic Production Smoke run `32689388158` passed. The research route passed mobile, desktop, reduced-motion, no-JavaScript, overflow, and honest-copy checks; measured warm navigation completed in 593 ms desktop and 1,087 ms mobile in the verification run.
- **Decision:** Limited provider-evaluation funding remains `NO-GO`; production remains `free`, Community remains closed, and collection remains `noop` until the privacy/participant gates are approved.

## 9. Phase 3 — Implement inactive direct-upload and durable-job infrastructure

**Objective:** Build the scalable provider boundary completely while leaving production AI disabled.

### Data model

#### `reviewUploadSessions`

- `id`, `userId`, `storagePath`, `state`
- states: `authorized -> uploaded -> validated -> consumed | expired | rejected`
- immutable byte limit, expected content type, issued/expiry timestamps, nonce, content digest
- validation metadata: detected format, bytes, width, height, pixel count, validator version

#### `reviewJobs`

- `id`, `userId`, `idempotencyKey`, `requestDigest`, `status`, `attempt`
- states: `accepted -> running -> succeeded | failed-retryable | failed-permanent`
- provider/model/contract/rubric versions, deadline, result document ID, privacy-safe failure class
- immutable creation fields and append-only attempt events

#### `reviewJobOutbox`

- job reference, event type, delivery state, attempt count, next attempt, lease owner/expiry
- used for retryable background delivery without coupling user requests to provider latency

### API contracts

- `POST /api/review-uploads` — authorize a short-lived owner-bound direct upload.
- `POST /api/review-uploads/{id}/finalize` — validate object ownership and enqueue validation.
- `DELETE /api/review-uploads/{id}` — revoke an unused upload.
- `POST /api/review-jobs` — create or return an idempotent job; capability and entitlement checked before enqueue.
- `GET /api/review-jobs/{id}` — owner-only progressive status/result projection.
- `POST /api/internal/review-jobs/{id}/run` — internal authenticated worker boundary, never public bearer auth.

### Tasks

- [x] `AUT-0301` Add strict upload-session and stored-job schemas with state-transition guards.
- [x] `AUT-0302` Implement Firebase rules for exact UID/upload paths, server-only transitions, expiry, and denied cross-owner access.
- [x] `AUT-0303` Implement short-lived direct-upload authorization without exposing Admin credentials.
- [x] `AUT-0304` Validate stored objects by magic bytes, decoded format, byte size, dimensions, pixel/decompression budget, and digest before provider eligibility.
- [x] `AUT-0305` Add lifecycle reconciliation for expired, abandoned, consumed, and partially deleted objects.
- [x] `AUT-0306` Implement atomic `(uid, idempotencyKey)` job creation and digest-conflict rejection.
- [x] `AUT-0307` Add queue/outbox and worker interfaces with a disabled/no-op production adapter until infrastructure is approved.
- [x] `AUT-0308` Preserve the shared provider deadline and transient-only retry classification across queued attempts.
- [x] `AUT-0309` Add cancellation, lease expiry, worker crash, duplicate delivery, provider timeout, result-save failure, and reconciliation tests.
- [x] `AUT-0310` Add queue age, attempt, latency, permanent failure, orphan, and cleanup-backlog diagnostics without payload content.
- [x] `AUT-0311` Add progressive upload/job UI states behind a non-production/internal capability only.
- [ ] `AUT-0312` Run emulator, route, concurrency, failure-injection, and browser tests; verify free production cannot create upload sessions or jobs.

### Acceptance

- Application Functions never proxy supported large image bodies.
- Every object and job is owner-bound, bounded, idempotent, recoverable, and deletable.
- Duplicate requests do not create duplicate provider work.
- Invalid images and provider-invalid output fail closed.
- Production free profile has no visible action and no callable upload/job path.

### Commit sequence

```text
feat(uploads): add owner-bound direct review uploads
feat(jobs): add durable idempotent review orchestration
fix(reliability): reconcile abandoned uploads and review jobs
```

## 10. Phase 4 — Evaluate and conditionally activate a limited live provider

**Objective:** Prove quality, cost, privacy, and rollback before any user-facing live critique.

### Tasks Codex performs before budget approval

- [x] `AUT-0401` Validate every checked-in evaluation fixture and expected rubric/evidence region.
- [x] `AUT-0402` Add deterministic evaluation runner output, blinded comparison sheets, latency/cost capture, and result hashing.
- [x] `AUT-0403` Add strict normalization tests proving repair never invents evidence.
- [x] `AUT-0404` Add model/provider adapters behind the existing server interface without enabling them in free production.
- [x] `AUT-0405` Add per-account quota, global daily/monthly hard caps, provider kill switch, and fallback kill switch.
- [x] `AUT-0406` Add spend, latency, output-invalid, retry, fallback, and deletion alerts.

### Owner gate `GATE-PROVIDER-01`

Required evidence:

- approved provider and data-use terms;
- approved maximum cost per completed review, daily cap, and monthly cap;
- consented evaluation assets;
- two human reviewers;
- named support owner;
- explicit permission to make bounded paid evaluation calls.

### Tasks after approval

- [ ] `AUT-0410` Run the full evaluation suite with primary and fallback candidates.
- [ ] `AUT-0411` Produce quality, evidence-grounding, latency, retry, privacy, and cost analysis.
- [ ] `AUT-0412` Reject any candidate with a blocking failure or unexplained material nondeterminism.
- [ ] `AUT-0413` Exercise provider kill switch, quota exhaustion, cap exhaustion, queue drain, and rollback to free.
- [ ] `AUT-0414` If and only if `evaluateActivationDecision` returns `go`, enable an invite-only capability for approved verified accounts.
- [ ] `AUT-0415` Run staging and limited-alpha smoke; monitor the full initial cohort.

### Acceptance

- Every scenario scores at least `10/12`, evidence grounding is `2`, and no blocking failure exists.
- Spend cannot exceed approved caps even during retries or duplicate delivery.
- Deletion and provider shutdown remain available during an outage.
- General production users remain gated; activation begins invite-only and reversible.

### Commit sequence

```text
feat(evaluation): automate provider quality and cost evidence
feat(controls): enforce provider quotas spend caps and kill switches
feat(alpha): enable approved invite-only live critique
```

## 11. Phase 5 — Complete the trusted learning and retention loop

**Objective:** Turn live reviews into defensible revision learning without mixing users or incompatible evidence.

### Data model

- `comparisons`: owner ID, original/revised review IDs, compatibility signature, issue matches, evidence, confidence, provenance.
- `reviewConversations`: owner ID, source review ID, contract version, bounded summary, last activity.
- `reviewMessages`: conversation ID, role, bounded content, cited issue IDs, provider provenance, stable cursor key.
- `caseStudies`: owner ID, private visibility, source review/comparison IDs, traceable claims, draft version, export state.

### Tasks

- [ ] `AUT-0501` Change comparison and follow-up routes to accept document references, load source reviews server-side, and verify stored ownership/provenance.
- [ ] `AUT-0502` Persist comparison outcomes with versioned issue matches and compatibility signatures.
- [ ] `AUT-0503` Persist bounded conversations/messages with stable pagination and deletion propagation.
- [ ] `AUT-0504` Add per-review/per-account cost and message limits.
- [ ] `AUT-0505` Implement comparison UI states for improved, remaining, regressed, unmatched, and low-confidence outcomes.
- [ ] `AUT-0506` Show score deltas only for compatible evidence; otherwise explain why comparison is withheld.
- [ ] `AUT-0507` Extend recurring-issue insights with minimum sample counts and stable category normalization.
- [ ] `AUT-0508` Persist private case-study drafts and trace every claim to an owned review/comparison.
- [ ] `AUT-0509` Add private export only after redaction, consent, revocation, expiry, watermark, and deletion tests pass.
- [ ] `AUT-0510` Add retention cohort reporting using minimized events and no creative content.
- [ ] `AUT-0511` Run owner-isolation, legacy compatibility, pagination, deletion, accessibility, responsive, and E2E suites.

### Acceptance

- No client-supplied review body can authorize a comparison or follow-up.
- Incompatible reviews never produce score-delta or trend claims.
- Conversation and case-study deletion is complete and retryable.
- Public publishing remains unavailable.
- Retention reporting can demonstrate or reject repeat learning-loop value.

### Commit sequence

```text
feat(comparison): persist trusted revision outcomes
feat(follow-up): add bounded owner-scoped conversations
feat(portfolio): persist private evidence-backed case studies
```

## 12. Phase 6 — Implement Community safety tooling while keeping rollout closed

**Objective:** Complete every technical Community gate without assuming retention evidence or operating capacity.

### Data model

- `communityProjections`: strict public projection only; no private review document.
- `communityConsents`: versioned grant, withdrawal, derivative state, timestamps.
- `communityComments`: author ownership, status, moderation state, stable cursor.
- `communityInteractions`: exact `(uid, postId, type)` identity; server-derived counters.
- `communityReports`: reporter, target, reason, status, deduplication key, queue timestamps.
- `communityBlocks`: blocker/blocked pair with canonical key.
- `communityModerationActions`: immutable action and reason code.
- `communityAppeals`: one appeal per action, independent reviewer state.
- `communityAudit`: append-only, privacy-minimized event ledger.
- `communityOutbox` and counter shards: idempotent derivative/counter processing.

### Tasks

- [x] `AUT-0601` Replace the legacy full-review Community document with the strict public projection.
- [x] `AUT-0602` Implement project-specific consent, withdrawal, immediate hiding, and derivative deletion.
- [x] `AUT-0603` Implement author post edit/delete and comment-author delete.
- [x] `AUT-0604` Implement bidirectional discovery/interaction blocking.
- [x] `AUT-0605` Implement rate-limited reporting for post, comment, and account targets.
- [x] `AUT-0606` Build least-privilege moderator queues for removal, restore, warn, restrict, ban, and evidence-safe review.
- [x] `AUT-0607` Implement appeals with conflict-of-review constraints and reversal linkage.
- [x] `AUT-0608` Add immutable moderation audit records and operator export without private review content.
- [x] `AUT-0609` Replace hot counters with sharded/asynchronous repairable counters and reconciliation.
- [x] `AUT-0610` Propagate consent withdrawal and account deletion across projections, comments, interactions, reports, notifications, and derived counters.
- [x] `AUT-0611` Add per-account/client/target abuse limits, risky-account limits, link/mention controls, and report-abuse controls.
- [x] `AUT-0612` Add moderation, deletion-backlog, counter-drift, privacy-report, and abuse alerts.
- [x] `AUT-0613` Add rules, route, cross-user, role, replay, deletion, counter, load, accessibility, and browser tests.
- [x] `AUT-0614` Run synthetic staff-fixture and incident exercises with the capability still closed.

### Owner gate `GATE-COMMUNITY-01`

Required evidence:

- measurable retention justifies Community;
- named Trust and Safety owner and backup;
- approved policy, response windows, appeal policy, legal/privacy contact, and incident runbook;
- completed hot-post/report/deletion load tests;
- separate product and safety approvals.

### Conditional rollout

- [ ] `AUT-0620` If `evaluateCommunityLaunch` returns `launchable: true`, create a separate rollout commit for staff fixtures only.
- [ ] `AUT-0621` Progress to invite-only, limited production, and broader availability only through independent evidence reviews.
- [ ] `AUT-0622` Monitor report rate, response time, appeal reversal, block use, deletion completion, counter drift, and operator capacity.

### Acceptance

- Technical implementation alone does not enable Community.
- Every public field comes from the strict projection and active consent.
- Users and moderators can remove content through complete, auditable, retry-safe paths.
- The kill switch closes writes and public reads without affecting private reviews.

### Commit sequence

```text
feat(community): implement consent reports and blocking
feat(moderation): add audited actions appeals and incident controls
fix(community): make counters and deletion propagation repairable
feat(rollout): enable approved staff-only Community preview
```

## 13. Phase 7 — Implement monetization only after the independent `GO`

**Objective:** Add recoverable billing without allowing payment state to bypass product or safety capabilities.

### Owner gate `GATE-BILLING-01`

Required evidence:

- provider activation is independently `go`;
- repeat user value and willingness to pay are measured;
- pricing and included usage are approved;
- payment provider, supported regions, currencies, tax handling, refund policy, and legal terms are approved;
- named billing/support owner exists.

### Data model

- `billingCustomers`: internal account to provider-customer reference; no card data.
- `subscriptions`: provider subscription, internal plan, lifecycle state, period, cancellation, version.
- `entitlements`: server-derived capability grants with source, expiry, and version.
- `usageLedger`: immutable reservation/commit/release entries keyed by idempotent job.
- `webhookEvents`: provider event ID, type, signature-verified state, processing lease, result.
- `billingReconciliation`: checkpointed provider/internal comparison and repair state.

### Tasks after approval

- [ ] `AUT-0701` Write a provider-specific billing ADR and threat model before installing its SDK.
- [ ] `AUT-0702` Implement checkout and customer-portal session creation on authenticated same-origin server routes.
- [ ] `AUT-0703` Implement signed webhook verification on raw bounded bodies with replay-safe event storage.
- [ ] `AUT-0704` Derive entitlements server-side; never trust client plan labels or payment redirects.
- [ ] `AUT-0705` Implement atomic usage reservation, provider-job commit, failure release, refunds, and reconciliation.
- [ ] `AUT-0706` Implement trial, grace, past-due, cancellation, renewal, refund, dispute, and account-deletion state transitions.
- [ ] `AUT-0707` Add invoice/receipt links and portable account-data export.
- [ ] `AUT-0708` Add webhook-age, entitlement-divergence, duplicate-ledger, refund, dispute, and cost/revenue mismatch alerts.
- [ ] `AUT-0709` Build support-safe billing diagnostics without payment secrets or full webhook payloads.
- [ ] `AUT-0710` Add signature, replay, ordering, duplication, concurrency, cancellation, tax-display, accessibility, and E2E tests.
- [ ] `AUT-0711` Run test-mode checkout, webhook recovery, reconciliation, deletion, and rollback drills.
- [ ] `AUT-0712` Enable billing only through a separate approved production rollout commit.

### Acceptance

- Payment data never enters IroGuide servers beyond provider-safe identifiers.
- Duplicate or out-of-order webhooks cannot duplicate entitlement or usage.
- A successful payment cannot activate a disabled provider or Community.
- Cancellation, deletion, refund, reconciliation, and rollback work during partial outages.
- Provider cost and billed usage remain bounded and explainable.

### Commit sequence

```text
feat(billing): add verified subscription lifecycle
feat(entitlements): enforce server-derived access and usage ledger
fix(billing): add reconciliation recovery and rollback controls
feat(pricing): enable approved production checkout
```

## 14. Phase 8 — Production hardening and continuous operations

**Objective:** Keep the system secure and operable after capabilities expand.

### Tasks

- [ ] `AUT-0801` Add scheduled dependency, secret, workflow-pin, rules, DAST, and capability-drift checks.
- [ ] `AUT-0802` Add SLO dashboards for readiness, auth, review completion, queue age, provider latency, deletion backlog, moderation response, webhook age, and reconciliation.
- [ ] `AUT-0803` Define error budgets and automatic capability rollback thresholds.
- [ ] `AUT-0804` Run quarterly deletion, provider-kill-switch, Community-kill-switch, webhook-replay, and deployment-rollback drills.
- [ ] `AUT-0805` Add backup/restore verification for owned text data, audit state, job state, and billing ledger where supported.
- [ ] `AUT-0806` Re-run threat modeling and security scans before every major capability activation.
- [ ] `AUT-0807` Track bundle, Core Web Vitals, function memory, Firestore reads/writes, Storage bytes, queue throughput, and provider cost.
- [ ] `AUT-0808` Remove superseded flags, migrations, and compatibility paths only after measured safe retirement.

### Initial SLO targets

- Public readiness availability: `>= 99.9%` monthly.
- Authenticated account API success excluding invalid requests: `>= 99.5%`.
- Free-profile forbidden external side effects: exactly `0`.
- Account/deletion terminal completion: `>= 99.9%`, with retry-required state visible for every partial failure.
- Provider completion after activation: target set only after evaluation; never hide invalid-output failures inside success.
- Community privacy/deletion propagation after activation: target approved by policy before rollout.
- Billing webhook backlog after activation: no verified event remains unprocessed beyond the approved recovery window.

### Commit

```text
feat(operations): automate capability health and recovery drills

- monitor readiness queues deletion moderation billing and provider budgets
- enforce evidence-based rollback thresholds and recurring security checks
- document verified recovery results and retire superseded compatibility paths safely
```

## 15. Verification matrix

| Boundary | Unit | Route/integration | Firebase rules | Browser | Deployed smoke | Failure injection |
| --- | --- | --- | --- | --- | --- | --- |
| Free capability denial | Required | Required | Required | Required | Required | Provider/storage spies |
| Auth and ownership | Required | Required | Required | Required | Required | revoked token/cross-user |
| Request budgets | Required | Required | N/A | Upload UX | Required | chunked/false length |
| Direct uploads | Required | Required | Required | Required | Required | malformed/orphan/expiry |
| Durable jobs | Required | Required | Required | Polling states | Required | duplicate/crash/timeout |
| Comparison/follow-up | Required | Required | Required | Required | Required | incompatible/cross-owner |
| Deletion | Required | Required | Required | Required | Required | adapter outage/retry |
| Community | Required | Required | Required | Required | Required before rollout | report burst/hot post |
| Billing | Required | Required | Server-only writes | Required | Required before rollout | replay/order/outage |

Standard commands:

```bash
npm ci
npm run security:workflow-pins
npm run typecheck
npm run lint
npm test
npm run test:rules
npm run build
npm run test:e2e:free
npm run test:e2e
npm run smoke:security
npm run smoke:production
```

## 16. Phase evidence and handoff format

After each phase Codex will report:

```text
Phase: <number and name>
Outcome: complete | gate-closed | blocked
Commit: <sha> <conventional subject>
Deployment: <environment and immutable URL or not applicable>
Verification:
- <command>: <result>
- <command>: <result>
Security/privacy changes:
- <result>
Rollback:
- <tested action and result>
Remaining gate:
- <owner-only decision or none>
```

No phase is marked complete from documentation alone when its acceptance criteria require deployed behavior, human review, load evidence, or operating ownership.

## 17. Definition of done

### Free product done

- Baseline is merged into `main`.
- Exact production commit passed staging, DAST, smoke, account, deletion, and rollback verification.
- Free profile is observable, honest, private, and produces no paid side effects.

### Live critique done

- Direct uploads and durable jobs are production-verified.
- Quality, cost, privacy, spend caps, deletion, and rollback gates pass.
- Invite-only activation is separately approved and monitored before expansion.

### Retention done

- Comparison, bounded follow-up, progress, and private case-study flows use compatible owned evidence.
- Measured repeated use supports or rejects further investment.

### Community done

- Every technical and operating gate passes, a named team operates it, and separate approvals exist.
- Rollout remains staged and reversible.

### Monetization done

- Provider value and economics are proven first.
- Billing, entitlements, usage, webhooks, cancellation, tax, export, deletion, recovery, and support are tested and observable.
- Production activation is separately approved.

## 18. Recommended immediate execution order

1. Execute Phase 0 integration.
2. Execute Phase 1 deployed free-release proof.
3. Execute Phase 2 privacy-safe evidence collection.
4. Build Phase 3 provider infrastructure while it remains inactive.
5. Present `GATE-PROVIDER-01`; proceed only after budget/legal approval.
6. Complete Phase 5 retention once trusted live reviews exist.
7. Build Phase 6 Community tooling, but keep rollout closed until `GATE-COMMUNITY-01`.
8. Revisit Phase 7 only after repeat value and provider economics produce a billing `GO`.
9. Continue Phase 8 throughout every production phase.

The first three phases can proceed without paid-provider activation. Later phases remain dependency- and evidence-driven, not calendar-driven.
