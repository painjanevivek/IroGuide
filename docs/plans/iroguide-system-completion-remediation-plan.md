# IroGuide Complete System Remediation and Activation Plan

## Summary

This is the authoritative implementation plan for resolving all open activation tasks, demo-backed functionality, disabled placeholders, unused product areas, deployment/configuration gaps, and performance risks.

Execution prioritizes a complete free product. Live critique, retention, Portfolio, Community, Billing, email delivery, and public publishing activate only after their respective evidence gates pass.

Existing `ACT-*` identifiers remain unchanged. Newly discovered remediation work uses `REM-*` identifiers. `docs/plans/product-activation/tasks.md` remains the execution ledger and must contain traceable references to this plan.

## Phase 0 — Governance, canonical specification, and baseline

- Create `specs/002-product-completion/` artifacts so Spec Kit no longer targets the unrelated `001-curiosity-motion` feature.
- Preserve existing activation plans and evidence as historical inputs.
- Add requirement-to-task mapping for every open `ACT-*` task and new `REM-*` task.
- Inventory every route, capability, disabled control, demo endpoint, dormant component, environment gate, API, collection, worker, and external dependency.
- Record starting SHA, capability state, route screenshots, performance results, bundle sizes, accessibility state, and known failures.
- Add CI verification preventing the canonical plan and Spec Kit mirror from diverging.

### Exit criteria

- Spec Kit resolves `002-product-completion`.
- Every incomplete or placeholder area has an owner, dependency, acceptance test, and removal condition.
- `npm run check`, `npm run test:e2e:free`, `npm run perf:budget`, and `git diff --check` pass.

### Commit

```text
feat(planning): establish complete system remediation governance
```

## Phase 1 — Capability isolation and placeholder containment

- Replace the broad `aiCritique` switch with independent server-owned capabilities:
  - `guidedLearning`
  - `liveCritique`
  - `improvementTracking`
  - `revisionComparison`
  - `followUpConversation`
  - `privatePortfolio`
  - `publicPortfolio`
  - `community`
  - `billing`
  - `productEvidence`
  - `bugReportEmail`
  - `reviewPipeline`
  - `sourceImageStorage`
- Require every API and UI surface to check its exact capability.
- Move demo critique, improvement, comparison, and follow-up implementations to a development-only `/internal/review-lab`.
- Make demo routes unavailable in production regardless of credentials or launch profile.
- Ensure enabling live critique does not expose Phase 7 extensions.
- Remove dormant production imports and dynamically load heavy gated features only after authorization.
- Add a static checker that fails CI when production code imports `demo-*` modules.

### Exit criteria

- Production bundles contain no callable demo-provider path.
- Every gated route fails before authentication, parsing, persistence, or external effects.
- The capability matrix, readiness diagnostics, and tests cover every independent switch.

### Commit

```text
fix(capabilities): isolate product gates and contain demo functionality
```

## Phase 2 — Complete the free product

### Guided learning

- Complete privileged Firebase configuration in staging.
- Enable signed-in guided learning in staging first.
- Verify onboarding, sample progress, self-review, brief builder, access interest, dashboard continuation, export, and deletion with disposable accounts.
- Keep the public example available without authentication.
- Preserve seven-day guest progress and verified post-authentication merging.

### Real Projects workspace

- Replace the `/projects` roadmap with an authenticated Projects workspace.
- Add owner-scoped projects with ID, schema version, name, category, goal, status, revision, timestamps, artifact counts, and next action.
- Add `GET/POST /api/projects` and `GET/PATCH/DELETE /api/projects/[id]`.
- Deny direct Firebase client access.
- Add optional `projectId` to briefs, self-reviews, reviews, jobs, comparisons, and case studies.
- Represent legacy artifacts in a virtual `Unsorted` project without immediate destructive migration.
- Support project creation, rename, archive, restore, transfer, filtering, responsive empty states, and project-level next actions.
- Permit hard deletion only for empty projects; otherwise require artifact transfer to another project or `Unsorted`.

### Public UX and placeholders

