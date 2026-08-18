---

description: "Dependency-ordered execution tasks for the Curiosity-Led Landing Experience"
---

# Tasks: Curiosity-Led Landing Experience

**Input**: Design documents from [`specs/001-curiosity-motion/`](./)

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/landing-experience.md](./contracts/landing-experience.md), and [quickstart.md](./quickstart.md)

**Tests**: Include focused Vitest and Playwright coverage because the specification explicitly requires independently testable keyboard, reduced-motion, touch, static-fallback, and review-entry behaviour.

**Organization**: Each user-story phase is independently shippable after the shared preview model is in place. Check off a task only after its stated implementation and validation have both completed.

## Progress Maintenance Protocol

- Treat this file as the source of truth: tick a task only when its acceptance evidence is available locally.
- At the end of each work session, update the checkbox state, add a one-line note under the relevant checkpoint if work is blocked, and record the exact validation command/result in the task description or commit/PR.
- Preserve the existing `/review/new` flow, server-rendered landing content, and no-persistence boundary throughout all phases.
- If implementation reveals a change to scope, contract, data model, or quality gate, update the linked planning artifact first and then add a numbered task rather than silently extending an existing task.

### Required completion handoff — after every task and phase

After **every completed task** and again after **every completed phase**, generate this copy-pasteable handoff before moving on. Use `feat` for new user-facing capability and `fix` only for a repaired defect:

```text
feat(scope): concise completed change

- What changed: <specific user-visible or technical outcome>
- Why: <requirement, story, or risk addressed>
- Validation: <exact command(s), manual check(s), and result>
- Next: <next task ID or phase checkpoint>
```

For defect work, use the identical structure with `fix(scope): concise repaired behaviour`. Keep `scope` short and feature-oriented (for example, `landing`, `preview`, `motion`, or `a11y`), and never mark a task complete until its validation line is factual.

## Phase 1: Setup and Baseline

**Purpose**: Establish a repeatable baseline and a small, testable presentation-model seam without changing product behaviour.

- [X] T001 Record the current landing-page interaction baseline, existing review-link labels, and 390 px overflow result in `specs/001-curiosity-motion/tasks.md` before editing `src/features/marketing/landing-page.tsx`.
- [X] T002 [P] Review and retain the existing motion lifecycle and reduced-motion behaviour in `src/features/marketing/landing-smooth-motion.tsx` and `src/components/motion/use-prefers-reduced-motion.ts`; document any required compatibility constraints in `specs/001-curiosity-motion/research.md`.
- [X] T003 Create immutable `CritiqueBeat` definitions and a clamped active-index selection helper in `src/features/marketing/critique-preview-model.ts`, following the invariants in `specs/001-curiosity-motion/data-model.md`.
- [X] T004 [P] Add boundary and single-active-state coverage for the helper in `src/features/marketing/critique-preview-model.test.ts` before integrating it into the critique lab.

**Checkpoint**: The model has no persisted state, exposes at least three meaningful example beats, and is safe to use from the existing client component.

---

## Phase 2: Foundational Landing Guarantees

**Purpose**: Protect the non-negotiable baseline shared by every story: semantic server-first content, normal review links, and final readable states before animation enhancement.

**⚠️ CRITICAL**: Complete this phase before enabling any additional GSAP choreography or interaction semantics.

- [X] T005 Define semantic landmark, heading, example-disclaimer, preview-control, and review-link locators in `e2e/web-quality.spec.ts` so browser tests assert the UI contract in `specs/001-curiosity-motion/contracts/landing-experience.md`.
- [X] T006 Keep the value proposition, a labelled `/review/new` primary link, and an explicit static visual-story sequence in `src/features/marketing/landing-page.tsx`; do not make any of them conditional on client motion initialization.
- [X] T007 Ensure initial and final readable states, visible focus treatment, bounded decorative layers, and non-clipping layouts are represented in `src/app/globals.css`, which is the current home of landing-page styles.
- [X] T008 Verify `src/features/marketing/landing-smooth-motion.tsx` cleans up GSAP/observer work and never intercepts a review link or anchor when enhancement is disabled.

**Checkpoint**: Loading `/` with JavaScript delayed or motion disabled still exposes the value, story, preview text, and `/review/new` route.

---

## Phase 3: User Story 1 — Discover the value through a guided visual journey (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor immediately understands IroGuide, sees the primary review action, and can follow a concise context → insight → improvement story without relying on decorative movement.

**Independent Test**: Visit `/`, identify the visible value proposition and primary review link, use the link by keyboard, and confirm the route is `/review/new`; scroll through the story and confirm its stages remain readable after a fast traversal.

### Tests for User Story 1

- [X] T009 [P] [US1] Add Playwright assertions for the first-viewport value proposition, named primary review action, `/review/new` target, and complete story-stage text in `e2e/web-quality.spec.ts`.

### Implementation for User Story 1

