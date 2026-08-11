# Strict Review Provenance Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task with red-green-refactor and verification before every commit.

**Goal:** Make server persistence the only path that can create a trusted completed review, while keeping drafts, imported reviews, and legacy private history usable without granting them trusted or publishable status.

**Architecture:** Domain schemas define explicit trusted and untrusted provenance. Firebase Admin review creation writes trusted records to `reviews`; synchronization writes only bounded draft/import records to `reviewDrafts`; Firestore rules deny all direct client writes to `reviews`; Community publication revalidates ownership and trusted provenance before creating public content. Client projections expose trust state progressively so legacy content remains readable but visibly unverified.

**Tech stack:** Next.js 16 route handlers, React 19, TypeScript, Zod 4, Firebase Admin, Firestore security rules, Vitest, Firebase Rules Unit Testing.

**Execution status:** Completed and verified on 2026-08-11.

---

## Phase 0: Publish the executable plan

**Files:**

- Create: `docs/superpowers/plans/2026-08-11-strict-review-provenance.md`

**Steps:**

1. Confirm the branch is `codex/fix-review-entitlement` and unrelated dirty files are excluded.
2. Save this phase-by-phase plan beside the approved specification.
3. Verify the plan references every enforcement boundary from the specification.
4. Commit and push with:

```text
docs(security): plan strict review provenance

- map trusted review creation to server-only persistence
- define test-first sync, rules, community, and compatibility phases
- record focused verification and rollout gates
```

## Phase 1: Define trusted and untrusted provenance in the domain

**Files:**

- Create: `src/domain/review-storage.test.ts`
- Modify: `src/domain/review-storage.ts`
- Modify: `src/lib/review-persistence.test.ts`
- Modify: `src/lib/review-persistence.ts`
- Modify: `src/lib/account-reviews.test.ts`
- Modify: `src/lib/account-reviews.ts`

**Red test:**

1. Add tests proving `trustedReviewProvenanceSchema` accepts only `{ origin: "server", schemaVersion: 1, generatedAt: <ISO timestamp> }`.
2. Add tests proving trusted documents are recognized only when strict provenance is present.
3. Add compatibility tests proving existing records without provenance remain readable and project as `trustState: "legacy-unverified"`.
4. Run:

```powershell
npx vitest run src/domain/review-storage.test.ts src/lib/review-persistence.test.ts src/lib/account-reviews.test.ts
```

Expected: fail because the provenance schema, guard, and trust projection do not exist.

**Green implementation:**

1. Add strict Zod schemas and exported types for trusted provenance and review trust state.
2. Make provenance optional only at the stored-document compatibility boundary; expose an `isTrustedReviewDocument` guard that requires the full exact attestation.
3. Keep the client-capable document builder untrusted by default; it must never add server provenance.
4. Project trusted documents as `server-verified` and all compatible unattested documents as `legacy-unverified`.
5. Rerun the focused tests and refactor without weakening assertions.
6. Commit and push with:

```text
feat(security): model strict review provenance

- validate server-issued review attestations with an exact schema
- classify legacy review records as private unverified content
- expose trust state without breaking existing account history
```

## Phase 2: Restrict trusted persistence to server generation

**Files:**

- Create: `src/server/review-provenance.ts`
- Create: `src/server/review-provenance.test.ts`
- Modify: `src/server/review-storage.test.ts`
- Modify: `src/server/review-storage.ts`
- Modify: `src/app/api/reviews/route.test.ts`

**Red test:**

1. Test that the server builder derives `origin`, `schemaVersion`, and `generatedAt` and ignores any caller-supplied trust fields.
2. Test that `saveReviewForUser` writes the trusted attestation into `reviews` after provider output normalization.
3. Test that the review-creation response continues reporting successful account persistence.
4. Run:

```powershell
npx vitest run src/server/review-provenance.test.ts src/server/review-storage.test.ts src/app/api/reviews/route.test.ts
```

Expected: fail because server provenance is not created or stored.

**Green implementation:**

1. Implement a server-only trusted document factory with an injectable clock for deterministic tests.
2. Use it exclusively from `saveReviewForUser`.
3. Keep the provider field normalized, but never use provider alone as proof of trust.
4. Persist provenance with server timestamps and preserve source-image behavior.
5. Rerun the focused tests.
6. Commit and push with:

```text
fix(security): attest server-generated reviews

- derive trusted provenance only inside server review storage
- persist normalized provider results with server attestation
- preserve authenticated review creation and private image storage
```

## Phase 3: Convert synchronization to bounded untrusted imports

**Files:**

- Modify: `src/domain/review-storage.test.ts`
- Modify: `src/domain/review-storage.ts`
- Modify: `src/server/review-storage.test.ts`
- Modify: `src/server/review-storage.ts`
- Create: `src/app/api/reviews/sync/route.test.ts`
- Modify: `src/app/api/reviews/sync/route.ts`
- Modify: `src/lib/review-sync.test.ts`
- Modify: `src/lib/review-sync.ts`
- Modify: `src/features/review/review-studio.tsx`

**Red test:**

1. Add an imported-review input schema with `origin: "imported"`, bounded identifiers and timestamps, normalized review content, and no trusted provenance.
2. Prove it rejects `status: "complete"`, `origin: "server"`, any `provenance` key, and `provider: "live"`.
3. Prove server sync writes accepted imports to `reviewDrafts`, never `reviews`.
4. Prove the route returns HTTP 400 for forged trust claims and accepts a legitimate import.
5. Prove client synchronization explicitly serializes imported origin and does not promote cache entries to trusted cloud reviews.
6. Run:

```powershell
npx vitest run src/domain/review-storage.test.ts src/server/review-storage.test.ts src/app/api/reviews/sync/route.test.ts src/lib/review-sync.test.ts
```

Expected: fail because sync accepts completed reviews and writes `reviews`.

**Green implementation:**

1. Parse sync bodies through the strict imported-review schema using Zod strict objects.
2. Normalize ownership and document identifiers from the verified Firebase user.
3. Store accepted imports in `reviewDrafts` with Admin-derived update timestamps.
4. Remove the retry path that re-submits a server-generated completed result as client authority; cache the server result for progressive local rendering and direct retries through the original authenticated review flow only.
5. Log rejected provenance claims with request and log-safe user identifiers, excluding content and credentials.
6. Rerun the focused tests.
7. Commit and push with:

```text
fix(security): isolate review imports from trusted storage

- reject completed live and server-provenance sync claims
- store bounded imported reviews only in reviewDrafts
- prevent client retries from promoting cached content to trusted reviews
```

## Phase 4: Enforce the boundary in Firestore rules

**Files:**

- Modify: `firestore.rules`
- Modify: `src/firebase-security.rules.test.ts`

**Red test:**

1. Change rules tests to require all client create, update, and delete operations on `reviews` to fail while owner reads continue to succeed.
2. Add valid draft and imported-record fixtures that satisfy the complete allowlisted schema.
3. Add denial cases for extra fields, server origin, provenance, completed status, live provider claims, invalid ownership, and cross-user reads.
4. Run:

```powershell
npm run test:rules
```

Expected: fail because direct owner writes to `reviews` are currently allowed and draft schemas are unbounded.

**Green implementation:**

1. Deny all client writes to `reviews` while retaining owner reads.
2. Add rule helpers for exact allowed keys, field bounds, owner identity, draft origin, and imported origin.
3. Require draft/import records to match their origin-specific allowlists and forbid trusted fields by construction.
4. Rerun rules tests.
5. Commit and push with:

```text
fix(firebase): enforce review provenance boundaries

- deny direct client writes to trusted review documents
- allow only bounded owner-authored drafts and imports
- reject forged provenance complete status and live-provider claims
```

## Phase 5: Gate Community publication on trusted provenance

**Files:**

- Create: `src/server/community-storage.test.ts`
- Modify: `src/server/community-storage.ts`
- Create: `src/app/api/community/route.test.ts`
- Modify: `src/app/api/community/route.ts`

**Red test:**

1. Test missing and non-owned review identifiers return the existing indistinguishable 404 behavior.
2. Test an owned legacy/unattested review returns a 409 and causes no Community write.
3. Test an owned strictly attested review creates a public post from server-loaded content.
4. Test client-supplied review content and provider fields are ignored because the mutation accepts only the review identifier and presentation metadata.
5. Run:

```powershell
npx vitest run src/server/community-storage.test.ts src/app/api/community/route.test.ts
```