- Change unavailable review actions to point directly to `/learn#practice`.
- Ensure every gated page offers one useful available action.
- Remove disabled decorative buttons from production pages.
- Replace Portfolio and Community prototype imports with lightweight gated shells until their capabilities open.
- Update navigation, sitemap, metadata, structured data, and copy to distinguish available, invite-only, research-only, and future features.

### Diagnostics and support

- Replace `/beta` with a permanent redirect to `/status`.
- Build a small public `/status` page using only `{ ok }` from `/api/readiness`.
- Move detailed diagnostics to `/admin/readiness`, protected by recent authentication and operator authorization.
- Keep bug reports functional through Firestore and the admin inbox when email is disabled.
- Add ticket status, internal notes, assignment, and resolution tracking without exposing them to reporters.

### Exit criteria

- A new user can sign up, onboard, create a project, complete learning, save a brief, return through the dashboard, export data, and delete the account.
- No free flow creates provider, source-image Storage, email, Community, publishing, or billing side effects.
- All supported viewports and assistive states pass.

### Commit

```text
feat(free-product): complete guided learning projects and support flows
```

## Phase 3 — Free release proof and production activation

Close existing `ACT-0701`, `ACT-0702`, `ACT-0706`, `ACT-0707`, and `ACT-0708`.

- Provision a least-privilege preview Firebase Admin identity.
- Provision a named non-production operator.
- Complete the disposable verified-account journey.
- Exercise real signed private Storage boundaries.
- Verify token revocation, account locks, deletion ordering, and retry recovery.
- Run real keyboard, screen-reader, forced-colors, 200% zoom, and physical-mobile tests.
- Enable privacy-safe product evidence in staging with HMAC hashing and retention.
- Run DAST, rules, cross-browser, performance, production smoke, exact-SHA deployment, and rollback.
- Promote the complete free product only when `GATE-FREE-01` passes.

### Commit

```text
fix(readiness): complete free product production proof
```

## Phase 4 — Consented cohort evidence

Close `ACT-0802`–`ACT-0808`.

- Research beginner designers, freelancers, and UI/UX designers.
- Obtain explicit approval for recruitment source, participant count, compensation, jurisdiction, facilitator, note taker, and retention policy.
- Measure comprehension, free-path completion, first useful action, brief readiness, access interest, and seven-day return.
- Require zero participants to believe their own design was analyzed.
- Keep participant evidence separate from researcher interpretation.
- Produce `GATE-EVIDENCE-01 = GO`, `REVISE`, or `STOP`.
- Do not begin provider evaluation without `GO`.

### Commit

```text
feat(research): complete consented free-product evidence
```

## Phase 5 — Provider evaluation

Close `ACT-0901`, `ACT-0902`, and `ACT-0906`–`ACT-0910`.

- Expand the owned corpus from 3 to 80 verified cases.
- Cover all supported categories with strong, mixed, and weak or ambiguous examples.
- Validate hashes, ownership, consent, decoded bounds, expected evidence regions, and rubric versions.
- Obtain approved provider terms, budget caps, two independent reviewers, adjudicator, security owner, and support owner.
- Run blinded evaluation and measure precision, recall, unsupported findings, evidence grounding, safety, privacy, latency, retry behavior, fallback, and cost.
- Exercise kill switch, quota, spend cap, timeout, invalid output, queue drain, deletion, and rollback.
- Require precision at least 0.80, recall at least 0.70, and unsupported-finding rate at most 0.05.
- Keep production in the free profile unless `GATE-PROVIDER-01 = GO`.

### Commit while closed

```text
fix(provider): preserve no-go with complete evaluation readiness
```

### Commit after approval

```text
feat(evaluation): complete provider quality safety and cost proof
```

## Phase 6 — Invite-only live critique

Close `ACT-1001`–`ACT-1016` only after Provider `GO`.

- Replace direct `/api/reviews` image submission with:
  1. authorized upload session;
  2. owner-bound signed private upload;
  3. server-side finalize and decoded validation;
  4. idempotent review-job creation;
  5. durable worker execution;
  6. polling, cancellation, and recovery;
  7. atomic trusted-result persistence.
