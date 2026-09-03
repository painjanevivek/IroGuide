# Product activation data model

**Status:** Proposed
**Parent plan:** `docs/plans/iroguide-product-activation-production-plan.md`

All persisted account data is owner-scoped. Server timestamps are authoritative. Analytics contains no creative content, email, raw UID, image URL, review text, or brief body.

Direct Firebase client reads and writes to every collection introduced in this document are denied. Access occurs through authenticated server APIs that enforce the account lock, ownership, validation, mutation limits, and no-store responses.

Every mutable activation document also carries `schemaVersion`, `revision`, and a bounded internal `recentMutationIds` receipt list. These fields support migrations, optimistic concurrency, and replay safety; `userId` and mutation receipts are removed from ordinary API responses.

## Guest sample progress

Unsigned visitors may store one bounded envelope in browser storage for at most seven days: sample ID/version, allowlisted revealed finding IDs, allowlisted checked action IDs, categorical reflection, created time, updated time, and schema version. It contains no user identifier, brief text, image, URL, or free-form content. Invalid, expired, oversized, or unknown-version envelopes are discarded. After authentication, merge is monotonic: union allowlisted progress and keep the newer categorical state; account data is never overwritten by an older guest envelope. The guest envelope is cleared only after the server result is read back and verified.

## `accountExperiences/{uid}`

One aggregate experience document per account. This replaces the previously proposed split between `onboardingProfiles` and `activationProgress`, keeping onboarding and next-action inputs version-consistent without a cross-document update.

| Field | Type | Rules |
| --- | --- | --- |
| `userId` | string | Must equal authenticated UID; immutable |
| `schemaVersion` | integer | Starts at `1`; required for migration |
| `revision` | integer | Optimistic concurrency token; increments on mutation |
| `primaryRole` | enum | `beginner-designer`, `freelancer`, `ui-ux-designer`, `other` |
| `primaryGoal` | enum | `learn-principles`, `pre-client-check`, `improve-ui`, `build-portfolio`, `other` |
| `preferredMode` | enum | `friendly`, `mentor`, `direct`; defaults from role but user-controlled |
| `selectedCategories` | string[] | Allowed rubric categories; unique; maximum 5 |
| `onboardingStatus` | enum | `not-started`, `in-progress`, `completed`, `skipped` |
| `onboardingStep` | integer | Bounded to current three-decision flow |
| `programVersion` | string | Example `free-activation-v1` |
| `steps` | map | Known step IDs only; boolean plus completion timestamp |
| `nextStep` | enum | Derived from incomplete required steps |
| `dismissedHints` | string[] | Allowlisted hint IDs; bounded |
| `onboardingCompletedAt` | timestamp/null | Server timestamp only |
| `lastVisitedAt` | timestamp | Server timestamp |
| `completedAt` | timestamp/null | Set only when required steps complete |
| `createdAt` | timestamp | Server timestamp only |
| `updatedAt` | timestamp | Server timestamp only |

Initial step IDs: `choose-path`, `inspect-sample`, `practice-rubric`, `prepare-brief`, `request-access`.

State transitions: `not-started → in-progress → completed`. A completed program may be reset only by explicit user action and retains a privacy-safe completion audit event.

Validation: no free-form biography, employer, client name, demographic trait, or sensitive profile data. Accounts created before this schema receive deterministic defaults on read and persist only after an explicit user mutation.

`primaryRole` and `primaryGoal` are nullable until the user confirms or skips onboarding. `preferredMode` defaults to `mentor`.

## `sampleCritiqueProgress/{uid_sampleVersion}`

One document per user/sample/version.

| Field | Type | Rules |
| --- | --- | --- |
| `userId` | string | Owner-bound |
| `sampleId` | string | Must reference an allowlisted owned sample |
| `sampleVersion` | string | Immutable for a progress record |
| `activeFindingId` | string/null | Allowlisted sample finding |
| `revealedFindingIds` | string[] | Unique and bounded |
| `checkedActionIds` | string[] | Unique and bounded |
| `reflectionChoice` | enum/null | Categorical; no free-form creative content |
| `completedAt` | timestamp/null | Set when the sample's required actions complete |
| `updatedAt` | timestamp | Server timestamp |

Sample assets and critique content are checked-in, owned, versioned, and public. They never imply analysis of the user's work.

## `selfReviewSessions/{uid_sessionId}`

