# Phase 9 Evidence — Provider Evaluation Gate

**Status:** `GATE-PROVIDER-01 = NO-GO`
**Date:** 2026-08-28
**Starting SHA:** `5b435ab`
**Branch:** `codex/product-activation`

## Authorized completion

- Expanded the evaluation manifest contract from two categories to all eight supported review categories.
- Required every registered case to declare a designed quality level and Mentor coverage, with only unique supported modes.
- Added a completion invariant for exactly ten cases per category: three strong, four mixed, and three weak/ambiguous.
- Added a completion invariant requiring Mentor across all 80 cases and both Friendly and Direct on exactly 24 stratified cases.
- Added unit-tested coverage reporting that preserves an incomplete corpus instead of presenting it as complete.
- Added a blinded reviewer packet with role separation, calibration, bounded ratings, blocking failures, evidence-region rules, quality thresholds, cost/latency fields, and insufficient-evidence handling.
- Added a repository-grounded live review pipeline threat model covering tenant isolation, image decoding, replay/spend, internal worker authorization, provider privacy/output, capability drift, evaluation bias, denial of service, and deletion races.
- Reverified that the free profile disables AI critique and source-image Storage and that provider/fallback activation remains separately kill-switched and cap-dependent.

## Current corpus and gate blockers

The manifest contains 3/80 purpose-built assets and 0/80 adjudicated cases. Missing cases were not created as metadata-only placeholders, copied from third parties, or mislabeled as owned. No provider candidate was called and no quality, latency, cost, retry, privacy, or nondeterminism result was invented.

Open blockers are:

- 77 additional owned assets, with ten real cases per supported category and the required quality/mode stratification.
- Verified ownership/consent, digests, decoded bounds, briefs, rubrics, and scenario status for the completed corpus.
- Owner-approved provider budget and data terms, daily/monthly caps, named Reviewer A, Reviewer B, adjudicator, security owner, support owner, and incident escalation.
- An 80-case Mentor run plus the 24-case Friendly/Direct run, two locked independent ratings per output, adjudication, and threshold calculations.
- Real kill-switch, quota/cap exhaustion, timeout, invalid-output, queue-drain, deletion-propagation, and exact-SHA rollback drills.

## Validation

| Command | Result |
|---|---|
| `npm run eval:reviews:validate` | Manifest valid; reports 3/80 registered and 0 adjudicated without promoting incomplete coverage |
| `npm run eval:reviews:unit` | Deterministic candidate coding, canonical hashes, summary hashes, ordering, validation, cost coverage, and latency aggregation pass |
| Focused manifest-distribution Vitest | Accepts the 3/4/3 eight-category target and rejects easy-case or mode-stratification drift |
| Provider control and pipeline configuration Vitest | Free profile, kill switch, caps, worker-secret, and adapter denial remain fail-closed |
| `npm run test:e2e:free` | Previously passed 20 scenarios with no provider or source-image side effect |

## Security decision

The threat model identifies high residual risk until real Storage isolation, decoder resource isolation, duplicate delivery/spend accounting, short-lived worker authorization, provider terms/deletion propagation, the owned adjudicated corpus, capability-drift monitoring, and deletion-race drills are proven.

## Gate decision

`GATE-PROVIDER-01 = NO-GO`. Production remains `free`; provider credentials cannot constitute approval. The next authorized action is corpus creation and owner/reviewer preparation, not a paid call or live entitlement.
