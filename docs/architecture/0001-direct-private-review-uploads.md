# ADR 0001: Direct private review uploads

- Status: Accepted design; capability disabled in the `free` profile
- Decision date: 2026-08-24
- Owners: Product, application, and security

## Context

Next.js Functions are not a safe transport for large design files. Vercel rejects request bodies above its platform ceiling and buffering image bytes in the application function duplicates memory, cost, and failure modes. The current free launch therefore limits proxied images to 4 MB and does not enable source-image storage or paid critique.

## Decision

The future live flow must upload directly to private object storage. The application Function may issue and finalize authorization metadata, but image bytes above the Function ceiling must never transit the Function.

The contract is a four-state state machine:

1. `authorized`: an authenticated user requests an upload slot. The server creates an opaque upload ID and a short-lived authorization bound to `users/<uid>/review-uploads/<uploadId>/source`.
2. `uploaded`: Storage receives the object directly. Rules deny every path outside the exact UID and upload ID; authorization expires after five minutes and is single-use.
3. `validated`: a worker verifies magic bytes, decoded format, byte size, dimensions, and a 40-million-pixel decompression budget. It records a content digest and immutable metadata. Client-supplied MIME type and dimensions are advisory only.
4. `consumed` or `expired`: provider jobs may reference only a validated object owned by the same UID. Finalization atomically links the object to a review. Unconsumed objects expire after 24 hours and are removed by lifecycle policy plus reconciliation.

Cross-user paths, reused authorizations, expired authorizations, unexpected object names, multipart proxy uploads above 4 MB, and provider requests for non-validated objects are denied. The upload authorization contains no ambient provider or Firebase Admin credential.

## Activation gate

Implementation and activation require emulator tests for owner paths, expiry, replay, malformed images, oversized dimensions, interrupted finalization, and orphan cleanup. Until those tests and the worker exist, `sourceImageStorage` remains false in the free profile and no UI may advertise a larger limit.

