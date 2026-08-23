# ADR 0003: Lifecycle, Community scale, and promotion gates

- Status: Accepted; Community remains gated
- Decision date: 2026-08-24

## Lifecycle deletion

Review deletion operates in bounded Firestore batches and bounded Storage listings. It always sweeps the private image prefix, regardless of the current creation capability, so a `full` to `free` profile change cannot strand historical files. Each operation is idempotent. A partial result is returned as `retry-required` with privacy-safe operation failures and a retry token; account identity deletion occurs only after all required cleanup succeeds. Large-account verification must force interruptions between batches and rerun until reconciliation reports zero owned records.

## Community activation boundary

Community is denied in navigation, sitemap discovery, direct mutation APIs, route content, and Firestore reads. Before activation, public counts must not update one hot post document per interaction. Use sharded counters with bounded shard count and an asynchronously reconciled projection. Required launch evidence includes contention tests, author and moderator deletion propagation, reports, blocks, audit logs, retention limits, and an owned incident runbook. No client capability flag can open Firestore reads; rules activation is a separately reviewed deployment.

## Promotion

Every successful staging and production deployment triggers the smoke workflow. Production automation performs non-destructive primary-route, readiness, capability, auth-denial, Community-denial, and security-header checks and stores the JSON report. Authenticated, rules-writing, provider, and deletion checks require manual approval. A failed smoke blocks a healthy promotion signal; the operator rolls back to the last deployment whose report passed, then records the failed check and corrective action.

Operational thresholds before expansion are: p95 API latency under 1.5 seconds for non-provider routes, zero cross-owner rule successes, zero incomplete deletions older than 24 hours, and no Community activation until the approved contention envelope passes.

