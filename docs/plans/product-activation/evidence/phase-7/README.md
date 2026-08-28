# Phase 7 Evidence — Free-release Production Proof

**Status:** `GATE-FREE-01` closed
**Date:** 2026-08-28
**Starting SHA:** `d7b133fb6a26e1e14a9793d04665eb292ae6d61f`
**Reviewed preview SHA:** `7d8e8381f7d972d7b78ce8ea549c1f13c3c8c506`
**Branch:** `codex/product-activation`
**Release decision:** no production promotion

## Capability outcome

The free launch profile, guided learning, public safety boundaries, cross-browser verification, DAST, performance budgets, and staging rollback path are technically prepared. AI critique, source-image Storage, email, Community, billing, and public portfolio publishing remain disabled. The release gate is closed because authorized Firebase Admin runtime credentials, a working operator identity, a real signed-Storage exercise, and human assistive-technology/physical-device evidence are not available.

## Deployment and rollback evidence

- Vercel preview deployment `dpl_3gfneg9CeptxQKzjtAq5BxHP2aZh` was confirmed ready and GitHub deployment `6143492902` binds it to exact SHA `7d8e8381f7d972d7b78ce8ea549c1f13c3c8c506`.
- Deployment Protection stayed enabled. The official Vercel CLI generated the short-lived automation bypass used by the smoke tools; no bypass value was committed or printed.
- The staging alias was moved to previous healthy deployment `dpl_67ciVP3q6wws4cTc6HT3d3zx9rDC`, `/api/readiness` returned HTTP 200, and the alias was restored to the reviewed preview, where `/api/readiness` again returned HTTP 200.
- Production aliases and production capability flags were not changed. The temporary preview-only staging-proof secret was removed after diagnosis.

## Validation evidence

| Command or check | Result |
|---|---|
| `npm run check` | Passed on the Phase 7 implementation baseline: 103 Vitest files / 416 tests, 43 Firebase rules tests, typecheck, lint, workflow pins, evaluation validation, and production build |
| `npm run test:e2e` | Passed: 141 scenarios across Chromium, Firefox, and WebKit; 3 Community scenarios intentionally skipped while its capability is closed |
| `npm run test:e2e:free` | Passed: 20 Chromium scenarios with provider, source-image Storage, email, Community, and billing side-effect denial |
| `npm run dast:prelaunch` | Passed against protected staging: 38/38 route, header, origin, authentication, media, and readiness checks |
| `npm run perf:budget` | Passed: `/` LCP 780 ms / CLS 0.068 / 379,121 B JS; `/learn` 1,304 ms / 0.000 / 250,671 B; `/auth/sign-in` 760 ms / 0.000 / 371,831 B |
| `npm run smoke:production` against staging | 16/18 passed; public routes, security headers, capability denial, and readiness passed; both privileged Firebase checks correctly reported unavailable credentials |
| Exact-SHA rollback drill | Passed: previous and restored deployments each returned HTTP 200 from `/api/readiness` under Deployment Protection |

Generated reports remain ignored under `artifacts/`; they contain no evidence needed to reproduce a release decision and are not committed.

## Privileged proof diagnosis

A preview-only, same-origin, constant-time-secret-protected proof route and bounded client were added for operator readiness, a disposable verified-account lifecycle, and owner/cross-user/deletion-lock Storage boundaries. The route remained behind Deployment Protection and returned only safe categorical results.

The deployed client API key is present, but the existing preview Firebase Admin credential variables and configured operator UID resolve as unavailable to the runtime. Consequently all three privileged actions returned controlled HTTP 503 responses before any disposable identity or Storage object was created. No human, provider, Storage, email, Community, or billing evidence was fabricated. The proof secret was removed from Vercel after the diagnosis, so subsequent previews fail the internal route closed with HTTP 404.

## Accessibility and browser evidence

- Automated keyboard, focus, reduced-motion, forced-colors, zoom/reflow, long-content, narrow-layout, and responsive checks passed across the three browser engines.
- Viewport coverage includes 320, 360, 390, 768, 1024, 1280, and 1440 pixels across the public and activation suites.
- A real screen-reader session and a physical mobile-device run were not performed. Automated browser emulation is not represented as physical-device evidence.

## Residual constraints and removal conditions

| Constraint | Severity / owner | Safe workaround | Removal condition |
|---|---|---|---|
| Preview Firebase Admin credentials are unavailable at runtime | Release blocker / project owner | Keep production unpromoted; rely on emulator and API denial tests only | Install and verify a least-privilege preview service account, then pass operator, disposable-account, deletion-lock, and signed-Storage proofs |
| Configured preview operator UID is unavailable | Release blocker / project owner | Keep operator release actions closed | Provide a named, verified, authorized non-production operator account and pass `/api/admin/readiness` |
| Real screen-reader and physical-mobile evidence is absent | Release blocker / accessibility owner | Keep release gate closed; retain automated coverage | Record named-device, browser, assistive-technology, task, defect, and retest evidence |
| CI completion for the final evidence commit is external | Medium / repository owner | Keep production promotion manual and SHA-bound | Confirm required GitHub checks pass for the final Phase 7 SHA |

## Gate decision

`GATE-FREE-01 = CLOSED`. Public and automated release evidence is strong, rollback is proven, and capabilities remain fail-closed. Production promotion requires the four removal conditions above; no current evidence justifies bypassing them.