- Validate nonce, owner path, expiry, digest, magic bytes, format, dimensions, pixel budget, and size.
- Add expiring, revocable entitlements and versioned provider-processing acknowledgement.
- Show quota, retention, privacy, processing estimate, and support before upload.
- Cover queued, validating, analyzing, retrying, saving, canceled, expired, retryable failure, permanent failure, and complete states.
- Present evidence, confidence, uncertainty, provenance, first fix, annotations, and usefulness feedback.
- Keep improvement, comparison, and follow-up capabilities off.
- Release only to a limited invited cohort after `GATE-ALPHA-01`.

### Commit

```text
feat(review): enable verified invite-only critique
```

## Phase 7 — Improvement, revision, and retention

Close `ACT-1101`–`ACT-1115`.

- Persist checklist items, notes, timestamps, and source review version.
- Add planned, in-progress, fixed, intentionally unchanged, and clarification states.
- Replace demo extension payloads with owner-scoped document IDs.
- Load reviews server-side and never trust client-supplied review content.
- Persist bounded, paginated, and deletable follow-up conversations.
- Enforce message, token, cost, and time limits with finding citations.
- Upload revisions through the private signed-upload pipeline.
- Persist compatibility signatures and classify improved, remaining, regressed, unmatched, and low-confidence findings.
- Withhold incompatible score deltas and unsupported causal claims.
- Enable recurring insights only after sufficient comparable verified evidence.
- Measure checklist use, follow-up use, second review, and seven-day return.
- Produce `GATE-RETENTION-01`.

### Commit

```text
feat(retention): implement trusted revision and learning loops
```

## Phase 8 — Private and public Portfolio

Close `ACT-1201`–`ACT-1209`.

- Connect `/portfolio` to an owner-scoped case-study workspace only when `privatePortfolio` is enabled.
- Require verified critique and compatible comparison evidence.
- Persist context, first direction, critique, decision, iteration, outcome, and reflection.
- Mark every statement as review-derived, comparison-derived, or user-authored.
- Add editing, reorder, autosave, conflict resolution, preview, and deletion.
- Add redacted accessible private export without signed URLs, prompts, operator data, or client identifiers.
- Produce `GATE-PORTFOLIO-01`.
- Keep public publishing disabled until consent, revocation, expiry, abuse reporting, takedown, and deletion pass `GATE-PUBLISHING-01`.
- After approval, publish immutable versions with owner-controlled unpublish and immediate access revocation.

### Commit

```text
feat(portfolio): deliver evidence-backed private case studies
```

## Phase 9 — Operations, performance, and support delivery

This phase runs alongside every earlier phase and closes before wider release.

- Complete `ACT-1303`, `ACT-1304`, `ACT-1306`, `ACT-1307`, `ACT-1308`, and `ACT-1312`.
- Assign named owners and backups for security, privacy, accessibility, provider, support, Community, and Billing.
- Build privacy-safe dashboards for availability, latency, saturation, queues, deletion, cleanup, cost, and capability drift.
- Verify backups and restores for projects, activation data, reviews, jobs, audits, case studies, and future billing ledgers.
- Schedule deletion, kill-switch, rollback, and restore drills.
- Add bug-report email delivery only after provider, privacy, retry, bounce, and support-owner acceptance; Firestore remains authoritative.
- Preserve p75 targets: LCP at most 2.5 seconds, INP at most 200 milliseconds, and CLS at most 0.1.
- Retain existing route-transfer budgets and add `/dashboard`, `/projects`, `/review/new`, `/portfolio`, `/status`, `/community`, and `/pricing` using measured baseline plus at most 10%, with a hard 900 KB script and 4 MB total-transfer ceiling.
- Fail CI on performance regressions, demo imports, capability drift, secrets, billing-gate bypass, or workflow-pin changes.

### Commit

```text
feat(operations): automate performance recovery support and release evidence
```

## Phase 10 — Community

Close `ACT-1405` and `ACT-1406` only after Retention `GO`.

- Preserve closed behavior until Trust and Safety staffing, policy, response windows, legal/privacy ownership, load testing, worker proof, alert routing, and independent approvals exist.
- Validate consent, withdrawal, blocking, reporting, moderation, appeals, counters, deletion, and audit under production-like load.
- Enable a staff-only cohort through a separate capability and deployment.
- Monitor abuse backlog, response time, deletion, and notification delivery.
- Expand only after `GATE-COMMUNITY-01`.

