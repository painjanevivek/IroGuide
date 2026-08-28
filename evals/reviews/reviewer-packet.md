# Blinded Provider Evaluation Reviewer Packet

**Status:** prepared; no reviewer assigned and no output generated

## Separation of duties

- The run operator maps provider/model names to deterministic candidate codes and cannot score outputs.
- Reviewer A and Reviewer B work independently and do not see provider, model, price, latency, the other rating, or prompt-development notes.
- The adjudicator sees both completed ratings only after they are locked and resolves two-point disagreements or any blocking-failure disagreement.
- Reviewer pseudonyms identify roles, not people. The restricted operator record maps a named reviewer to a pseudonym and is not committed.

## Calibration

Before holdout scoring, reviewers independently score the same three non-holdout calibration outputs: one well-grounded result, one partially supported result, and one blocking invented-evidence result. They discuss rubric interpretation, then repeat calibration. Calibration does not become holdout evidence and cannot be used to tune a provider after unblinding.

## Rating sheet

Record only categorical scores and bounded notes:

| Field | Allowed value |
|---|---|
| Case ID / candidate code / repetition | Values from the generated blind sheet |
| Schema validity | 0, 1, 2 |
| Evidence grounding | 0, 1, 2 |
| Rubric fit | 0, 1, 2 |
| Prioritization | 0, 1, 2 |
| Actionability | 0, 1, 2 |
| Uncertainty handling | 0, 1, 2 |
| Blocking failure | none, invalid-schema, invented-evidence, privacy, wrong-artifact |
| Supported findings / expected findings / unsupported findings | Non-negative integers |
| Notes | Maximum 2,000 characters; no identity, secret, prompt, or private image content |

Every material finding must cite a normalized evidence region or an explicit brief constraint. An image cannot prove keyboard behavior, semantics, DOM order, screen-reader output, responsive behavior outside the captured viewport, or WCAG conformance.

## Gate calculations

- Precision = supported findings / all candidate findings; required `>= 0.80`.
- Recall = matched expected findings / all adjudicated expected findings; required `>= 0.70`.
- Unsupported-finding rate = unsupported findings / all candidate findings; required `<= 0.05`.
- Each scenario also requires at least 10/12 dimension points, evidence-grounding score 2, and no blocking failure.
- Report latency p50/p95, retry classes, invalid-output count, fallback use, known-cost coverage, total cost, and maximum completed-call cost separately from quality.

Missing labels, missing costs, reviewer disagreement, or unexplained nondeterminism is `insufficient evidence`, never a pass.
