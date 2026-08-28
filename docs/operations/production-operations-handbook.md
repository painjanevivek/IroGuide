# IroGuide Production Operations Handbook

**Operational profile:** free guided learning
**Provider:** disabled
**Community:** closed
**Billing:** absent

## Service objectives and evidence states

Rolling windows use actual successful/eligible requests and exclude synthetic traffic from product metrics. A metric is `not-observed`, `insufficient-sample`, `measured-zero`, or `measured`; missing telemetry is never 100% success.

| Service indicator | Objective / window | Page threshold | Capability rollback |
|---|---|---|---|
| Public landing and `/api/readiness` availability | 99.9% / 30 days | Two failed probes in 10 minutes | Restore previous healthy SHA |
| Auth boundary availability | 99.9% / 30 days, excluding upstream declared incident | 5% server errors for 10 minutes | Disable new-account promotion; preserve sign-in/status path |
| Account and activation save success | 99.5% / 30 days | 2% unexpected server errors for 15 minutes | Fail writes closed; retain readable cached history |
| Free sample completion API success | 99.5% / 30 days | 2% unexpected failures for 15 minutes | Preserve public static example and local bounded progress |
| Account deletion terminal completion | 99.9% within 24 hours | Any item older than 24 hours | Lock account immediately; page privacy/security owner |
| Queue age and live review completion | Not applicable while provider is closed | Any provider call in free mode is severity 1 | Turn provider kill switch on and drain without new calls |
| Community read/write/worker execution | Must remain zero while closed | Any accepted mutation or dispatcher execution is severity 1 | Close Community capability and worker secret immediately |
| Billing checkout/webhook/entitlement work | Must remain zero | Any billing event is severity 1 | Disable route/deployment; payment cannot grant product access |

The 99.9% monthly error budget is approximately 43 minutes; 99.5% is approximately 3 hours 36 minutes. At 50% budget consumption in the first half of a window, pause non-reliability releases. At 100%, freeze releases except security, privacy, accessibility, rollback, and recovery work.

## Dashboard and alert contract

Operational dashboards may contain route templates, status classes, categorical capability states, deployment SHA, latency buckets, queue ages, counts, and de-identified account hashes. They must not contain email, raw UID, image/brief/review text, signed URLs, provider payloads, tokens, or document paths.

Required panels are public/API availability, p50/p95/p99 latency, status classes, rate-limit mode and saturation, activation-save conflicts, deletion age/retries, capability drift, provider calls/spend/queue age, Community mutations/backlog, deployment/rollback SHA, and synthetic-probe age. Gated panels display `not applicable`, not zero success.

Severity routing:

- `SEV-1`: cross-tenant exposure, secret exposure, any free-mode provider/Community/billing work, deletion-lock bypass, or broad outage. Incident commander, security/privacy owner, and product owner are required; acknowledge within 15 minutes.
- `SEV-2`: sustained SLO burn, stuck deletion, degraded auth/save path, queue/cost anomaly, or failed rollback. Engineering owner acknowledges within 30 minutes.
- `SEV-3`: bounded recoverable defect with a documented workaround. Triage in one business day.

Named people and paging destinations are deployment configuration, not repository defaults. Broad launch stays closed until every role has a primary and backup.

## Synthetic and scheduled assurance

`.github/workflows/operations.yml` runs weekly dependency audit, tracked-secret hygiene, immutable workflow-pin validation, evaluation/capability contracts, and Firebase/Storage rules. When `IROGUIDE_STAGING_URL` is configured, it also runs protected staging DAST and `scripts/operational-synthetic-probe.mjs`.

The synthetic probe covers landing, Learn, sign-in, support, privacy, readiness, access-interest auth, account-deletion auth, review-pipeline denial, Community denial, guided learning, and all free-mode external capability states. It uses only status and categorical readiness data.

Required repository configuration still pending: `IROGUIDE_STAGING_URL`, a least-privilege Vercel automation bypass secret, and protected environment approval. The job intentionally cannot create privileged user evidence without separately approved Firebase smoke credentials.

## Staging parity contract

Before release, staging must match production headers, Next.js/runtime version, Firebase rules, Storage policy, indexes, capability defaults, rate-limit adapter, observability schema, queue/provider disabled state, and retention configuration. Differences are listed in the release record with owner, expiry, and removal condition. Staging data and credentials are isolated from production.

