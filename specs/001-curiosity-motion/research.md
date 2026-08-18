# Research: Curiosity-Led Landing Experience

## Decision 1: Extend the existing marketing motion system

- **Decision**: Evolve `src/features/marketing/animated-critique-lab.tsx`, `landing-smooth-motion.tsx`, and the existing landing composition rather than add a new animation framework or a separate microsite.
- **Rationale**: The application already uses GSAP with React integration, scopes clean-up to the component lifecycle, and has an established `usePrefersReducedMotion` hook. The critique lab already models the right product arc—capture, focus, refine—and already links visitors to `/review/new`.
- **Alternatives considered**:
  - Add a second motion package: rejected because it increases bundle and maintenance cost while duplicating an existing capability.
  - Build the experience as a canvas/WebGL sequence: rejected because it would hide core content behind an imperative visual layer and make keyboard, reduced-motion, and narrow viewport support harder.
  - Replace the whole landing page: rejected because the approved scope is additive and the current page has valuable messaging, navigation, and review links to preserve.

## Decision 2: Make the story usable before JavaScript enhancement

- **Decision**: Render all story stages, insight labels, example copy, and review actions as ordinary semantic HTML. Run GSAP only after the client component mounts, and always leave final readable states in the stylesheet.
- **Rationale**: This satisfies the static-fallback and fast-scroll requirements, protects the first meaningful content, and avoids a visual loading gate.
- **Alternatives considered**:
  - Delay the hero or preview until its timeline is ready: rejected because it violates the requirement that value and CTA are available before decoration.
  - Encode stage content solely inside SVG/canvas: rejected because it degrades discoverability and accessibility.

## Decision 3: Use one explicit, controllable illustrative preview state

- **Decision**: Keep exactly one active critique beat at a time, using the existing three selectable controls and an in-page labelled readout. Name the preview as an example and include an outcome-oriented next step for every beat.
- **Rationale**: A single source of truth prevents rapid input from showing conflicting insight text. Semantic buttons offer a complete keyboard/touch path; pointer drag and scroll signals remain optional enhancements.
- **Alternatives considered**:
  - Autoplay a carousel: rejected because visitors cannot reliably inspect a single insight and it risks motion distraction.
  - Separate modal previews: rejected because they interrupt the landing journey and introduce focus-management risk.

## Decision 4: Treat reduced motion and mobile as equivalent, not diminished, experiences

- **Decision**: Continue to use `usePrefersReducedMotion` and the small-viewport branch in `LandingSmoothMotion`. In those modes, disable scroll smoothing, drawn paths, scramble text, draggable movement, and non-essential transitions; retain selected-state changes and complete copy instantly.
- **Rationale**: This preserves the information hierarchy while removing movement that can be uncomfortable or fragile on touch devices.
- **Alternatives considered**:
  - Hide the preview for reduced motion: rejected because the content is product explanation, not decoration.
  - Offer a custom motion-toggle stored in the account: rejected because the approved scope excludes new persistence and the system preference already supplies a dependable baseline.

## Decision 5: Protect responsive layout and input ergonomics in CSS

- **Decision**: Use the existing landing stylesheet with bounded grid/minmax sizing, `max-inline-size`, fluid type, and transform-only effects; ensure controls retain a visible focus style and touch target at all breakpoints.
- **Rationale**: The public quality suite already checks a 390 px viewport for document overflow. These constraints prevent visual ornaments, SVG panels, and control rows from creating horizontal scrolling.
- **Alternatives considered**:
  - Rely on `overflow-x: hidden`: rejected because it masks layout defects and can clip focusable content.
  - Provide hover-only hotspot interactions: rejected because they exclude keyboard and touch visitors.

## Decision 6: Verify outcomes at the component and browser layers

- **Decision**: Add deterministic coverage for preview state bounds/selection if the model is extracted; extend Playwright coverage for review navigation, keyboard selection, reduced motion, and narrow touch overflow. Run lint, typecheck, relevant Vitest tests, focused Playwright, and production build before handoff.
- **Rationale**: The feature’s main risks are interaction and rendering regressions, which static type checks cannot cover.
- **Alternatives considered**:
  - Snapshot-only verification: rejected because it would not prove focus order, real navigation, or media-preference behaviour.
  - Full end-to-end review submission: rejected because this feature stops at the already-tested review entry point and must not expand its scope.
