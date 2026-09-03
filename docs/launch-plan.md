# IroGuide Launch Plan

> Execution note (2026-08-28): use `docs/plans/product-activation/revision.md` for the current Phase 0–15 activation order. This launch record remains authoritative for the free profile and independent provider, Community, billing, email, and publishing gates.

Status: Current staged-launch plan
Product state: Free production profile; paid provider and Community gated

## Launch principle

Launch the smallest trustworthy critique loop, learn from real design submissions, and expand only when feedback quality and privacy behavior are reliable. Community, publishing, generation, and payment must not outrun the core review experience.

## Current readiness

### Ready now

- Responsive marketing site and product story.
- Validated upload preview, category, brief, mode, and confirmation flow.
- Structured demo review, issue hierarchy, checklist, and improvement prompt.
- Authenticated history, bounded drafts, provenance-compatible progress, and retryable data deletion.
- Transparent Community gate and pricing/portfolio research previews.
- Typecheck, lint, unit tests, production build, route smoke tests, and security-header checks.

### Required before a provider-enabled alpha

- Approve a live-provider budget and direct private-upload implementation.
- Implement durable idempotent provider jobs, decoded-image validation, and orphan cleanup.
- Add durable review jobs, timeout/retry behavior, observability, and incident alerts.
- Complete legal privacy/terms review and provider data-processing review.
- Run manual keyboard, screen-reader, contrast, zoom, and mobile-device audits.
- Create a protected staging environment with production-equivalent headers and storage policy.

## Stage 1 — Private alpha

### Cohort

15–30 invited beginner designers, freelancers, and UI/UX designers with varied skill levels. Require informed consent for test data and prohibit sensitive/client-confidential uploads unless explicitly approved.

### Success gates

- At least 80% complete upload-to-review without facilitator help.
- At least 70% identify the first useful change within 30 seconds of opening a review.
- At least 65% rate the critique as more actionable than their usual feedback source.
- Fewer than 3% of valid reviews fail without recovery.
- Zero unintended public exposure or cross-account access.
- Direct mode produces no personal attacks in the reviewed sample.

### Feedback interview

1. What did you expect before uploading?
2. Which observation felt most grounded in the work?
3. Which recommendation was vague, wrong, or impractical?
4. Could you tell what to change first?
5. Did the score help or distract?
6. Did the chosen mode sound meaningfully different?
7. Would you upload client work? Why or why not?

## Stage 2 — Limited beta

### Cohort

200–500 waitlisted users from design schools, freelancer groups, creator communities, and product-design networks. Use review credits rather than billing until cost, quality, and retention are understood.

### Product gates

- Alpha targets hold across every supported design category.
- Review rubric and prompt versions are recorded for every output.
- Account deletion removes database and storage data within the stated window.
- Support, reporting, provider outage, and incident response paths are staffed.
- Community publishing and payment remain off unless their separate gates pass.

### Metrics

- Activation: account created → first valid review completed.
- Time to first value: upload start → first priority understood.
- Review usefulness by category and mode.
- Checklist interaction and follow-up usage.
- Seven-day return rate and second-review completion.
- Generation cost, latency, invalid response rate, and retry rate.
- Privacy deletion success and support-contact themes.

## Stage 3 — Public launch

Public launch requires stable beta quality, capacity testing, published policies, support coverage, and a rollback owner.

### Message

> Upload any design and get professional, honest, actionable feedback that explains what, why, and how.

### Channel sequence

1. Existing beta users and design-school communities.
2. Founder and product-design posts on LinkedIn and X.
3. Transparent build/learning story for Indie Hackers and relevant Reddit communities.
4. Product Hunt only after onboarding, capacity, and support are proven.
5. Short educational critique clips and newsletter partnerships.

Avoid manufactured testimonials, unsupported “expert-level” claims, or public critique examples without creator permission.

## Rollback and pause criteria

Pause new reviews when:

- Cross-account or unintended public access is suspected.
- Provider output becomes abusive, unrelated, or persistently invalid.
- Review failure rate exceeds 8% for 15 minutes.
- P95 review latency exceeds the communicated timeout for 30 minutes.
- Storage deletion or ownership verification fails.
- Cost controls or rate limits stop functioning.

The product should preserve drafts and communicate status honestly during a pause.

## Post-launch cadence

- Daily during first week: failures, safety, latency, cost, support, category quality.
- Weekly during first month: activation, usefulness, repeat use, recurring weak prompts.
- Monthly: rubric updates, provider evaluation, category expansion, accessibility regression, pricing hypotheses.
- Every prompt/rubric change: version, offline evaluation set, human review, canary release, rollback path.

## Immediate next implementation order

1. Keep the free capability matrix and Community gate regression-green.
2. Validate permitted auth, history, drafts, progress, bug-report, and deletion behavior.
3. Complete staging security, accessibility, and production smoke evidence.
4. Build the provider-independent evaluation and learning-loop contracts.
5. Revisit live provider and direct upload only after budget and quality approval.
6. Revisit Community only after retention and moderation gates pass.
