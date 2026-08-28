# IroGuide Constitution

## Core Principles

### I. Evidence Before Opinion

Every critique, comparison, progress claim, and product decision MUST be grounded in traceable evidence. The product MUST distinguish illustrative samples, self-review, deterministic previews, and live image analysis. It MUST NOT imply that a user's design was analyzed when no approved provider inspected the image. Human research, legal approval, operating ownership, and production readiness MUST never be fabricated.

### II. Private by Default

Account data, briefs, uploads, critiques, conversations, comparisons, and case studies MUST remain owner-scoped and non-public unless a separate, explicit, revocable consent flow authorizes publication. Protected routes MUST verify Firebase identity server-side, enforce same-origin mutations, validate bounded inputs, and honor the persistent account-access lock. Logs, analytics, and operator views MUST exclude creative content, tokens, signed URLs, raw user identifiers, and provider payloads unless an approved security incident process requires narrowly scoped access.

### III. Server-Owned Capabilities and Fail-Closed Activation

Paid, externally billed, safety-sensitive, or public capabilities MUST be controlled by server-owned policy. Client state, credentials, payment redirects, or deployed code alone MUST NOT enable AI critique, source-image creation, email delivery, Community, publishing, or billing. Missing or invalid production configuration MUST fail closed. Every activation MUST have a kill switch, rollback path, evidence gate, and named owner where operating judgment is required.

### IV. Accessible, Responsive, Progressive Product Delivery

User-visible work MUST target WCAG 2.2 AA, keyboard operation, meaningful focus, screen-reader clarity, reduced motion, reflow at 320 CSS pixels, 200% zoom, touch access, and no horizontal document overflow. Server-rendered purpose, availability, and next actions MUST remain useful before client enhancement. Motion, color, hover, drag, and visual annotations MUST never be the only way to understand or complete a task.

### V. Bounded, Modular, Testable Systems

Business contracts and schemas belong in `src/domain/`, server authorization and integrations in `src/server/`, feature UI in `src/features/`, shared primitives in `src/components/`, and routes in `src/app/`. Inputs, outputs, pagination, attempts, costs, storage, retention, and background work MUST be bounded. Mutations MUST be idempotent where retries are possible. Client components MUST be explicit and MUST NOT import server-only code.

### VI. Complete Ownership, Deletion, and Recovery

Every persisted entity MUST declare ownership, schema version, retention, migration, deletion, and recovery behavior before implementation. Account deletion MUST cover primary and derived data, remain retryable during partial failure, and preserve the access lock until terminal cleanup. Direct operator paths that bypass the lock are prohibited by runbook until the architecture removes the constraint.

### VII. Verified and Reversible Releases

Implementation follows tests-first where practical, focused verification before broad gates, and exact-SHA deployment evidence. A phase is complete only when its acceptance criteria, security/privacy checks, accessibility/responsive checks, and rollback evidence pass. Green code does not substitute for human research, legal review, production credentials, load evidence, or operating ownership.

## Technology and Product Constraints

- The application uses Next.js 16 App Router, React 19, and TypeScript. Relevant local Next.js documentation under `node_modules/next/dist/docs/` MUST be read before framework-sensitive changes.
- The production launch profile remains `free` until an explicitly approved gate changes it.
- Beginner designers, freelancers, and UI/UX designers are the primary cohorts.
- Community, billing, public publishing, paid provider calls, and email delivery remain independently gated.
- Existing design tokens, visual language, motion utilities, Zod schemas, Firebase boundaries, and observability patterns SHOULD be reused before adding dependencies.
- New dependencies require a documented need, security review, bundle impact, license review, and rollback plan.

## Development Workflow and Quality Gates

1. Preserve user-owned and unrelated work.
2. Record the task, requirements, dependencies, and acceptance criteria before implementation.
3. Write or update focused tests before behavior where practical.
4. Implement the smallest modular change that satisfies the contract.
5. Run focused tests, then lint, typecheck, unit, rules, build, and relevant browser/security checks.
6. Inspect user-visible changes in the in-app browser at required states and viewports.
7. Review the full diff for secrets, capability bypasses, misleading copy, generated output, and unrelated formatting.
8. Commit a focused Conventional Commit and push without force only after the phase gate passes.

Required substantial-handoff gate:

```powershell
npm run check
```

Additional gates apply for browser, deployed, provider, Community, billing, and destructive-data changes as defined in the controlling plan.

## Governance

This constitution overrides conflicting project planning documents. Product decisions explicitly approved by the owner may amend it through a separate reviewed change containing rationale, migration impact, and rollback. Technical implementation alone cannot reinterpret or waive a capability gate. Every pull request and release review MUST verify applicable principles.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
