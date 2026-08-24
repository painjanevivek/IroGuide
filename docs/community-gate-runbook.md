# Community Gate Runbook

Status: Closed by default
Owner: Product and security jointly

## Current contract

Community is not an immediate product capability. Navigation, footer discovery, sitemap entries, review CTAs, live board rendering, mutation API work, and Firestore reads are closed. `/community` is a transparent unavailable page so bookmarked links explain the decision without exposing data.

There is no production operator override and no credential-only activation. Internal preview uses an isolated non-production Firebase project and a reviewed code/rules branch; it must never point at production Community collections.

## Regression inventory

- Capability resolver: `community` is false in development, free, and full profiles.
- UI: header, user menu, footer, pricing, projects, and review-unavailable actions contain no enabled Community entry.
- Route: `/community` renders the gated state and no board.
- API: `POST /api/community` returns 404 before authentication, parsing, or mutation.
- Data: Firestore rules deny posts, comments, and interactions, including signed-in reads.
- Search: sitemap omits `/community`; metadata is `noindex`.
- Release: free Playwright and production smoke verify direct-route/API denial.

## Incident action

If any production layer exposes Community data or actions:

1. Treat it as a privacy incident and preserve request/deployment evidence.
2. Deploy Firestore rules with Community reads denied; this is the strongest boundary.
3. Confirm the mutation API returns 404 and disable the affected deployment if it does not.
4. Verify no public projection, comment, or interaction was created during the window.
5. Remove unintended derivatives, notify the privacy owner, and record scope and remediation.
6. Add the bypass to emulator, route, browser, and smoke regression coverage before reopening the application.

## Reopening criteria

Activation requires a separately approved change covering public projection consent, author edit/delete, comment delete, report, block, moderator removal, appeals, audit log, abuse limits, deletion propagation, sharded counters, load tests, incident ownership, and rollback. Retention evidence alone is necessary but not sufficient.
