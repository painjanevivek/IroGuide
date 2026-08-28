# Phase 13 Evidence — Continuous Operations

**Status:** technical preparation complete; external operating gate open
**Date:** 2026-08-28
**Starting SHA:** `0398424`
**Branch:** `codex/product-activation`

## Implemented

- Added weekly and manual dependency, tracked-secret, workflow-pin, evaluation/capability, Firebase/Storage rules, protected-staging DAST, and capability-drift assurance.
- Added a no-content synthetic probe for public, Learn, auth, support, privacy, readiness, access-interest auth, account-deletion auth, review denial, Community denial, and free capability states.
- Added unit-tested readiness drift evaluation and integrated repository secret hygiene into the full local and CI quality gates.
- Defined measurable free-profile SLOs, error-budget policy, alert severity, privacy-safe dashboard fields, staging parity, backup/restore procedure, incident playbooks, release checklist, support-safe diagnostics, and retirement rules.
- Preserved gated-service indicators as `not applicable` and any free-mode provider/Community/billing work as severity 1.

## Validation

- `npm run security:secret-hygiene`
- `npm run security:workflow-pins`
- focused operational-probe Vitest
- local operational probe against a free-profile server
- `npm run check`
- workflow review confirming all third-party Actions use immutable 40-character SHAs

## Open operating evidence

`ACT-1303`, `ACT-1304`, `ACT-1306`, `ACT-1307`, `ACT-1308`, and `ACT-1312` remain open. Named primary/backup owners and paging routes, an external dashboard implementation, authorized backup/isolated restore proof, recurring destructive/kill-switch drills, deployed staging-parity evidence, and qualified legal/privacy/retention review cannot be created from repository code alone.

The scheduled deployed-assurance job also requires repository configuration for `IROGUIDE_STAGING_URL` and the Vercel automation bypass. Privileged account/storage probes still require approved Firebase smoke credentials.

## Gate decision

Continuous technical assurance is installed for the enabled free product. Broad launch and every gated capability remain blocked on their own owner/external evidence; operations documentation does not convert an unavailable owner or unrun restore into a pass.
