# Provider-Independent Evaluation Suite

## Purpose

This gate evaluates review, revision-comparison, follow-up, and derived-action quality before any paid provider can be activated. Credentials and schema-valid JSON are not activation evidence by themselves.

## Approved scenarios

The canonical owned-corpus manifest is `evals/reviews/manifest.json`. It contains 80 purpose-built cases: the three existing public samples plus 77 original local-rendered holdout assets. Each of the eight categories contains ten cases with a `3 strong / 4 mixed / 3 weak-ambiguous` construction target. Mentor covers all 80 cases; exactly three cases per category (24 total) also form the Friendly/Direct tone stratum. `evals/reviews/corpus-plan.csv` maps every added case.

`src/domain/provider-evaluation.ts` remains a small contract-smoke list for scoring and malformed-output behavior; it is not the activation corpus. A release evaluation must use the frozen owned manifest and must not replace difficult cases with near-duplicates of the public samples.

For each visual scenario, preserve the same category, brief, rubric version, image bytes, and expected evidence regions across providers. Record the provider, model, prompt/contract version, timestamp, and reviewer pseudonym.

The manifest's quality target, evaluation focus, and construction notes are sampling metadata, not adjudicated answers. They must not be treated as expected findings or exposed to candidate providers as hints. Human expected criteria remain absent until two reviewers and an adjudicator complete the documented process.

## Human scoring guide

Each dimension is scored `0`, `1`, or `2`:

- `schemaValidity`: invalid/incomplete, repaired with lost meaning, or valid without invention.
- `evidenceGrounding`: unsupported, partially traceable, or every material finding traceable to visible/brief evidence.
- `rubricFit`: generic advice, partial category fit, or correct versioned rubric use.
- `prioritization`: arbitrary, plausible, or impact-based and internally consistent.
- `actionability`: vague, mixed, or concrete bounded actions.
- `uncertaintyHandling`: false certainty, inconsistent caveats, or explicit bounded uncertainty.

A scenario passes only with at least `10/12`, full evidence-grounding credit, and no blocking failure. Blocking failures are invalid schema, invented evidence, privacy exposure, or analysis of the wrong artifact. Two reviewers independently score activation candidates; disagreements of two points or any blocking-failure disagreement require adjudication.

## Contract checks

- Review: malformed or incomplete output fails closed. Repair may normalize safe formatting but must never invent observations, evidence, scores, annotations, or actions.
- Comparison: issue matches distinguish improved, remaining, regressed, unmatched, and low-confidence outcomes. Score deltas are eligible only when category, rubric, provider, and score dimensions are compatible.
- Follow-up: the server loads an owner-scoped review, bounds history and question sizes, and cites only issue IDs from that review.
- Derived action brief: the output is deterministic transformation of existing critique, carries `deterministic-derived` provenance, and is not scored as new image analysis.

## Activation evidence

Archive the scenario manifest version, raw provider outputs in a restricted store, normalized outputs, human rating records, aggregate failure counts, latency percentiles, and estimated cost per completed review. Do not place private source images or raw prompts in application logs.

No provider is eligible while any scenario has a blocking failure, while deterministic reruns produce materially different issue priorities without explanation, or while the rollback and spend caps in the activation decision record are missing.
