# Community Safety and Moderation Specification

## Current decision

Community remains closed. Navigation, API mutation, Firestore access, indexing, and public discovery stay gated in every launch profile. This document and the executable contracts define prerequisites; they do not authorize activation or identify a staffed moderation owner.

## Public/private boundary

Publication must create a new strict public projection validated by `communityPublicProjectionSchema`. It may contain only the selected title, bounded note, category, bounded critique excerpt, public display identity, publication timestamp, and consent record. It must not copy the private review document, source path, raw image, brief, account ID, email, provider payload, annotations, history, or deletion metadata.

Consent is project-specific, versioned, explicit, and revocable. Withdrawal immediately hides the projection, queues derivative deletion, prevents new interaction, and records a privacy-safe audit event. Account deletion uses the same propagation path and cannot complete while public derivatives have an unknown state.

## User controls

- Authors can edit the bounded public projection and delete their post without deleting the private source review.
- Comment authors can delete their own comments; post authors can hide comments on their posts without impersonating moderation.
- Blocking prevents both parties from discovering, opening, mentioning, commenting on, or receiving notifications about the other account.
- Reports support post, comment, and account targets with bounded reason codes and optional detail. Duplicate/report-abuse limits apply per reporter and target.
- Copyright and privacy reports receive a separate urgent queue. Self-harm reports follow a reviewed safety response that does not promise emergency service.

## Moderation and appeals

Moderators receive least-privilege roles separate from application administration. Removal, restoration, warning, restriction, ban, and appeal decisions require a reason code and immutable audit event. Audit records contain actor-role ID, target type/hash, action, reason, policy version, timestamps, and reversal linkage; they exclude private review content unless a separately authorized evidence snapshot is required.

Every removal can be appealed once within the policy window. A different moderator reviews appeals when staffing allows. Restoration reverses visibility and counter effects idempotently. Emergency privacy removal is immediate and can be reviewed afterward.

## Abuse and scale controls

- Server-enforced per-account, per-client, and per-target limits cover publishing, commenting, interactions, reports, mentions, and searches.
- New or risky accounts receive lower limits and cannot mass-mention or attach external links.
- Hot likes/saves/comments use sharded or asynchronous counters; displayed counts are derived and repairable, never authorization inputs.
- Mutation IDs are idempotent. Counter reconciliation detects duplicate delivery, negative totals, and deleted-target drift.
- Load tests cover one hot post, report bursts, delete propagation, block fan-out, moderator queues, and counter reconciliation at the approved launch envelope.

## Incident contract

A named Trust and Safety on-call role, backup, escalation path, response windows, and legal/privacy contact must exist before rollout. Incidents cover harassment campaigns, privacy leakage, cross-account data exposure, illegal content, moderator compromise, report flooding, counter corruption, and deletion backlog.

The first containment action is the Community capability kill switch, followed by write denial, public read denial when required, evidence preservation, affected-derivative deletion, user communication, and a documented reopening decision. Credentials or a product deadline cannot override a failed gate.

## Controlled rollout

1. Contract-only state: current state, capability closed and all production reads/writes denied.
2. Staff fixture environment: synthetic content only, audited moderator workflows, no general users.
3. Invite-only cohort: separately approved users, low quotas, daily queue review, immediate rollback.
4. Limited production: capped accounts and posts after retention evidence, load tests, deletion drills, and incident exercise pass.
5. Broader availability: separate decision based on abuse rate, appeal reversals, response time, deletion completion, and operator capacity.

Promotion requires a signed evaluation from `evaluateCommunityLaunch`; the production capability remains an additional independent deny-by-default control.

## Evidence required to open the gate

The machine-testable gates cover public projection, consent, author/comment deletion, reporting, blocking, moderator removal, appeals, audit log, abuse limits, deletion propagation, counter integrity, incident runbook, load test, end-to-end tests, and retention evidence. A named moderation owner plus separate product and safety approvals are also mandatory.

Today these implementation and operating proofs do not exist, so the correct evaluation is `launchable: false`.
