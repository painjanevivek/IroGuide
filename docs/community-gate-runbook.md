# Community Gate Runbook

Status: Closed by default
Owner: Product and security jointly

## Current contract

Community is not an immediate product capability. Navigation, footer discovery, sitemap entries, review CTAs, live board rendering, mutation API access, and Firestore reads remain closed. `/community` is a transparent unavailable page so bookmarked links explain the decision without exposing data.

The repository contains the technical safety implementation behind two independent denies: the product capability remains false in every launch profile, and `IROGUIDE_COMMUNITY_SAFETY_MODE` defaults to `closed`. A staff-mode worker also requires a complete moderator roster, audit key, and internal worker credential. These controls support synthetic validation; they do not authorize production activation.

There is no production operator override and no credential-only activation. Internal preview uses an isolated non-production Firebase project and a reviewed code/rules branch; it must never point at production Community collections.

## Regression inventory

- Capability resolver: `community` is false in development, free, and full profiles.
- UI: header, user menu, footer, pricing, projects, and review-unavailable actions contain no enabled Community entry.
- Route: `/community` renders the gated state and no board.
- API: user and moderator Community routes return 404 before authentication, parsing, or mutation while the capability or safety gate is closed.
- Data: Firestore rules deny all Community v1 collections and their counter/outbox derivatives, including signed-in reads and writes.
- Projection: only the strict public projection can leave server storage; private review fields and raw ownership identifiers are excluded.
- Safety: consent withdrawal hides immediately; reports, blocks, moderation actions, appeals, privacy-minimized audits, and repairable counters have server-only paths.
- Deletion: account deletion creates a persistent lock before derivative cleanup or identity deletion. Firestore and Storage rules reject stale client credentials once that lock exists.
- Worker: the internal dispatcher is staff-gated, constant-time bearer authenticated, bounded to one event per call, and terminalizes expired final-attempt leases.
- Search: sitemap omits `/community`; metadata is `noindex`.
- Release: free Playwright and production smoke verify direct-route/API denial.

## Account and upload operating constraint

All account deletion, disable, and refresh-token revocation operations must acquire IroGuide's persistent account-access lock first. Operators must not perform these actions directly through the Firebase console or uncoordinated support tooling: Firestore and Storage Rules cannot query Firebase Auth's live disabled/revoked state, and direct identity deletion cannot revoke an already issued Cloud Storage signed POST policy. The application blocks identity deletion while any upload policy remains unexpired and retries cleanup after expiry. Bucket lifecycle policy remains the backstop for abandoned staging objects. A future operator identity tool must call the same orchestrator and prove this invariant before use.

## Incident action

If any production layer exposes Community data or actions:

1. Treat it as a privacy incident and preserve request/deployment evidence.
2. Deploy Firestore rules with Community reads denied; this is the strongest boundary.
3. Confirm the mutation API returns 404 and disable the affected deployment if it does not.
4. Verify no public projection, comment, or interaction was created during the window.
5. Remove unintended derivatives, notify the privacy owner, and record scope and remediation.
6. Add the bypass to emulator, route, browser, and smoke regression coverage before reopening the application.

## Reopening criteria

Activation requires a separately approved rollout change. Technical implementation does not satisfy the gate: approved production-envelope load tests, a scheduled worker with delivery/backlog evidence, named Trust and Safety owner and backup, response and appeal policy, legal/privacy contact, retention evidence, and separate product and safety approvals are still required. Retention evidence alone is necessary but not sufficient.
