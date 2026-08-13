# Review evaluation foundation

This foundation makes UI and website critiques measurable without presenting visual inspection as runtime accessibility verification.

## What ships

- Versioned UI and website rubrics with five weighted criteria each.
- Evidence, confidence, and criterion IDs for every live critique finding.
- A hard rejection of unsupported claims, including keyboard, screen-reader, semantic HTML, focus, responsive-behavior, and WCAG-conformance assertions based only on an image.
- A deterministic scoring and quality gate: precision at least 0.80, recall at least 0.70, and unsupported-finding rate at most 0.05.
- Server-owned, bounded per-finding feedback. It cannot be written or read directly through Firebase client rules.
- A framework-free two-specialist experiment runner. It is intentionally separate from production generation until it outperforms the baseline.

## Benchmark operations

`evals/reviews/manifest.json` contains only owned assets. It currently registers three seed assets and declares the 80-case target; it does not pretend the missing 77 cases have been reviewed.

For each new case:

1. Add an owned or purpose-built asset under `public/samples/` or another committed owned path.
2. Register the asset in the manifest as `unlabeled`.
3. Have two independent reviewers label the relevant rubric criteria and cite visible evidence.
4. An adjudicator resolves disagreements, records the final criteria, and changes the case to `adjudicated`.
5. Run `npm run eval:reviews:validate`, then score baseline and candidate outputs with `measureReviewEvaluation`.

Do not add third-party customer work, personal data, provider secrets, or unlicensed screenshots to the corpus.

## Multi-agent promotion rule

The specialist experiment may be promoted only after it is evaluated on the same adjudicated holdout cases as the single-model baseline and satisfies all quality gates without increasing latency or cost beyond the agreed budget. Until then, the production path remains the validated single-provider flow.

## Reviewer handbook

- Label only criteria that are visible in the asset or explicitly stated in the brief.
- Record the evidence region or brief constraint for every label.
- Use `visual-risk` for visible readability risk; request runtime testing for behavior or conformance.
- Mark an assertion unsupported when an image alone cannot establish it.
- Keep the holdout set separate from prompt-development examples.