### Commit while closed

```text
fix(community): preserve closed rollout and safety gates
```

### Commit after approval

```text
feat(community): begin monitored staff-only rollout
```

## Phase 11 — Billing

Close `ACT-1503`–`ACT-1509` only after Provider and Retention gates pass.

- Select the billing provider and create a provider-specific ADR and threat model.
- Add authenticated same-origin checkout and portal sessions.
- Verify raw-body webhook signatures and replay protection.
- Derive entitlements exclusively on the server.
- Add atomic usage reservation, commit, release, refund, dispute, and reconciliation.
- Cover trials, renewals, grace, past due, cancellation, refunds, tax, invoices, export, and deletion.
- Add billing SLOs and divergence, duplicate-ledger, webhook-age, refund, and dispute alerts.
- Ensure payment cannot override provider, Community, privacy, or safety kill switches.
- Activate only after `GATE-BILLING-01`.

### Commit while closed

```text
fix(billing): preserve research-only monetization gate
```

### Commit after approval

```text
feat(billing): enable approved subscription operations
```

## Phase 12 — Final convergence and cleanup

- Re-run spec-to-code convergence across all requirements and routes.
- Remove obsolete flags, old demo endpoints, unused components, unreachable CSS, and superseded migrations.
- Confirm no disabled control remains unless its visible copy names the gate and a useful available action.
- Confirm no informational route is named like an unavailable product feature.
- Verify every capability has an owner, SLO, alert, runbook, rollback, deletion path, and evidence record.
- Run final cross-browser, accessibility, security, rules, performance, DAST, smoke, backup/restore, and exact-SHA rollback proof.
- Push only when the remote branch matches the reviewed local SHA.

### Commit

```text
fix(convergence): remove final placeholders and close production gaps
```

## Public interfaces and data changes

- Add owner-scoped Project schemas and APIs with revision conflicts, idempotency, rate limits, and account-lock enforcement.
- Add nullable `projectId` to compatible existing artifacts; legacy records appear in virtual `Unsorted` without destructive migration.
- Replace `aiCritique` with independent capability fields and remove the compatibility alias after migration.
- Change improvement, comparison, and follow-up requests from embedded client review objects to owner-scoped review IDs.
- Use existing signed-upload and durable-job APIs as the only production image-processing path.
- Add case-study persistence and private export APIs before Portfolio activation.
- Split public readiness from operator diagnostics.
- Version all changed schemas and keep old records readable until verified migration completes.

## Validation and release rules

For every phase:

1. Confirm dependencies and gate state.
2. Read relevant Next.js 16.3.2 documentation.
3. Add failing tests where practical.
4. Implement server and domain foundations before UI.
5. Use server components by default and small client islands.
6. Run focused unit, API, rules, and browser tests.
7. Inspect affected flows at 320, 360, 390, 768, 1024, 1280, and 1440 pixels.
8. Verify keyboard, screen-reader, reduced-motion, forced-colors, and 200% zoom.
9. Run `npm run check`.
10. Run relevant E2E, DAST, smoke, and performance commands.
11. Review the complete phase diff for secrets, bypasses, demos, and unrelated work.
12. Commit only phase-related files and push without force.

Final mandatory commands:

```powershell
npm run check
npm run test:e2e
npm run test:e2e:free
npm run perf:budget
npm run dast:prelaunch
npm run smoke:production
npm run probe:operations
```

## Assumptions

- Work begins from `codex/product-activation` at `b11eead487cf67fa5948cb97e8ee3ef1eed23160`.
- Implementation uses a new `codex/system-completion-remediation` branch.
- The free product is the first production milestone.
- Primary cohorts are beginner designers, freelancers, and UI/UX designers.
- Provider calls, participant outreach, production promotion, email delivery, Community rollout, Billing, and public publishing require explicit gates.
- Existing user data and planning documents are preserved.
- No force-push, destructive reset, secret commit, or fabricated human or production evidence is permitted.
