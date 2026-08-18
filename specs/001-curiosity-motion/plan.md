# Implementation Plan: Curiosity-Led Landing Experience

**Branch**: `001-curiosity-motion` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [`specs/001-curiosity-motion/spec.md`](./spec.md)

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Create an additive, curiosity-led landing journey that makes the value of IroGuide and the existing `/review/new` entry point immediately clear. Evolve the existing `AnimatedCritiqueLab`, hero specimen, and supporting page sections into one coherent narrative: understand the design context, isolate the most useful insight, then act on a practical refinement. Keep the server-rendered landing content as the baseline; layer client-side GSAP enhancement only where it reinforces that story. Every control retains a semantic, keyboard-operable static state, and reduced-motion and narrow touch layouts suppress non-essential choreography without withholding content.

## Technical Context

**Language/Version**: TypeScript 6.0, React 19.2, Next.js 16.2 (App Router)

**Primary Dependencies**: Next.js, React, GSAP 3.15 with `@gsap/react`, existing motion primitives, Lucide React; no new dependency is planned

**Storage**: N/A — presentation-only client state; no new persistence, API route, analytics schema, or account state

**Testing**: Vitest 4 for deterministic component/state behaviour; Playwright 1.61 for public landing, keyboard, reduced-motion, and narrow viewport flows; existing lint, typecheck, and production build gates

**Target Platform**: Modern desktop and mobile browsers served by the Next.js web application

**Project Type**: Web application, public marketing surface with an existing authenticated review workflow

**Performance Goals**: Keep the primary heading and review CTA immediately visible in server-rendered HTML; confine enhancement to transform/opacity/SVG-property animation; retain readable final states during fast scrolling, motion opt-out, and animation failure

**Constraints**: Preserve `/review/new` as the sole review-start destination; no horizontal overflow at a 390 px viewport; no focus trap or pointer-only interaction; respect `prefers-reduced-motion`; do not move server-only concerns into client code

**Scale/Scope**: One public landing route, its marketing feature components/styles, and focused browser/component coverage; no data migration or contract-breaking backend work

## Constitution Check

*GATE: Passed with a governance follow-up. Re-checked after Phase 1 design.*

The current `.specify/memory/constitution.md` is the unratified template, so it defines no enforceable project-specific gates. This plan follows the repository guidance as the temporary governing standard: Next.js/TypeScript structure, feature-local UI, explicit client boundaries, existing accessibility and responsive conventions, and the documented lint/typecheck/test/build quality gates. The design adds no persistence, API, authorization, or security-sensitive behaviour. Ratify the project constitution with `$speckit-constitution` before using it as a release-governance gate.

## Project Structure

### Documentation (this feature)

```text
specs/001-curiosity-motion/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                              # Public route entry
│   ├── globals.css                           # Global accessibility and base styles
│   └── route-styles.css                      # Landing visual and responsive styles
├── components/motion/
│   └── use-prefers-reduced-motion.ts         # Shared preference hook
└── features/marketing/
    ├── landing-page.tsx                      # Server-first landing composition
    ├── landing-smooth-motion.tsx             # Page-level progressive motion enhancement
    ├── animated-critique-lab.tsx             # Interactive illustrative preview
    ├── landing-scroll-header.tsx             # Navigation and mobile menu
    └── morphing-example-poster.tsx           # Decorative example artwork

e2e/
└── web-quality.spec.ts                       # Public landing accessibility/responsiveness checks
```

**Structure Decision**: Keep the single Next.js application. Enhance the existing feature-local marketing components and existing landing stylesheet; add only a small feature-local data/state module or colocated Vitest test if extracting the preview model makes it clearer. No new app, API route, database model, or shared global animation abstraction is justified.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | No constitution violation is introduced. | N/A |
