# Live Provider Activation Checklist

Activation is a separate product and operational decision. The presence of provider credentials must never bypass this checklist or change the free profile automatically.

## Contract and data boundary

- [ ] Direct private upload states from ADR 0001 are implemented with owner, expiry, replay, magic-byte, dimension, decompression, and orphan-cleanup tests.
- [ ] Durable provider jobs implement ADR 0002 and `src/server/review-job-contract.ts` with atomic `(uid, idempotencyKey)` uniqueness.
- [ ] Duplicate keys with the same request digest return the existing job; conflicting digests fail without provider use.
- [ ] Review, comparison, and follow-up records store schema, rubric, provider/model, prompt-contract, and generated-at provenance.
- [ ] Comparison score deltas are withheld when category, rubric, provider, or score dimensions are incompatible.
- [ ] Follow-up routes load the review server-side and verify its stored `userId`; client-supplied review content is not an authority source.

## Reliability and network boundary

- [ ] Primary and fallback attempts share one end-to-end deadline and one idempotency boundary.
- [ ] Only deadline, rate-limit, and provider-unavailable classes can retry; invalid output and policy failures are permanent.
- [ ] Production custom endpoints remain disabled unless controlled egress, DNS answer validation, redirect-hop validation, and connection pinning have independent security approval.
- [ ] Queue age, completion latency, retry count, permanent failure, and spend alerts are configured without logging source images or critique content.
- [ ] Cancellation, worker crash, duplicate delivery, provider timeout, and result-persistence failure tests pass.

## Quality and approval

- [ ] Every approved scenario in `docs/provider-evaluation-suite.md` passes with two human reviewers and no blocking failure.
- [ ] A fixed daily and monthly spend cap, per-user quota, and emergency provider kill switch are tested.
- [ ] Privacy terms, retention, deletion propagation, and provider data-use terms receive product/legal approval.
- [ ] Staging smoke proves upload, job polling, trusted persistence, retry behavior, deletion, and rollback for the exact release commit.
- [ ] Product, engineering, security, and budget owners record a signed go decision.

Until every item is complete, production remains `IROGUIDE_LAUNCH_PROFILE=free` and `aiCritique=false`.