- [X] T010 [US1] Recompose the hero and product-story sequence in `src/features/marketing/landing-page.tsx` so context, critique insight, and practical refinement are visually ordered while every stage remains in semantic HTML.
- [X] T011 [US1] Refine section-level reveal choreography in `src/features/marketing/landing-smooth-motion.tsx` so it reinforces sequence only after baseline content is visible and does not prevent normal anchor/review navigation.
- [X] T012 [US1] Implement the coherent journey visual language, static fallback, and responsive spacing for the hero/story/final CTA in `src/app/globals.css` without relying on `overflow-x: hidden` to conceal defects.
- [X] T013 [US1] Run the focused first-visit flow in `e2e/web-quality.spec.ts` and record the result beside this checkpoint in `specs/001-curiosity-motion/tasks.md`.

**Checkpoint**: User Story 1 is independently ready when the product purpose and review invitation are visible immediately and work without preview interaction.

---

## Phase 4: User Story 2 — Explore an intriguing critique preview (Priority: P2)

**Goal**: A hesitant visitor can inspect three clearly illustrative critique insights, understand each practical outcome, and continue to the existing review workflow.

**Independent Test**: Open the preview, use its controls to select each example insight, confirm a single labelled readout changes without conflicting content, then follow its CTA to `/review/new`.

### Tests for User Story 2

- [X] T014 [P] [US2] Extend `src/features/marketing/critique-preview-model.test.ts` to prove every configured beat has a unique id, non-personalized explanatory copy, and an outcome-oriented next step.
- [X] T015 [P] [US2] Add semantic Playwright coverage for labelled example status, `aria-pressed` selection, live readout change, and preview CTA target in `e2e/web-quality.spec.ts`.

### Implementation for User Story 2

- [X] T016 [US2] Replace local critique-beat data and index mutation in `src/features/marketing/animated-critique-lab.tsx` with the shared model/helper from `src/features/marketing/critique-preview-model.ts` while preserving one atomic active state.
- [X] T017 [US2] Update the preview’s control semantics, example disclosure, outcome copy, polite readout, and normal `/review/new` continuation link in `src/features/marketing/animated-critique-lab.tsx` according to `specs/001-curiosity-motion/contracts/landing-experience.md`.
- [X] T018 [US2] Style selected controls, readable example disclosure, readout hierarchy, and small-screen wrapping in `src/app/globals.css` without making drag, hover, SVG hotspots, or animation the only way to learn an insight.
- [X] T019 [US2] Run the model and preview browser checks for `src/features/marketing/critique-preview-model.test.ts` and `e2e/web-quality.spec.ts`, then record the result in `specs/001-curiosity-motion/tasks.md`.

**Checkpoint**: User Stories 1 and 2 both work independently; the preview feels product-specific but never claims to have analyzed the visitor’s work.

---

## Phase 5: User Story 3 — Experience motion without losing control (Priority: P3)

**Goal**: Motion creates curiosity for capable devices while keyboard, reduced-motion, touch, narrow-viewport, fast-scroll, and enhancement-failure paths retain equivalent content and control.

**Independent Test**: With `prefers-reduced-motion: reduce`, keyboard-only navigation, and a 390 × 844 viewport, reach every preview control and review CTA, observe visible focus/no trap, and confirm document width does not overflow.

### Tests for User Story 3

- [X] T020 [P] [US3] Add Playwright scenarios for reduced-motion static content, keyboard selection/focus order, and no document-level horizontal overflow at 390 × 844 in `e2e/web-quality.spec.ts`.
- [X] T021 [P] [US3] Add regression coverage for clamped rapid-selection requests in `src/features/marketing/critique-preview-model.test.ts` so repeated pointer, scroll, or drag signals cannot produce an invalid active state.

### Implementation for User Story 3

- [X] T022 [US3] Gate all non-essential scroll smoothing, path drawing, scramble text, draggable movement, and decorative transitions on the existing reduced-motion and small-viewport conditions in `src/features/marketing/landing-smooth-motion.tsx`.
- [X] T023 [US3] Make `src/features/marketing/animated-critique-lab.tsx` render and update complete semantic content immediately in basic mode while treating GSAP observer/drag/scrub behaviour as progressive enhancement with lifecycle cleanup.
- [X] T024 [US3] Harden focus visibility, target sizing, `max-inline-size`, grid/stack breakpoints, SVG containment, and final-state visibility in `src/app/globals.css`.
- [X] T025 [US3] Run the reduced-motion, keyboard, and narrow-touch flows in `e2e/web-quality.spec.ts` and log the exact browser command/result in `specs/001-curiosity-motion/tasks.md`.

**Checkpoint**: All three user stories work with or without enhanced motion; no interaction path requires scrolling, drag, hover, or animation completion.

---

## Phase 6: Polish and Cross-Cutting Quality

**Purpose**: Verify visual coherence, performance discipline, test quality, and handoff evidence across the completed experience.

