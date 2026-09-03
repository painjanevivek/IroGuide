# Limited Provider Evaluation Funding Decision

- Date: 2026-08-24
- Decision: `NO-GO`
- Current profile: `free`
- Revisit trigger: measured cohort evidence and an approved budget

## Decision

Do not fund or activate a limited live-provider evaluation yet. The product now has a privacy-safe, no-op-by-default evidence path and a prepared cohort-research workflow, but it has no approved participant cohort, no collected production evidence, and no approved provider budget.

This decision keeps Community closed and does not change the independent monetization `NO-GO`.

## Observed evidence

- The public free deployment passed its unauthenticated smoke and DAST gates.
- Live critique, paid-provider routes, and source-image cloud uploads remain closed in the `free` profile.
- The Phase 2 implementation validates an allowlisted event taxonomy and rejects unapproved fields such as email, raw user ID, document ID, image URL, and review text.
- First-party evidence collection defaults to `noop`; Firestore activation requires an explicit mode and HMAC secret.
- The operator report distinguishes “not observed” from a measured zero.
- Research feedback is categorical, signed-in, rate-limited, and unavailable while the evidence adapter is `noop`.

## Unobserved hypotheses

- Beginner designers will understand the critique loop without seeing live output.
- Freelancers will trust the privacy boundary enough to return with client-safe work.
- UI/UX designers will find the documentation and case-study workflow valuable.
- Review-availability interest will convert into repeated critique-to-revision use.
- A provider candidate can meet quality, latency, privacy, and unit-cost gates within an approved cap.

These are hypotheses, not launch claims.

## Required evidence for reconsideration

- Owner-approved, consented participation across the three primary cohorts.
- Completed accessibility and responsive checks on the deployed research journey.
- A measured operator report with sufficient sample context and known collection window.
- Qualitative findings separated from researcher interpretation.
- Approved provider-evaluation budget, daily and monthly caps, per-account quota, and named budget owner.
- Approved provider data terms and retention/deletion behavior.
- Passing evaluation scenarios with two reviewers and no blocking output failures.

Credentials alone do not reopen this decision.

## Phase 4 technical reassessment

The pre-approval implementation is now complete, but the decision remains `NO-GO`:

- The three seed paths were found to reference nonexistent PNG files. They now reference the owned WebP assets and are bound to checked-in SHA-256 digests.
- The 77 missing cases are now purpose-built from original local SVG specifications and rendered into an 80/80 owned corpus with exact category, quality, Mentor, and Friendly/Direct coverage. This creates no human or provider result evidence.
- The validator decodes every registered image under a pixel budget and rejects false ownership, hash, adjudication, evidence-region, or reviewer claims.
- The evaluation artifact runner produces stable result hashes, provider-blinded sheets, latency percentiles, and explicit cost-coverage state without making provider calls.
- Production live execution additionally requires an off kill switch, explicit live-enable flag, four positive quota/cost caps, and a 32+ character ledger HMAC key.
- Reservations are atomic and idempotent. Unknown provider cost is conservatively committed at the approved per-review maximum.
- Fallback has an independent default-off switch; spend, latency, invalid-output, failure, fallback, and stale-reservation diagnostics contain no prompt, image, or review content.

There are still zero adjudicated cases, no two named human reviewers, no approved data-use terms, no support owner, and no approved budget. Therefore `AUT-0410` through `AUT-0415` remain blocked by `GATE-PROVIDER-01` and no live calls were made. Corpus completion alone does not change the `NO-GO` decision.
