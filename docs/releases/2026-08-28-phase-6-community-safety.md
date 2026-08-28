# Phase 6 Community Safety Evidence

Date: 2026-08-28
Decision: Technical implementation complete; rollout closed

## Delivered technical controls

- Strict public projections replace legacy full-review publication and exclude private review content.
- Versioned, project-specific consent supports immediate hiding, withdrawal, and retry-safe derivative deletion.
- Authors can edit or delete posts and tombstone their own comments; immutable author-deletion provenance prevents moderator or appeal restoration.
- Bidirectional blocks filter discovery and interaction. Post, comment, and account reports reject self-reporting, removed targets, and duplicate revisions.
- Moderator queues enforce moderator/senior-moderator roles for remove, restore, warn, restrict, ban, appeal review, and incident operations.
- Moderation actions bind to the effective target version. Appeals require an independent reviewer and cannot reverse a newer action.
- Privacy-minimized append-only audits and operator diagnostics exclude private review bodies and raw actor/target identifiers.
- Sixteen-shard counters, reconciliation, idempotent interactions, and terminal outbox handling avoid a single hot document and make drift repairable.
- Account deletion retains root records until comments, interactions, reports, report outbox records, notifications, moderation actions, and appeals are deleted successfully.
- Per-account aggregate, per-action, per-client, target, risky-account, link, mention, and report-abuse controls are server enforced.
- Firestore and Storage deny direct Community access. Persistent account-deletion locks also deny stale client tokens from private review data.
- The internal Community dispatcher remains concealed in closed mode and requires ready staff configuration plus a constant-time bearer credential.

## Automated evidence

- Focused deletion, moderation, upload, queue, and authorization regressions: 11 files, 48 tests passed after independent bypass review.
- Unit suite: 85 files, 331 tests passed.
- Firebase emulator rules: 36 tests passed.
- ESLint: zero warnings.
- TypeScript/Next route types: passed.
- Synthetic hot-post distribution: 10,000 identities spread across 16 deterministic shards.
- Closed-capability incident and staff-fixture exercises: passed in `community-operations.test.ts`.
- Free-profile Playwright: 1 browser scenario passed against Next.js 16, including direct Community-route gating.

- Full `npm run check`: passed after the independent bypass fixes, including production build.

## Gate remains closed

`AUT-0620` through `AUT-0622` are intentionally not executed. No code or environment change enables Community. The following evidence requires owners or a production-like environment and remains open:

- measurable retention that justifies Community;
- named Trust and Safety owner and backup;
- approved response windows, appeal policy, legal/privacy contact, and incident runbook;
- approved production-envelope hot-post, report-burst, deletion, and worker-backlog load tests;
- scheduled worker delivery and alert-routing proof;
- separate product and safety approvals.

## Residual operating constraints

- Account deletion must use the application orchestrator. Direct Firebase Auth console deletion can bypass the deletion lock and cannot revoke an already issued signed upload policy.
- A signed upload policy is constrained to the exact path, content type, nonce, four MiB limit, and a two-minute lifetime, but a real Cloud Storage boundary test requires a configured non-production bucket.
- Firebase ID-token revocation is enforced by server APIs using `auth_time`. Direct Firebase SDK sessions remain bounded by deployed rules and the persistent access lock; immediate general-purpose account disable/revoke requires every operator path to acquire that lock first. Removing this operating constraint would require a server-mediated data plane or rule-readable account-state version.
- The Community dispatcher exists but is not scheduled while rollout is closed.
