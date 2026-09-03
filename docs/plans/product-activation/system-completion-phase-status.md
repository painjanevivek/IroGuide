# System Completion Phase Status

**Canonical plan:** `docs/plans/iroguide-system-completion-remediation-plan.md`

**Starting SHA:** `b11eead487cf67fa5948cb97e8ee3ef1eed23160`

**Execution branch:** `codex/system-completion-remediation`

**Reviewed:** 2026-09-03

This ledger distinguishes completed repository work from evidence that requires
credentials, human participants, physical devices, named operators, provider
spend, legal review, or a production rollout. A prepared harness is never
recorded as proof of the external event it is designed to measure.

| Plan phase | Repository outcome | Gate state | Evidence or exact dependency |
| --- | --- | --- | --- |
| 0 — Governance | Complete | Local GO | Canonical hash/parity check, Spec Kit mirror, requirement checklist, baseline inventory, and CI divergence check. |
| 1 — Capability isolation | Complete | Local GO | Thirteen exact server capabilities; production demo imports and the broad alias are rejected by `capabilities:verify`; development examples live only under `/internal/review-lab`. |
| 2 — Free product | Complete in repository | Deployment proof pending | Owner-scoped Projects, Unsorted compatibility, project-aware artifacts/export/deletion, truthful closed shells, public status, recent-auth admin readiness, and Firestore-authoritative support workflow. |
| 3 — Free release proof | Locally automatable work complete | External checks open | Existing release proof plus expanded desktop/Android/iPhone emulation. `ACT-0701`, `ACT-0702`, and `ACT-0706`–`ACT-0708` still require approved preview credentials, a real bucket, token/operator drills, assistive-technology operators, and physical devices. |
| 4 — Consented cohort | Prepared only | `GATE-EVIDENCE-01 = CLOSED — not observed` | Research script, consent boundary, metric dictionary, and decision template exist. Recruitment source, count, compensation, jurisdiction, facilitator, note taker, retention policy, consent, sessions, and seven-day observations require explicit owner approval. |
| 5 — Provider evaluation | Prepared only | `GATE-PROVIDER-01 = NO-GO` | Owned 80-case manifest/corpus validation and blinded evaluation tooling exist. Provider terms, approved budget, live candidate runs, two independent reviewers, adjudication, safety/support owners, and failure drills remain open. No provider call is authorized. |
| 6 — Invite-only critique | Infrastructure closed | Entry gate not met | Owner-bound uploads/jobs, validation, idempotency, leases, deletion, quotas, and provider controls remain disabled behind independent capabilities. Provider GO, entitlements, acknowledgement, staging proof, and limited-cohort approval are absent. |
| 7 — Retention | Closed | Provider/Alpha/Retention gates not met | Improvement, comparison, and follow-up routes fail before effects. No retention outcome is claimed and client-supplied embedded review payloads are not treated as a future authority boundary. |
| 8 — Portfolio | Closed | Portfolio prerequisites not met | The route is a lightweight private-evidence shell. Private/public capabilities remain separate; verified comparisons, traceable claims, redaction/export proof, consent, revocation, and a Portfolio decision are absent. |
| 9 — Operations | Automated baseline complete | Operating ownership open | Exact capability/demo/billing/corpus checks, unit/rules/browser proof, route budgets, LCP/INP/CLS ceilings, release probes, and Firestore support delivery exist. Named primary/backups, production dashboards, backup/restore drills, alert routing, and qualified legal/privacy review remain `ACT-1303`, `ACT-1304`, `ACT-1306`–`ACT-1308`, and `ACT-1312`. |
| 10 — Community | Closed | `launchable: false` | Heavy Community code is not loaded by the closed route. API, rules, workers, discovery, and data remain denied. Trust and Safety staffing, policy, response windows, legal/privacy contact, load/worker/alert proof, retention evidence, and independent approvals are absent. |
| 11 — Billing | Research only | `GATE-BILLING-01 = CLOSED` | No payment dependency, checkout, portal, webhook, purchasable plan, or entitlement path exists. Provider economics, retention, business/legal/tax decisions, owners, threat model, reconciliation, and rollout approval are absent. |
| 12 — Convergence | Complete in repository | Push completes handoff | Obsolete active aliases and route descriptions are removed, all local mandatory suites are rerun, task mirrors are reconciled, and commits are pushed without force. External gates above remain deliberately open. |

## Local validation record

- `npm run planning:verify` — PASS; canonical SHA-256 prefix `177694987187`, phases 0–12.
- `npm run capabilities:verify` — PASS; exact capability and demo isolation.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS with zero warnings.
- `npm test` — PASS; 108 files, 433 tests.
- `npm run test:rules` — PASS; 45 Firestore/Storage rule tests.
- `npm run test:e2e:free` — PASS; 20 Chromium tests.
- `npm run test:e2e:proof` — PASS; 32 route/accessibility tests and 4 intentional single-project skips across desktop Chromium, Android Chromium emulation, and iPhone WebKit emulation.
- `npm run check` — PASS, including secret hygiene, immutable workflow pins, billing denial, 80/80 owned corpus validation, types, lint, unit/rules tests, and the production build.
- `npm run perf:budget` against the local production build — PASS on all 10 required routes; worst observed LCP 448 ms, INP 32 ms, CLS 0.065, JavaScript 510 KB, and total transfer 611 KB.
- Local production-build DAST — 37/38 original checks passed; all route/header and fail-closed API checks passed. Public readiness correctly remained unavailable without a deployment-trusted client identity, so exact-SHA deployed DAST remains an external Phase 3 requirement.

Production performance, DAST, smoke, credentialed preview, backup/restore,
physical-device, research, provider, Community, and Billing results must be
recorded against the exact committed SHA by their authorized owners.