Private educational checklists. No user image is uploaded or persisted.

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Server-generated or collision-resistant client ID |
| `userId` | string | Owner-bound |
| `rubricVersion` | string | Immutable |
| `category` | enum | Supported rubric category |
| `goalLabel` | string | Optional, trimmed, maximum 120 characters |
| `responses` | array | Maximum rubric item count; `yes`, `no`, `unsure`, `not-applicable` |
| `priorityItemIds` | string[] | Maximum 3, derived from `no`/`unsure` items |
| `status` | enum | `draft`, `completed`, `archived` |
| `createdAt` | timestamp | Server timestamp |
| `updatedAt` | timestamp | Server timestamp |

The UI must call this a self-review, never an AI critique or visual analysis.

## `designBriefDrafts/{uid_draftId}`

Reuse and version the existing owner-bound active-draft pattern.

| Field | Type | Rules |
| --- | --- | --- |
| `userId` | string | Owner-bound |
| `category` | enum/null | Supported category |
| `audience` | string | Maximum 240 characters |
| `purpose` | string | Maximum 400 characters |
| `style` | string | Maximum 240 characters |
| `goal` | string | Maximum 240 characters |
| `concern` | string | Maximum 400 characters; optional |
| `constraints` | string | Maximum 400 characters; optional |
| `mode` | enum | `friendly`, `mentor`, `direct` |
| `step` | integer | Bounded by flow version |
| `flowVersion` | string | Required for compatibility |
| `status` | enum | `draft`, `ready`, `consumed`, `archived` |
| `updatedAt` | timestamp | Server timestamp |

No image reference is accepted in the free activation flow.

## `reviewAccessInterests/{uid_programVersion}`

One active record per account and program version.

| Field | Type | Rules |
| --- | --- | --- |
| `userId` | string | Owner-bound; never exposed in aggregate output |
| `programVersion` | string | Example `provider-alpha-v1` |
| `cohort` | enum | Derived from onboarding role |
| `preferredCategory` | enum/null | Optional |
| `clientWorkIntent` | enum | `personal-only`, `client-safe-only`, `unsure` |
| `contactPermission` | boolean | Explicit opt-in; false by default |
| `status` | enum | `interested`, `invited`, `declined`, `expired`, `revoked` |
| `createdAt` | timestamp | Server timestamp |
| `updatedAt` | timestamp | Server timestamp |

Email is read from the authenticated account only when an authorized operator performs an approved invitation workflow; it is not duplicated into the interest record.

## `reviewAccessDecisionAudit/{eventId}`

Immutable, operator-only evidence for access decisions.

| Field | Type | Rules |
| --- | --- | --- |
| `schemaVersion` | integer | Starts at `1` |
| `eventId` | string | Collision-resistant idempotency identifier |
| `targetUserId` | string | Referenced only in the private operator collection |
| `actorUserId` | string | Must be an authorized operator and differ from target |
| `programVersion` | string | Must match the target interest record |
| `decision` | enum | `approve`, `decline`, `expire`, `revoke` |
| `reasonCode` | enum | Allowlisted operational reason; no free-form creative/account content |
| `previousStatus` | enum | State before the decision |
| `nextStatus` | enum | Valid state-machine result |
| `createdAt` | timestamp | Server timestamp; document is never updated or deleted by routine account controls |

The audit is not returned by account export and stores no email, brief, review, image, provider content, or operator note.

## Existing live-review entities retained behind gates

- `reviewUploads` and signed upload policies.
- `reviewJobs`, leases, attempts, outbox, and reconciliation state.
- `reviews` with provider/rubric/prompt provenance.
- `comparisons` with compatibility signatures and issue matches.
- `reviewConversations` and bounded `reviewMessages`.
- `caseStudies` with traceable private claims.
- Provider usage reservations and aggregate caps.
- Community projections, consents, reports, blocks, moderation actions, appeals, audit, outbox, and counter shards.

These entities are not activated by adding onboarding or free learning data.

## Deletion and retention

- Account experience, sample, self-review, brief, and interest records are deleted through the account-deletion orchestrator.
- A user can separately clear sample/self-review history without deleting the account.
- Revoking access interest changes status immediately and removes contact permission.
- Operational events use bounded retention and pseudonymous aggregation.
- No sample or self-review event contains user-entered brief content.
- Partial deletion remains retryable and visible; root access locks remain until terminal cleanup.