## Backup and restore runbook

Backups must cover account-owned text, activation state, review/job state when enabled, immutable access/moderation audit, deletion locks, indexes/rules, and configuration manifests. Images require a separate encrypted Storage lifecycle and deletion contract. Billing ledger backup is not applicable until billing approval.

Quarterly restore proof uses an isolated project:

1. Name the source backup, source SHA/schema, destination, operator, and approved window.
2. Restore without routing application traffic or sending provider/email/Community/billing work.
3. Verify record counts and sampled hashes by collection; verify owner isolation, deletion locks, TTLs, and audit immutability.
4. Run rules tests, owner/cross-owner reads, activation export, deletion retry, readiness, and synthetic probes.
5. Destroy the isolated restore under the approved retention policy and record terminal deletion evidence.

No production restore proof exists yet; `ACT-1306` remains open until an authorized backup and isolated destination are supplied.

## Incident playbooks

Every playbook starts with timestamp, incident commander, affected SHA/environment, capability snapshot, scope, and evidence-preservation decision. Never paste tokens or user content into tickets or chat.

### Authentication or account-storage outage

Keep public learning readable, show a recoverable status, stop destructive retries, verify Firebase status and token validation, preserve account locks, and restore only after sign-in, ownership, stale-token, export, purge, and deletion smoke pass.

### Suspected data exposure

Stop affected writes and external processing, preserve tamper-resistant logs, rotate the narrow credential, identify exact tenant/object/time scope, notify security/privacy owners, follow legal notification decisions, and prove owner isolation plus deletion before reopening.

### Provider degradation or cost spike

Set the provider kill switch, stop dispatch, preserve queued jobs without new calls, classify failures, reconcile reservations/cost, notify affected invited users without exposing provider content, and reopen only after cap, timeout, retry, fallback, deletion, and rollback drills.

### Stuck jobs or deletion backlog

Lock affected accounts/resources, stop duplicate delivery, inspect categorical state/age only, retry idempotently, quarantine irreconcilable records, and page when deletion exceeds 24 hours or queue age exceeds its enabled-phase SLO.

### Community safety incident

Keep Community capability and dispatcher closed, preserve reports/appeals/audit, apply block/deletion locks, notify Trust and Safety plus privacy owner, and do not reopen from an incident branch.

### Deployment failure

Freeze promotion, compare the deployed SHA to the reviewed SHA, move the alias to the previous healthy deployment, run readiness/DAST/synthetic probes, communicate user impact, and restore the candidate only through a fresh approved deployment.

### Secret exposure

Revoke and rotate before investigating convenience fixes, identify logs/artifacts/forks containing the value, invalidate dependent sessions, run secret hygiene and capability probes, and document why the secret was reachable.

## Release checklist

- Reviewed SHA equals deployed SHA and required CI checks are green.
- Migration has forward, backward-compatible, retry, partial-failure, and rollback behavior; destructive backfill has an owner and backup.
- `npm run check`, cross-browser E2E, free-profile E2E, DAST, performance, production smoke, and operations probe evidence is attached or explicitly gate-closed.
- Capability matrix, environment changes, secrets/owners, quotas, support note, privacy/retention impact, screenshots, keyboard/screen-reader/zoom/physical-device evidence, and known defects are recorded.
- Previous healthy deployment and alias rollback are verified before promotion.
- User-facing status/change communication avoids promises for gated capabilities.

## Support-safe diagnostics

Support may request request ID, approximate time/timezone, route, browser/OS class, visible status, and reproducible steps using fictional data. Support must not request passwords, tokens, raw UID, private design files, signed URLs, provider payloads, `.env` files, or service-account JSON. `/api/readiness` and server request IDs expose only categorical capability/health information and no secrets.

## Flag, schema, and migration retirement register

Every flag/sample/schema/migration records owner role, introduction SHA, readers, writers, telemetry, deletion compatibility, earliest removal date, and removal issue. Retirement requires zero old writers, bounded migration completion, export/deletion compatibility, rollback evidence, and at least one full support window. Provider, Community, billing, and public-publishing flags cannot be retired into `on`; their gate must be replaced by an approved server-owned capability and release record.
