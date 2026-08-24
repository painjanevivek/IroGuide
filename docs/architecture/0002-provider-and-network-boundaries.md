# ADR 0002: Provider reliability and network boundaries

- Status: Accepted and partially enforced; live providers remain inactive in the `free` profile
- Decision date: 2026-08-24

## Network boundary

OpenRouter is the only production provider integration eligible for later approval. The generic custom endpoint mode is disabled whenever `NODE_ENV=production`. Development endpoint mode requires HTTPS, an exact hostname in `IROGUIDE_VISION_REVIEW_ALLOWED_HOSTS`, no URL credentials, blocked local/private literal addresses, redirects disabled, and a bounded request deadline. Production reactivation additionally requires DNS-answer and every-redirect-hop validation, connection pinning or controlled egress, and tests for IPv4, IPv6, rebinding, and private redirect targets.

Non-Vercel production deployments must set `IROGUIDE_TRUST_PROXY=1` and select either `x-real-ip` or `x-forwarded-for` only after the edge proxy is configured to remove caller-supplied values. Without a Vercel adapter or this explicit contract, readiness fails and security rate limits return 503 instead of sharing an `unknown` bucket.

## Provider job contract

Every future live request uses a durable Firestore job identified by `(uid, idempotencyKey)` with states `accepted`, `running`, `succeeded`, `failed-permanent`, and `failed-retryable`. The original request digest, provider/model, deadline, attempt count, result document ID, and privacy-safe failure class are immutable or append-only. A duplicate key with the same digest returns the existing state/result; a different digest is a conflict.

The provider has one 25-second end-to-end deadline shared by the primary and fallback. Only network failures, HTTP 408/429, and 5xx responses are fallback-eligible. Timeouts, permanent 4xx responses, schema failures, missing evidence, and rubric violations do not retry. A fallback cannot extend the shared deadline. Provider output must satisfy the strict response and grounded-evidence schemas; output repair may assign internal IDs but must never invent scores, findings, evidence, actions, or follow-up facts.

Live activation requires the durable job store and duplicate-request integration tests. Credentials alone never activate the capability.

