# Product Activation Controlling Revision

**Status:** Approved for authorized execution
**Source:** User-provided `PLAN.md`, reconciled 2026-08-28
**Execution ledger:** `tasks.md`

:codex-annotation{index="1"} This revision controls phase order and launch decisions. The master production plan remains the architectural catalogue and audit history; where its legacy phase order conflicts, this revision and `tasks.md` take precedence.

## Fixed product decisions

- Primary cohorts are beginner designers, freelancers, and UI/UX designers.
- Production remains in the `free` launch profile.
- Free learning never implies analysis of a user's design.
- Existing owned sample assets are reused before generating replacements.
- Guest sample progress is bounded to seven days and may be merged only into the authenticated owner account.
- Activation persistence uses authenticated server APIs and server-only Firestore writes.
- Portable account export precedes invite-only live critique.
- Community, providers, billing, email delivery, participant outreach, and public publishing remain independently gated.

## Corrected stepwise phase order

| Phase | Outcome | Prerequisites | Exit |
|---:|---|---|---|
| 0 | Governance, capability inventory, baseline, spec, and ledger | Reviewed repository | Phase 0 evidence and green planning commit |
| 1 | Public UX, responsive corrections, content truth, and navigation | Phase 0 | No misleading or broken public route |
| 2 | Activation schemas, APIs, rules, migration, and deletion foundation | Phase 0; may overlap Phase 1 | Persistence contract proven |
| 3 | Authentication continuity and resumable onboarding | Phases 1–2 | New user reaches a recommended path |
| 4 | Owned sample critique, self-review, and brief builder | Phases 1–3 | Useful free artifact completed |
| 5 | Guided dashboard, support, and data controls | Phase 4 | Every dashboard state has one next action |
| 6 | Privacy-safe evidence, account export, and operator access workflow | Phases 2–5 | Measurement and operations ready |
| 7 | Accessibility, browser, security, staging, deployment, and rollback proof | Phases 1–6 | `GATE-FREE-01` |
| 8 | Consented cohort research and product decision | Phase 7 and owner approval | `GATE-EVIDENCE-01` or `gate-closed` |
| 9 | Provider corpus, human evaluation, cost, privacy, and safety gate | Phase 8 plus owner approval | `GATE-PROVIDER-01` or `NO-GO` |
| 10 | Invite-only private live critique | Phase 9 `GO` | `GATE-ALPHA-01` |
| 11 | Follow-up, revision comparison, and retention | Phase 10 | `GATE-RETENTION-01` |
| 12 | Private evidence-backed Portfolio | Phase 11 | `GATE-PORTFOLIO-01` |
| 13 | Continuous operations and production hardening | Begins in Phase 0 | Operational readiness for enabled phases |
| 14 | Community conditional rollout track | Retention, staffing, policy, legal, and independent approvals | `GATE-COMMUNITY-01` or `gate-closed` |
| 15 | Billing conditional rollout track | Provider economics, retention, legal, tax, support, and business approvals | `GATE-BILLING-01` or `gate-closed` |

Phases 10–12 cannot be implemented or represented as available until their preceding gates return `GO`. Phases 14–15 are conditional tracks, not automatic continuation.

## Required phase protocol

1. Confirm entry criteria and unresolved external dependencies.
2. Read relevant Next.js 16.3.2 documentation before framework behavior changes.
3. Add or update focused tests before implementation where practical.
4. Build domain/server foundations before dependent client UI.
5. Prefer server components and small client interaction islands.
6. Preserve progressive rendering, no-JavaScript truth, reduced motion, reflow, and recoverable cached content.
7. Run focused validation, then inspect the affected browser flow.
8. Run the phase quality gate and record evidence.
9. Review the complete diff for secrets, capability bypasses, user work, generated output, and unrelated edits.
10. Mark verified ledger tasks, create one focused Conventional Commit, and push without force.

## Capability and data additions

- Add server-owned `guidedLearning`, fail-closed when invalid or missing.
- Add `accountExperiences`, `sampleCritiqueProgress`, `selfReviewSessions`, `designBriefDrafts`, `reviewAccessInterests`, and immutable `reviewAccessDecisionAudit` records.
- Deny direct Firebase clients access to all new collections.
- Add owner-scoped account experience, self-review, brief, access-interest, and account-export APIs.
- Preserve old drafts until a destination write is verified.
- Extend learning purge and account deletion with retryable terminal semantics.
- Retain privacy-safe raw evidence for 30 days and aggregates for 12 months.
- Require operator reason codes, immutable audit, replay protection, and self-approval denial.

## Independent closed gates

No request in this execution authorizes spending, provider calls, participant contact, production promotion, email delivery, Community rollout, billing activation, or public Portfolio publishing. Technical preparation may be completed and committed, but the gate record must name the exact missing approval, credential, person, policy, budget, or deployment evidence.
