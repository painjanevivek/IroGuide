# IroGuide owned provider-evaluation corpus

This package completes the existing three seed cases with 77 original, purpose-built raster assets. The completed manifest has 80 cases: ten in each supported review category, with a `3 strong / 4 mixed / 3 weak-ambiguous` design target per category.

## Truth and ownership boundary

- The 77 new assets are generated from original SVG specifications in `scripts/lib/review-evaluation-corpus.mjs` and rendered locally with the repository's pinned `sharp` dependency.
- The generator uses no network access, external image, stock asset, external font, trademark, provider output, or private user content.
- Every manifest entry records its brief, design target, bounded evaluation focus, construction notes, reproducible visual seed, ownership statement, creation method, and SHA-256 digest.
- All cases remain `unlabeled`. Design targets are construction intent, not human-adjudicated expected findings.
- Human labels, reviewer identities, provider outputs, costs, latency, quality results, and activation approval are deliberately absent.

## Coverage contract

| Category | Total | Strong | Mixed | Weak/ambiguous | Mentor | Friendly + Direct strata |
|---|---:|---:|---:|---:|---:|---:|
| Logo | 10 | 3 | 4 | 3 | 10 | 3 |
| Poster | 10 | 3 | 4 | 3 | 10 | 3 |
| Social | 10 | 3 | 4 | 3 | 10 | 3 |
| UI | 10 | 3 | 4 | 3 | 10 | 3 |
| Website | 10 | 3 | 4 | 3 | 10 | 3 |
| Book cover | 10 | 3 | 4 | 3 | 10 | 3 |
| Packaging | 10 | 3 | 4 | 3 | 10 | 3 |
| Other | 10 | 3 | 4 | 3 | 10 | 3 |
| **Total** | **80** | **24** | **32** | **24** | **80** | **24** |

`corpus-plan.csv` maps every one of the 77 new cases to its category, quality target, Mentor coverage, Friendly/Direct stratum, asset path, and reproducible visual seed. `manifest.json` is the canonical machine-readable package.

## Offline workflow

```powershell
npm run eval:reviews:generate
npm run eval:reviews:validate
```

Generation is intentionally separate from provider evaluation. Neither command imports the review-provider implementation, reads provider credentials, changes launch capabilities, or makes a network call. Production remains on the free profile and `GATE-PROVIDER-01` remains `NO-GO` until the independent budget, terms, two-reviewer adjudication, support, privacy, cost, safety, and rollback requirements are satisfied.

## Reviewer preparation

Before any authorized candidate run, freeze the manifest digest, preserve the holdout, and follow `reviewer-packet.md`. The design-quality target may be used to verify sampling balance, but it must not be shown as an expected answer. Reviewers must create evidence-region criteria independently; the manifest cannot become `adjudicated` without two distinct locked ratings and an adjudicator.