Expected: fail because publication checks ownership but not provenance.

**Green implementation:**

1. Parse the source record with the stored-review compatibility schema.
2. Preserve 404 for missing, malformed, or non-owned records.
3. Use `isTrustedReviewDocument` after ownership and return a product-safe 409 for owned unattested records.
4. Add a structured log event for legacy publication attempts without review content.
5. Rerun the focused tests.
6. Commit and push with:

```text
fix(community): require trusted review provenance

- block publication of legacy imported and unattested critiques
- preserve indistinguishable ownership and missing-review errors
- publish only server-loaded reviews with valid attestation
```

## Phase 6: Disclose trust state in private history

**Files:**

- Modify: `src/features/dashboard/dashboard-client.tsx`
- Modify: `src/features/dashboard/dashboard-client.test.tsx` if present; otherwise create focused projection tests in `src/lib/account-reviews.test.ts`
- Modify: `src/app/globals.css` or the existing dashboard stylesheet only if a visual status treatment is required
- Modify: `docs/superpowers/specs/2026-08-11-strict-review-provenance-design.md`

**Red test:**

1. Prove legacy/unattested account reviews expose copy identifying them as imported or unverified.
2. Prove trusted reviews retain the normal provider label and publish controls.
3. Prove unverified reviews do not expose an enabled Community publish action.
4. Run the narrowest dashboard/projection test files.

Expected: fail because account UI does not distinguish trust state.

**Green implementation:**

1. Render a compact accessible trust badge only where it changes user action or interpretation.
2. Progressively disclose explanatory text on the detail/publish path instead of adding dense card content.
3. Disable or omit publish affordances for unattested history while keeping the private review readable.
4. Add release/rollout notes to the approved design document.
5. Rerun focused tests and inspect responsive styling if CSS changes.
6. Commit and push with:

```text
feat(reviews): disclose review trust state

- label legacy private critiques as unverified imports
- retain normal presentation for server-attested reviews
- remove publish affordances from content without trusted provenance
```

## Phase 7: Verify closure and record the security outcome

**Files:**

- Modify: `docs/superpowers/specs/2026-08-11-strict-review-provenance-design.md`
- Modify: `docs/superpowers/plans/2026-08-11-strict-review-provenance.md`

**Verification:**

1. Reinstall declared dependencies only if local resolution remains broken, and confirm no unintended manifest or lockfile drift.
2. Prevent ignored remediation worktrees from being collected by targeted commands; do not delete user files.
3. Run focused provenance regression tests.
4. Run:

```powershell
npm run typecheck
npm run lint
npm test
npm run test:rules
npm run build
```

5. Reproduce the original attack at both realistic boundaries:
   - a forged completed/live/server-provenance sync payload receives HTTP 400 and creates no `reviews` document;
   - an owned legacy unattested review receives HTTP 409 and creates no Community post.
6. Confirm legitimate behavior:
   - an entitled verified account can create and save a server-attested review;
   - the owner can read trusted and legacy private history;
   - a bounded draft/import can be stored privately;
   - an owned server-attested review can be published.
7. Record exact verification outcomes and mark completed plan phases.
8. Commit and push with:

```text
docs(security): record provenance remediation

- document regression coverage for forged review synchronization
- record trusted Community publication verification
- capture rollout constraints and remaining independent findings
```

## Completed phase receipts

- Phase 0: `aabca03 docs(security): plan strict review provenance`
- Phase 1: `718755b feat(security): model strict review provenance`
- Phase 2: `49d42ec fix(security): attest server-generated reviews`
- Phase 3: `2b4307d fix(security): isolate review imports from trusted storage`
- Phase 4: `b44e4aa fix(firebase): enforce review provenance boundaries`
- Phase 5: `6367b14 fix(community): require trusted review provenance`
- Phase 6: `b7981a7 feat(reviews): disclose review trust state`
- Phase 7 verification: `npm run check` passed with 129 unit tests, 11 Firebase rules tests, zero-warning lint, TypeScript, and production build.

The original exploit is closed at both independent boundaries: synchronization cannot write completed or trusted records, and Community cannot publish any review without exact server provenance. Existing legitimate private history remains readable and explicitly unverified when provenance is absent.
