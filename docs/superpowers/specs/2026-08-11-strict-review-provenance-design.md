# Strict Review Provenance Security Design

## Status

Implemented and verified on 2026-08-11 on the `codex/fix-review-entitlement` security branch.

## Goal

Prevent clients from creating, modifying, or publishing reviews that IroGuide presents as trusted server-generated critique. Preserve offline drafting and imported content without allowing either path to claim live-provider provenance.

## Security invariant

A review may be marked complete, presented as live-provider output, or published to Community only when IroGuide's server generated and persisted it through the authenticated review-creation path. No browser, Firebase client SDK, synchronization request, imported document, or direct Firestore write may manufacture that trusted state.

## Scope

This design covers:

- trusted completed-review persistence;
- client draft and imported-review persistence;
- the review synchronization API;
- Firestore authorization rules;
- Community publication eligibility;
- compatibility and migration for existing unattested reviews;
- regression and Firebase rules coverage.

The paid-review entitlement gate introduced by commit `d852ed4` remains required and composes with this design. Entitlement determines who may request a paid review; provenance determines which stored result may be trusted and published.

## Non-goals

- Cryptographically signing reviews for verification outside IroGuide's server boundary.
- Allowing third-party review generators to mint trusted IroGuide provenance.
- Automatically deleting existing unattested reviews.
- Solving unrelated findings from the Deep Security Scan in the same patch. Those findings remain separate testable remediation phases.

## Selected approach

Use server ownership as the provenance boundary.

- `reviews` contains trusted completed reviews and is writable only through Firebase Admin server code.
- `reviewDrafts` contains user-owned drafts and imported content and remains writable under a bounded client schema.
- The server derives all trusted provenance fields. Request bodies and synchronized documents cannot set or override them.
- Community publication fetches the source review through Firebase Admin and requires valid trusted provenance before copying any review content into a public post.

This is preferred over signatures stored in the existing mixed-trust collection because server-only persistence already provides the required trust boundary with fewer keys, verification branches, and migration failure modes. A separate import-verification service is unnecessary because imported reviews are not promoted to trusted reviews.

## Data model

### Trusted review

A completed record in `reviews/{reviewId}` must include server-derived provenance:

```ts
type TrustedReviewProvenance = {
  origin: "server";
  schemaVersion: 1;
  generatedAt: string;
};
```

The stored review continues to include its normalized provider field, but the provider value alone is never proof of provenance. The server writes `provenance` after a provider result has passed `reviewOutputSchema` normalization.

The client cannot create, update, or delete arbitrary fields in `reviews`. User-requested deletion continues through authenticated server endpoints so ownership and cleanup remain enforced centrally.

### Draft or imported review

`reviewDrafts/{draftId}` stores untrusted user-authored state. Draft records use an explicit origin:

```ts
type ReviewDraftOrigin = "draft" | "imported";
```

Draft schemas must reject `origin: "server"`, trusted provenance objects, and any field that claims a live-provider attestation. An imported document may preserve review text for the owner's private use, but the UI must label it imported and it is not eligible for Community publication.

## Request and persistence flows

### Server-generated review

1. The browser submits an authenticated review request.
2. The API verifies the current Firebase identity and paid-review entitlement.
3. The API validates and bounds request content.
4. The configured provider returns a normalized `ReviewOutput`.
5. Server storage creates the completed review and adds server-derived provenance.
6. The API returns the trusted stored review identifier and persistence result.

Only this flow creates a trusted completed review.

### Client synchronization

1. The client submits bounded draft or imported content to `/api/reviews/sync`.
2. The API rejects completed status, server origin, trusted provenance, and live-provider claims.
3. Accepted documents are stored as `reviewDrafts` with `origin` set to `draft` or `imported`.
4. The response reports accepted and rejected document identifiers without silently reinterpreting trusted fields.

Synchronization never writes `reviews`.

### Community publication

1. The authenticated user submits a review identifier.
2. The server loads `reviews/{reviewId}` directly.
3. The server verifies ownership and strict provenance.
4. The server creates the Community post using the validated trusted review.
5. Missing, owner-mismatched, legacy, draft, imported, or malformed records are rejected before a public write.

Publication does not accept review content or provenance from the client.

## Existing data and migration

Existing records without valid trusted provenance are treated as legacy-unattested data.

- They remain readable in the owner's private history when their existing schema is otherwise valid.
- They are labeled imported or unverified in client projections.
- They cannot be published or described as trusted live-provider output.
- They are not automatically deleted or silently upgraded.
- A user can create a new trusted review by rerunning the design through the current server review endpoint.

