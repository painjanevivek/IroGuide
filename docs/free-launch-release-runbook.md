# Free-Profile Release Runbook

For the executable proof sequence, credential boundary, evidence files, and physical-device handoff, use `docs/free-launch-production-proof-runbook.md`.

## Release invariant

The external launch profile is `free`. A healthy release permits authentication, account settings, private review text and drafts, deletion, and stored bug reports. It does not invoke AI critique, source-image cloud storage, bug-report email delivery, or Community mutations.

## Required environment

- Set `IROGUIDE_LAUNCH_PROFILE=free` explicitly in staging and production.
- Configure matching Firebase client and Admin projects.
- Configure a trusted client-identity source: Vercel protected forwarding headers, or the reviewed non-Vercel proxy adapter.
- Configure Upstash Redis for production rate limiting. A production runtime without it must report unready and deny protected traffic.
- Keep paid provider and email credentials absent unless they are being tested in an isolated non-production environment.

## Pre-deployment gate

Run:

```bash
npm ci
npm run check
npm run test:e2e:free
```

Confirm that the capability-route matrix and the deployed environment still agree. A release fails if a gated CTA appears, a paid provider mock is called, Community accepts a mutation, a request exceeds its byte budget without `413`, or deletion can remove identity before owned-data cleanup completes.

## Staging verification

1. Open `/api/readiness`; confirm the public response contains only `ok`.
2. Sign in as an authorized operator at `/beta`; confirm account storage, project match, trusted identity, rate-limit adapter, and request budgets pass.
3. Create a new account, sign out, sign back in, change profile settings, and verify the dashboard empty state.
4. Confirm `/review` explains that critique is unavailable without presenting an active upload action.
5. Confirm `/community` is visibly gated and `POST /api/community` returns `404`.
6. Store a valid bug report and verify its Firestore record remains `disabled` or `pending` without an outbound email request.
7. Verify review text and active drafts remain owner-scoped. Confirm source-image controls are absent.
8. Delete review history. Confirm the response is either `complete` or a visible `retry-required` state.
9. Delete a test account. Confirm Firebase identity removal occurs only after review and Community cleanup completes.
10. Run the production-smoke workflow against the staging URL and attach the workflow URL to the release record.

## Privacy-safe operational events

Logs may include event name, route, request ID, duration, hashed user identifier, counts, status, and failure-operation names. They must not include raw user IDs, authorization data, design images, prompts, briefs, provider responses, email addresses, or deletion retry tokens.

Alert on:

- any readiness transition from healthy to unhealthy;
- `account_delete.cleanup_incomplete` or `account_reviews_delete.cleanup_incomplete`;
- repeated trusted-client-identity rejection;
- sustained production `429` responses caused by a rate-limit adapter outage;
- any successful Community mutation while its capability is closed;
- any paid-provider, source-image upload, or bug-report email event in the free profile;
- repeated request-body `413` responses that may indicate abuse or a client/server limit mismatch.

## Recovery and rollback

- Rate-limit adapter unavailable: keep the release fail-closed, restore Redis, then re-run readiness and smoke checks.
- Partial deletion: preserve the Firebase identity, show the retry state, restore the failing data adapter, and repeat the same deletion request. Cleanup operations are idempotent.
- Accidental capability exposure: set `IROGUIDE_LAUNCH_PROFILE=free`, redeploy, verify server denials, and invalidate the affected deployment.
- Account storage mismatch: stop invitations, align Firebase client/Admin project configuration, redeploy, then verify with a disposable account.

Do not bypass a red readiness signal to make a deadline. The free profile is useful only if its account and trust guarantees remain intact.
