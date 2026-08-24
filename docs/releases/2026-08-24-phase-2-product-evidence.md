# Phase 2 Product-Evidence Release

## Release identity

- Source merge: `8e689e762206f0f045b39a2b21c0b63b2fd0cfdf`
- Production deployment: `dpl_8GYDP1P4Ssyv6eqsLyhkED13KUPn`
- Immutable URL: `https://iro-guide-3q0vy4yp7-vivek-painjanes-projects.vercel.app`
- Public canonical URL: `https://www.iroguide.com`
- Automatic smoke run: `32689388158` — passed

## Quality evidence

- `npm run check`: 68 test files and 245 unit tests passed; 14 Firebase rules tests passed; lint, type generation, immutable workflow pins, and the production build passed.
- Deterministic local Playwright: 13 passed; the intentionally closed Community scenario skipped.
- Focused Phase 2 Playwright: 2 passed, covering the bounded research payload, 390-pixel layout, and disabled-collection reporting.
- Production public checks passed for metadata, keyboard skip navigation, narrow viewport overflow, and reduced motion.
- Two existing public-web cases encode full-profile CTA labels and were excluded from the production-free result because production correctly renders “Review availability” instead of “Start a real review.” The same cases pass under their intended local full-profile test configuration.

## Deployed research-route checks

The production `/research` route returned `200` on 390 × 844 and 1440 × 1000 viewports, showed the explicit no-upload/no-live-provider disclosure, and had no horizontal overflow. The same core content remained visible with JavaScript disabled.

One verification run recorded:

- Desktop DOM content loaded: `514 ms`; load: `593 ms`; document transfer: `5,208 bytes`.
- Mobile DOM content loaded: `1,080 ms`; load: `1,087 ms`; document transfer: `5,214 bytes`.

These are point-in-time navigation observations, not an SLA or a Core Web Vitals field-data claim.

## Deployed security and gate checks

After the canonical redirect to `https://www.iroguide.com`:

- Public readiness: `200`.
- Product evidence without consent attestation: `403`.
- Product evidence with consent but without authentication: `401`.
- Research feedback without authentication: `401`.
- Admin insights without authentication: `401`.
- Community mutation: `404` while the Community gate remains closed.

Production has no `IROGUIDE_PRODUCT_EVIDENCE_MODE` override, so the code’s safe `noop` default remains active. No participant or retention evidence is claimed.

## Remaining external gate

The owner must approve a consented participant cohort before research sessions run. The provider-evaluation funding decision remains `NO-GO`, the production profile remains `free`, and Community remains closed.
