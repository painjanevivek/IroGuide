# Product activation research and decisions

**Status:** Complete for planning
**Date:** 2026-08-28
**Parent plan:** `docs/plans/iroguide-product-activation-production-plan.md`

## Decision 1 — Keep the launch profile free, but give it a real learning outcome

**Decision:** The public free experience will not accept a user's design for AI analysis while provider and source-image capabilities are disabled. It will provide owned sample critiques, a rubric-guided self-review, a design-brief builder, and a visible access-interest path.

**Rationale:** The product cannot truthfully promise personalized visual critique without examining the user's image. A useful educational loop can be delivered without paid calls, private image storage, or misleading deterministic output.

**Alternatives considered:**

- Enable the existing demo provider for production: rejected because it can appear to have analyzed pixels when it has not.
- Accept an image only in browser memory for a generic critique: rejected for the same truthfulness problem.
- Keep only the current availability page: rejected because it produces no first-session value.

## Decision 2 — Make activation a progressive, resumable journey

**Decision:** The signed-in product will guide a first user through role selection, one recommended learning path, a sample critique, a brief draft, and an explicit access request. Every step is skippable, resumable, and reversible.

**Rationale:** The current dashboard has no actionable sequence. Progressive disclosure reduces the blank-state problem without overwhelming beginners or hiding advanced routes from returning users.

**Alternatives considered:**

- A modal product tour: rejected as the primary mechanism because tours are easy to dismiss and do not produce an artifact.
- A long onboarding questionnaire: rejected because it delays value and collects unnecessary profile data.
- Documentation-only guidance: rejected because it separates instructions from the task.

## Decision 3 — Keep the primary cohorts explicit

**Decision:** Beginner designers, freelancers, and UI/UX designers remain the first cohorts. Onboarding may tailor labels, examples, and recommended rubrics, but the critique contract and safety standards remain consistent.

**Rationale:** These groups have distinct contexts while sharing the need for specific, timely critique. The product should adapt guidance depth, not create incompatible products.

**Alternatives considered:** A generic “designer” persona was rejected because it prevents useful onboarding and cohort analysis.

## Decision 4 — Reduce navigation to available work

**Decision:** Primary navigation will emphasize Home, Learn, Workspace, and Help. Review access is labeled honestly. Portfolio, Community, and Pricing remain accessible only as clearly marked research/gated destinations and are removed from the primary activation path.

**Rationale:** Gated and conceptual destinations make the product feel unfinished and compete with the one useful path.

**Alternatives considered:** Keeping every route equally prominent was rejected because route availability is not the same as user value.

## Decision 5 — Preserve server-first rendering and feature-local interaction

**Decision:** Next.js server components remain the default. Client components are limited to onboarding controls, sample critique interaction, checklist progress, brief editing, and consent-aware measurement.

**Rationale:** This matches the repository structure, improves initial rendering, limits JavaScript, and avoids importing server-only concerns into the client.

**Alternatives considered:** A client-only workspace shell was rejected because it increases loading states and bundle cost without a corresponding product benefit.

## Decision 6 — Reuse current product foundations before adding dependencies

**Decision:** Reuse the existing design tokens, route styles, motion utilities, Zod schemas, Firebase boundaries, analytics adapter, and launch capability model. Add no dependency during the free activation phases unless a measured need cannot be met by the current stack.

**Rationale:** The project already includes the necessary UI, schema, auth, analytics, and animation foundations. New libraries would add bundle and maintenance cost.

## Decision 7 — Store only necessary activation data

**Decision:** Persist cohort role, selected learning goal, onboarding completion, checklist state, sample progress, brief drafts, and access-interest state. Do not store uploaded creative content in the free learning path. Do not put email, raw UID, image data, brief content, or review text in analytics.

**Rationale:** This provides continuity while preserving the free profile's privacy boundary.

## Decision 8 — Make all availability states explicit and server-owned

**Decision:** UI labels, routes, APIs, storage, and background work derive availability from server-owned launch capabilities. Client flags may improve presentation but never grant access.

**Rationale:** Credentials or UI state must not accidentally enable paid or gated capabilities.

## Decision 9 — Treat accessibility as a release gate

**Decision:** Target WCAG 2.2 AA and require keyboard, focus, screen-reader, contrast, 200% zoom, reduced-motion, touch target, and responsive evidence for each user-visible phase.

**Rationale:** The primary cohort includes learners who need clear, low-friction instruction; accessibility failures directly undermine the product promise.

## Decision 10 — Measure task completion, not page traffic

**Decision:** The activation funnel measures meaningful actions: onboarding completed or skipped, sample critique completed, first brief saved, access interest recorded, workspace revisited, and later review/revision completion. Page views remain secondary.

**Rationale:** A visually engaging site can produce page views without producing learning or retention.

## Decision 11 — Provider activation remains a separate evidence gate

**Decision:** The plan may complete inactive infrastructure and evaluation preparation, but no live call, production entitlement, or provider profile change occurs without approved budget, data terms, evaluation assets, two human reviewers, and named support ownership.

**Rationale:** The current evidence contains only 3 of 80 target cases, no adjudication, and no approved cost envelope.

## Decision 12 — Community and billing remain out of the core delivery path

**Decision:** Community rollout and billing implementation remain gate-closed. Community safety code stays maintained and tested, but no public rollout follows automatically from technical completion.

**Rationale:** Neither feature fixes the missing first-value path. Both add substantial operational risk.

## Decision 13 — Fix visible quality defects before adding new surfaces

**Decision:** Repair Projects heading collision, Community horizontal overflow, cookie-banner obstruction, inconsistent gated CTA wording, and navigation ambiguity before the activation build expands.

**Rationale:** These defects reduce trust and make the existing product appear less production-grade.

## Decision 14 — Use evidence-gated rollouts

**Decision:** Release in this order: useful free learning loop, consented cohort evidence, provider evaluation, invite-only critique, retention loop, operational hardening, then independent Portfolio/Community/Billing decisions.

**Rationale:** This preserves reversibility and prevents infrastructure investment from being mistaken for validated product value.

## Unresolved owner decisions converted to explicit gates

No technical clarification blocks the free activation work. The following decisions block only their corresponding future phases:

- Provider evaluation budget, data terms, and named reviewers.
- Production support owner and escalation policy for live critique.
- Final legal review of privacy, terms, provider processing, and retention.
- Community product and Trust and Safety approval.
- Billing provider, pricing, regions, tax, refunds, and support policy.