A bounded migration script may later copy legacy private content into `reviewDrafts` with `origin: "imported"`, but that operational migration is not required to establish the enforcement boundary. Runtime code must fail closed even before such a migration runs.

## Firebase rules

Firestore rules enforce these boundaries independently of UI behavior:

- direct client create and update access to `reviews/{reviewId}` is denied;
- owner reads remain allowed for private trusted reviews;
- client draft writes require owner identity, an allowlisted schema, bounded fields, and `origin` equal to `draft` or `imported`;
- trusted provenance keys and server origin are forbidden in `reviewDrafts`;
- Community posts remain server-written so publication eligibility cannot be bypassed with a direct client write.

Rules tests must prove both allowed owner draft behavior and denial of forged complete/live/server-provenance records.

## Error behavior

- Synchronization returns HTTP 400 for a malformed or trust-claiming document.
- Community publication returns HTTP 404 for missing or non-owned records and HTTP 409 for an owned record that exists but lacks trusted provenance.
- Existing authentication, entitlement, rate-limit, and Firebase-unavailable responses remain unchanged.
- Rejections use product-safe messages and do not reveal whether another user's review identifier exists.

## Compatibility

- Creating a new live review continues to return a completed review and save it to account history.
- Offline drafting remains available.
- Private legacy history remains readable.
- The intentional compatibility change is that client-synced completed reviews and legacy unattested reviews cannot be published as trusted critique.
- Community cards may continue showing the normalized provider label only after server provenance has been verified.

## Test strategy

Implementation follows red-green-refactor for each boundary.

### Domain tests

- A server provenance schema accepts only `origin: "server"`, `schemaVersion: 1`, and a valid timestamp.
- Draft/import schemas reject server provenance and completed/live trust claims.
- Legacy records project to an unverified/imported state rather than trusted state.

### Server storage tests

- Saving a generated review adds server provenance regardless of client input.
- Synchronization stores only draft/imported documents and cannot write trusted reviews.
- Existing valid draft synchronization remains accepted.

### Route tests

- The review-creation route persists server provenance after provider normalization.
- The sync route rejects a forged live completed review.
- The sync route accepts a legitimate draft/imported document.
- Community publication rejects an owned unattested review and accepts an owned server-attested review.

### Firebase rules tests

- An owner cannot directly create or update `reviews`.
- An owner can read their trusted review.
- An owner can write a bounded draft/import record.
- An owner cannot put server provenance, completed status, or live-provider claims into a draft.
- Cross-user access remains denied.

### Verification

Run focused Vitest files first, then `npm test`, `npm run test:rules`, `npm run typecheck`, `npm run lint`, and `npm run build`. Re-run the forged-review regression through the realistic sync and Community boundaries after implementation.

## Rollout and observability

- Deploy Firestore rules and server code together; rules must not temporarily allow direct trusted-review writes.
- Log rejected provenance claims with a request identifier and log-safe user identifier, never review content or tokens.
- Track counts of rejected sync provenance claims and legacy publication attempts.
- Document the intentional legacy-publication restriction in release notes.
- Rollback may restore private legacy display behavior, but must not restore client authority to create trusted reviews.

### Implemented disclosure behavior

- Private dashboard history shows a compact Verified or Unverified import badge.
- Unverified review detail pages explain the restriction only where it affects interpretation or publishing.
- Community publishing lists only server-verified reviews; when only legacy content exists, the composer keeps it private and directs the owner to rerun the critique.
- A failed server save remains available as an unverified local copy and is never retried through the import endpoint as trusted output.

## Verification receipt

- `npm run check` passed end to end with JDK 25 selected for Firebase emulators.
- Vitest passed 129 tests across 41 files.
- Firebase Rules Unit Testing passed 11 Firestore and Storage rules tests.
- TypeScript, ESLint with zero warnings, and the Next.js production build passed.
- A forged completed/live/server-provenance sync payload is rejected with HTTP 400 before storage.
- An owned legacy-unattested review is rejected with HTTP 409 before any Community write.
- Verified entitled review creation, owner-only private reads, bounded import storage, and trusted Community publication remain supported.

## Remaining security program

This design closes the trusted-review provenance finding. The remaining Deep Security Scan findings—shared durable rate limiting, request-body limits, outbound deadlines, image decoding bounds, identity revocation, lifecycle races, pagination, analytics minimization, CI trust, URL validation, idempotency, and orphan cleanup—remain scheduled as independent remediation phases so each can be proven with its own regression tests and compatibility review.
