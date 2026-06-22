# IroGuide Motion Audit

Status: Phase 0 baseline  
Scope: Animated UI implementation plan  
Last updated: 2026-06-23

## Motion Intent

IroGuide should feel attentive, precise, and professional. Motion should guide attention through scan, focus, reveal, prioritize, and confirm states. It should not become decorative noise or compete with uploaded work.

## Existing Motion Inventory

- Buttons already use hover lift and shadow transitions.
- Navigation links and text links fade on hover.
- Landing mode cards lift on hover and change border color.
- FAQ markers rotate when opened.
- Review category and feedback mode controls have selected-state transitions.
- Upload and avatar drop zones already have active visual states.
- Result annotations highlight on hover and focus.
- Issue cards highlight when linked annotations are active.
- Spinners use the shared `spin` keyframe.
- Community orbit is a looping decorative/product motion.
- Reduced-motion handling exists, but it should be expanded to include animation iteration count and scroll behavior.

## CSS-Only Targets

- Motion tokens in `src/app/globals.css`.
- Button, link, menu, card, and icon hover normalization.
- Upload/drop zone active state polish.
- Category and mode selected-state polish.
- Landing hero entrance, scan line, cursor note, and category rail marquee.
- Result annotation pulse and checklist completion polish.
- Dashboard card hover/focus polish.

## Structural Transition Targets

These should wait for shared motion primitives and Framer Motion:

- Review studio step transitions.
- Staggered review result reveal.
- Score bar animation.
- Dashboard populated-state reveals.
- Optional count-up behavior for dashboard metrics.
- Mounted/unmounted panels such as analysis stages and result sections.

## Reduced Motion Requirements

- Disable nonessential transforms, parallax, looping scan effects, and marquees under `prefers-reduced-motion: reduce`.
- Preserve visible focus, selected states, and textual status changes.
- Keep review analysis stages readable without movement.
- Keep score values available as text even when score bars do not animate.

## Baseline Visual Notes

### Landing

- Strong editorial hero with layered specimen.
- Good candidates for product-meaningful motion: specimen scan, score float micro-drift, critique priority pulse, cursor note, category rail.
- Risk: too much motion near the hero could compete with the H1 and CTA.

### Review Flow

- Step content currently swaps instantly.
- Upload and mode selection already have enough structure for tactile CSS polish.
- Future step animation must preserve form state and avoid moving text fields while typing.

### Review Result

- Uploaded design remains primary in the dark sticky preview.
- Annotation overlay is keyboard-accessible and linked to issue cards.
- Result sections currently render immediately; future reveal should prioritize summary, score, demo warning, and fix-first card.

### Dashboard

- Dashboard has honest loading, empty, error, and populated states.
- Recent review panel is the strongest candidate for first reveal.
- Progress metrics should animate calmly and never fabricate data.

## Phase 0 Acceptance Check

- No runtime behavior changes were introduced.
- CSS-only and Framer Motion targets are separated.
- Reduced-motion requirements are documented before implementation.
- Baseline visual notes cover landing, review flow, result, and dashboard states.
