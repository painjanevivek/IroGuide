# Phase 1 Evidence — Public UX, Navigation, and Visual Corrections

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `62a99f64aef0ba6b26938f1cd0b1e4dfde0c8fb7`
**Branch:** `codex/product-activation`
**Rollback:** redeploy or check out the recorded starting SHA; this phase changes no persisted data or capability state.

## Entry and capability outcome

Phase 0 passed and the working branch matched its remote before implementation. This phase enabled no provider, upload, Storage, email, Community, billing, or public-publishing capability. The free launch continues to deny personalized critique creation and now directs public users to a useful example critique instead of an availability dead end.

## Implemented corrections

- Repaired the Projects heading wrap and Community horizontal overflow across the target width matrix.
- Moved the compact cookie panel below the mobile header so it clears both account actions and navigation controls.
- Added a keyboard-operable mobile menu plus Escape, outside-click, focus-return, and link-close behavior for mobile and account menus.
- Replaced free-mode `Review availability` and `Mode availability` labels with `Example critique` language and explicit `not an analysis of your work` disclosure.
- Demoted Projects, Portfolio, Community, Pricing, and Beta from primary/footer activation navigation.
- Replaced Portfolio and Pricing sales-like surfaces with truthful gated and research-only destinations; Community remains closed with one useful return action.
- Aligned public copy, FAQ structured data, canonical metadata, sitemap membership, robots/noindex policy, and social preview language with the free launch.
- Added route-level 404, expected error, and root error recovery shells. A global streamed loading boundary was tested and intentionally removed because it stranded no-JavaScript users on a fallback; loading and offline states remain route-specific concerns for the authenticated workspace in Phase 5.

## Automated validation

| Command or check | Result |
|---|---|
| `npx vitest run src/app/seo-metadata.test.ts` | Passed: 3 tests |
| `npm run lint` | Passed with zero warnings |
| `npm run typecheck` | Passed; Next.js 16.3.2 route types generated |
| `npm run test:e2e:free` | Passed: 16 Chromium free-profile tests |
| Responsive matrix | Passed at 320, 360, 390, 768, 1024, 1280, and 1440 CSS pixels |
| Accessibility edge states | Passed keyboard focus recovery, skip/recovery links, reduced motion, forced colors, and 200% zoom checks |
| Progressive rendering | Passed truthful free example with JavaScript disabled |
| `npm run check` | Passed: workflow pins, evaluation manifest, typecheck, lint, 332 unit tests, 36 Firebase rules tests, and production build |
| `git diff --check` | Passed; line-ending notices only |

## Browser and visual inspection

The in-app browser inspected the free-profile landing page, Projects, Community, About, Docs, Pricing, Portfolio, sign-up, and unknown-route recovery. DOM measurements reported no horizontal document overflow on the inspected routes, Projects used a bounded non-colliding heading, Community exposed exactly one primary return action, and gated routes emitted `noindex` metadata.

Screenshots are stored outside Git at:

`C:\Users\ASUS\.codex\visualizations\2026\08\23\01a02fcd-d720-7662-b6c5-f83b14302f37\iroguide-product-activation-phase-1-2026-08-28`

The folder contains desktop captures for the landing page, About, Docs, Projects, closed Community, Pricing, Portfolio, and 404 recovery, plus 320-pixel captures for the mobile menu and sign-up cookie spacing. Browser chrome produced effective desktop content widths of 1270 or 1430 CSS pixels; exact 1280 and 1440 layout assertions are covered by Playwright.

## Security, privacy, and residual constraints

- No secret, credential, `.env` file, generated trace, test report, cache, signed URL, user image, or private content is included.
- Gated pages do not expose checkout, Community writes, upload controls, or provider work.
- The public site has no service worker, so a cold offline navigation correctly remains a browser network failure rather than an unsupported cache promise. Recoverable authenticated offline and partial-sync states remain scheduled for Phase 5.
- An authenticated account-menu visual check requires a disposable configured account; static behavior was hardened here, while the authorized disposable-account journey remains part of Phase 7 readiness evidence.

## Gate decision

`PASS` for Phase 1. The public activation path is truthful, responsive, keyboard-recoverable, progressively rendered, and aligned with the free capability profile. The phase commit and remote push are represented by the Git commit containing this evidence record.