- [X] T026 [P] Audit `src/features/marketing/landing-page.tsx`, `src/features/marketing/animated-critique-lab.tsx`, and `src/features/marketing/landing-smooth-motion.tsx` for animation that conveys hierarchy, sequence, feedback, or state only; remove ornamental movement that does not.
- [X] T027 [P] Inspect `src/app/globals.css` for transform/opacity/SVG-property-only enhancement, predictable final states, and absence of global horizontal-overflow masking; document any deliberate exception in `specs/001-curiosity-motion/research.md`.
- [X] T028 Run `npm run lint` against the changed files under `src/features/marketing/`, `src/app/`, and `e2e/`; record the pass/fail result in `specs/001-curiosity-motion/tasks.md`.
- [X] T029 Run `npm run typecheck` for the component and model changes in `src/features/marketing/`; record the pass/fail result in `specs/001-curiosity-motion/tasks.md`.
- [X] T030 Run focused Vitest checks for `src/features/marketing/critique-preview-model.test.ts` and focused Playwright checks in `e2e/web-quality.spec.ts`; record exact commands and results in `specs/001-curiosity-motion/tasks.md`.
- [X] T031 Run `npm run build` after all landing changes, verify the public route still compiles, and record the result in `specs/001-curiosity-motion/tasks.md`.
- [X] T032 Update the completion state and validation evidence for every task in `specs/001-curiosity-motion/tasks.md`, then compare the delivered UI against all requirements in `specs/001-curiosity-motion/spec.md` before handoff.

---

## Completion Evidence

- **Shared model and static fallback**: `src/features/marketing/critique-preview-model.test.ts` passes two Vitest tests covering unique illustrative beats and clamped rapid/invalid selection.
- **Public landing flow**: `e2e/web-quality.spec.ts` passes five Chromium scenarios, including the primary `/review/new` destination, hero-to-preview anchor navigation, no-JavaScript fallback, keyboard selection, reduced-motion mode, and 390 px page-overflow check.
- **Quality gates**: `npm run lint`, `npm run typecheck`, and `npm run build` completed successfully on 2026-08-18.
- **Visual review**: a local desktop Playwright capture confirmed the existing asymmetric hero remains intact. Full-page capture is not used as visual evidence because GSAP ScrollSmoother renders transformed content outside its native document-position model.

---

## Dependencies and Execution Order

```text
T001–T004  Setup/model seam
    ↓
T005–T008  Foundational server-first and accessibility guarantees
    ├── T009–T013  US1: guided visual journey (MVP)
    ├── T014–T019  US2: illustrative critique preview
    └── T020–T025  US3: motion-resilience and accessibility
              ↓
          T026–T032  Cross-cutting validation and handoff
```

### User Story Dependencies

- **US1 (P1)** begins after Phase 2 and is the suggested MVP. It does not require preview interaction.
- **US2 (P2)** uses the Phase 1 selection helper and can begin after Phase 2, but integration into the landing flow should retain US1’s stable review CTA.
- **US3 (P3)** begins after Phase 2 and can be developed alongside US2; final verification depends on the combined interactive preview and landing story.
- **Polish** begins once the desired story phases have passed their independent checkpoints.

## Parallel Opportunities

- **T002 and T004** can proceed in parallel because they touch separate motion-documentation and test/model files.
- **T009** can be prepared independently of the P1 component/style implementation.
- **T014 and T015** are parallel test tasks for US2; complete them before T016–T018.
- **T020 and T021** are parallel test tasks for US3; complete them before T022–T024.
- **T026 and T027** can be performed in parallel after implementation stabilizes.

## Parallel Example: User Story 2

```text
Task: "Extend model integrity tests in src/features/marketing/critique-preview-model.test.ts" (T014)
Task: "Add preview interaction coverage in e2e/web-quality.spec.ts" (T015)

After both tests establish the expected behaviour:
Task: "Integrate shared model in src/features/marketing/animated-critique-lab.tsx" (T016)
Task: "Style preview controls and responsive layout in src/app/route-styles.css" (T018)
```

## Implementation Strategy

### MVP first

1. Complete T001–T008 to protect the server-first, accessible baseline.
2. Complete T009–T013 (US1).
3. Pause at the US1 checkpoint: verify the initial message and `/review/new` journey before adding more visual novelty.

### Incremental delivery

1. Deliver US1 as the standalone discovery journey.
2. Add US2 only after its shared model, semantic controls, and example disclaimer are verified.
3. Add US3 hardening so the enhanced journey is equally usable without motion or precise pointer input.
4. Complete T026–T032 and hand off the completed task file as durable progress evidence.

## Format Validation

- Every executable item uses `- [ ] T###` and includes a concrete repository file path.
- Story work is labelled `[US1]`, `[US2]`, or `[US3]`; setup, foundation, and polish tasks intentionally have no story label.
- `[P]` appears only where the task can be completed independently in a different file or before its dependent implementation task.
