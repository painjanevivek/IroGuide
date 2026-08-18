# Quickstart: Curiosity-Led Landing Experience

## Prerequisites

- Node.js and dependencies installed from the repository lockfile.
- Local environment configured from `.env.example` when the existing app requires it.
- Chromium installed for Playwright (`npm run test:e2e:install`) if it is not already available.

## Local review

1. Start the application with `npm run dev` and open `/`.
2. Confirm the first viewport states IroGuide's value and shows **Review my design** before waiting for an animation.
3. Explore each illustrative critique control. Confirm the active readout stays internally consistent, announces the example state, and the CTA targets `/review/new`.
4. Use only `Tab`, `Shift+Tab`, `Enter`, and `Space` to operate the landing page. Verify visible focus and no focus trap.
5. Emulate `prefers-reduced-motion: reduce` in browser devtools. Confirm all copy and actions remain available while smooth scrolling and decorative choreography are simplified.
6. Test a 390 × 844 touch viewport. Confirm controls stay readable and `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`.

## Validation sequence

Run the narrow checks while implementing, then the full relevant checks before handoff:

```powershell
npm run lint
npm run typecheck
npm test -- src/features/marketing
npm run test:e2e -- e2e/web-quality.spec.ts
npm run build
```

Run `npm run test:e2e` for the broader browser suite once focused coverage is green. Run `npm run check` when the local Firebase emulator/JDK prerequisite is available; that command includes `npm run test:rules`, which is outside this presentation-only feature's direct change surface but remains the repository-wide gate.
