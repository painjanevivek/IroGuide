# Retention Evidence Model

## Progress cohort

Progress claims use only server-verified reviews compatible with the newest eligible review. Compatibility requires the same design category, provider, rubric version, and normalized score-dimension set. Reviews outside that cohort remain visible in private history but are counted as excluded evidence.

One compatible review is a baseline only. Average score may describe that baseline, but trend, strongest-area, weakest-area, recurring-issue, and practice claims require at least two compatible reviews. An issue is recurring only when its category appears in at least two distinct compatible reviews. Empty, unverified, or incompatible histories show the reason instead of a zero score or synthetic recommendation.

History is ordered by `savedAt desc` and document ID `desc`; the query helper accepts the final snapshot as a cursor for stable subsequent pages. Cursor pagination must preserve those two order fields.

## Retention events

These events are definitions for later privacy-reviewed analytics; this phase does not add a new analytics provider.

- `sign_in_completed`: hashed account ID and method enum; no email, provider subject, or profile fields.
- `documentation_opened`: hashed account ID and approved documentation-section enum.
- `review_availability_opened`: hashed account ID and approved navigation-source enum; this records interest, not a completed critique.
- `review_data_deleted`: hashed account ID and deletion-scope enum after a successful server response.
- `review_history_opened`: hashed account ID, eligible count, excluded count.
- `progress_baseline_seen`: hashed account ID, cohort signature hash, sample count `1`.
- `progress_comparable_seen`: hashed account ID, cohort signature hash, sample count, recurring issue count.
- `review_detail_reopened`: hashed account ID, age bucket, trust state; no review text.
- `case_study_draft_prepared`: hashed account ID, source count, comparison-present boolean.
- `case_study_blocked_unverified`: hashed account ID and reason enum.

Never emit design images, review text, issue content, category-specific free text, raw user IDs, document IDs, or case-study claims. Retention evaluation should compare cohort-level return rates and completion intervals, not individual creative content.

The first-party adapter is `noop` by default. Firestore collection requires an explicit environment change, a distinct 32-character-or-longer HMAC secret, a reviewed sample rate, and privileged readiness verification. The server derives the environment and HMAC account reference; the browser cannot supply either. Each client event has a UUID deduplication key, and storage writes use an HMAC of the account and UUID so retries cannot create duplicate rows.

The operator report returns only totals, unique pseudonymous-account counts, and categorical research aggregates. An absent event is labelled **not observed**, never converted into a zero-value product claim. Raw rows remain server-only under deny-all Firestore client rules.

## Private case-study boundary

The preparation schema is private and owner-bound. Every displayed claim includes a source review or comparison ID, while the outcome remains `null` until trusted comparison evidence exists. Legacy/unverified reviews and cross-owner data cannot create a case-study draft.

Export and public publishing remain disabled. A future specification must separately approve redaction, explicit project-level consent, source-image licensing, revocation, deletion propagation, share-link expiry, search indexing behavior, and abuse response before either capability is exposed.
