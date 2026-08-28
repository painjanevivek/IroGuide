# IroGuide Product Activation and Production Completeness Plan

**Status:** Approved architectural catalogue; execution order superseded
**Created:** 2026-08-28
**Execution owner:** Codex, performing every in-scope technical action on the owner's behalf
**Current launch profile:** `free`
**Primary cohorts:** beginner designers, freelancers, UI/UX designers
**Locked decisions:** Community remains gated; paid provider remains `NO-GO`; billing remains `NO-GO`
**Relationship to execution:** This document preserves the complete architectural catalogue and all 185 original task IDs. The [controlling revision](./product-activation/revision.md) resolves phase ordering and missing decisions, while the [execution ledger](./product-activation/tasks.md) is authoritative for prerequisites, status, validation, and evidence. The existing autonomous plan remains the infrastructure and capability-gate record.

Supporting planning artifacts:

- [Controlling revision and corrected Phase 0–15 order](./product-activation/revision.md)
- [Authoritative execution ledger and legacy ID mapping](./product-activation/tasks.md)
- [Feature specification and requirement traceability](./product-activation/spec.md)
- [Research and decisions](./product-activation/research.md)
- [Data model](./product-activation/data-model.md)
- [UI, API, accessibility, performance, and security contracts](./product-activation/contracts.md)
- [Validation quickstart](./product-activation/quickstart.md)

## 1. Mission

Turn IroGuide from a polished, secure, gate-heavy product shell into a guided product that gives a first-time user a useful outcome in the free profile, proves demand and comprehension, and becomes ready for a separately approved invite-only live critique capability.

The plan is complete only when:

1. A new user always knows what IroGuide does, what is available now, and what to do next.
2. The free product produces a truthful learning artifact without pretending to analyze the user's pixels.
3. Every primary flow covers loading, empty, error, partial, offline, success, gated, and deletion states.
4. Product evidence can prove or reject activation and retention hypotheses without collecting creative content.
5. Live provider, Community, billing, publishing, and externally billed operations remain independently gated.
6. Production releases are accessible, observable, recoverable, secure, and backed by saved evidence.

## 2. Product truth

### What IroGuide solves

Design feedback is often vague, subjective, late, or unavailable. IroGuide is intended to explain:

- **What** visual decision is working or failing.
- **Why** it matters for the audience, task, and design goal.
- **How** to improve it with prioritized, executable changes.
- **What to do next** after the first correction.
- **Whether the revision improved** when comparable evidence exists.

### Free product promise

The free profile provides:

- a private account workspace;
- guided onboarding;
- owned example critiques;
- category-based self-review checklists;
- a design-brief builder;
- saved educational progress;
- documentation, privacy, support, and data controls;
- an explicit, revocable request for future review access.

It does **not** claim to analyze a user's design, upload a source image, contact a vision provider, publish content, send review email, or grant a review quota.

### Future live product promise

Only after `GATE-PROVIDER-01` passes, an invited verified user may upload one private visual design, provide a brief, select a critique mode, receive an evidence-grounded structured review, act on a prioritized checklist, upload a revision, and compare compatible outcomes.

## 3. Authority and gates

### Codex may perform autonomously

- Create branches under `codex/`, implement code, tests, rules, migrations, scripts, docs, and workflows.
- Run development servers, emulators, unit/integration/browser/security/build checks.
- Fix responsive, accessibility, content, state-management, security, performance, and operational defects.
- Create owned sample assets and test fixtures with approved generation/source provenance.
- Deploy preview/staging when connected access exists and deployment is reversible.
- Run non-destructive staging and production smoke checks.
- Commit and push focused phases when explicitly asked to execute this plan.

### Owner or external approval remains required

- Spending provider or third-party budget.
- Accepting provider, payment, legal, tax, or data-processing terms.
- Naming human reviewers, support owners, moderators, or incident responders without confirmation.
- Inviting real participants or contacting users.
- Enabling production AI critique, Community, billing, public publishing, or email delivery.
- Uploading confidential/client assets that were not explicitly approved.

### Gates

- `GATE-FREE-01`: Free learning loop passes product, privacy, accessibility, responsive, and deployed smoke acceptance.
- `GATE-EVIDENCE-01`: Consented cohort evidence justifies provider evaluation.
- `GATE-PROVIDER-01`: Budget, terms, owned dataset, two reviewers, quality, privacy, cost, safety, support, and rollback pass.
- `GATE-ALPHA-01`: Invite-only live critique passes staging, operational, deletion, support, and cohort readiness.
- `GATE-RETENTION-01`: Repeat critique-to-revision value is measured.
- `GATE-PORTFOLIO-01`: Private case-study value, traceability, redaction, and export safety pass.
- `GATE-COMMUNITY-01`: Retention, Trust and Safety staffing, policy, load, deletion, alerts, and approvals pass.
- `GATE-BILLING-01`: Provider value/economics, pricing, tax, refunds, legal, support, and reconciliation pass.

## 4. Technical context

- TypeScript 6.0.3, React 19.2.8, Next.js 16.3.2 App Router.
- Firebase client/Admin, Firestore and Storage rules.
- Zod 4.4.3 schemas.
- Vitest 4, Playwright 1.61, Firebase emulator rules tests.
- GSAP, Framer Motion, and existing motion utilities.
- OpenTelemetry API, Upstash Redis/rate limiting.
- Server components by default; explicit client boundaries.
- Current repository quality command: `npm run check`.
- Before changing Next.js APIs or conventions, read the relevant checked-in Next.js guide under `node_modules/next/dist/docs/`.

## 5. Constitution and governance check

The current `.specify/memory/constitution.md` is still an unratified template. Until it is replaced, `AGENTS.md`, the product foundation, security boundaries, launch plan, and this plan are the governing standards.

This is a governance gap, not permission to skip gates. Phase 0 must ratify a project-specific constitution covering:

- evidence before opinion;
- private-by-default data handling;
- server-owned capabilities and deny-by-default activation;
- accessible and responsive release gates;
- bounded inputs and outputs;
- owner-scoped persistence and deletion;
- observable, reversible deployment;
- no fabricated research, human review, approval, or product evidence.

## 6. Target information architecture

### Public navigation

- Home
- How it works
- Example critique
- Learn
- Help
- Sign in
- Create workspace

### Signed-in free navigation

- Workspace
- Learn
- Help
- Account menu

Primary CTA: `Continue your next step` or the specific next action.

### Signed-in invite-only navigation

- Workspace
- New review
- Learn
- Help
- Account menu

### Demoted or gated destinations

- Portfolio: private concept until it creates a traceable artifact.
- Community: direct gate page only; excluded from primary navigation.
- Pricing: research preview only; excluded from the activation path and marked `noindex` until an offer exists.
- Beta/readiness: operator or explicit research destination; never presented as a user task.
- Projects: either renamed to a task-oriented destination or retired after redirects and SEO review.

## 7. Target first-user journey

1. Visitor understands the current product in the landing hero.
2. Visitor explores an example critique without registration.
3. Visitor creates a private workspace.
4. User chooses role and goal or skips safely.
5. User completes one role-relevant sample critique.
6. User completes a self-review or prepares a design brief.
7. Dashboard shows progress, saved artifacts, and one next action.
8. User may record or revoke review-access interest.
9. When invited later, the prepared brief becomes the start of the live review flow.
10. After a review, the user acts on fixes, uploads a compatible revision, compares outcomes, and sees learning progress.

## 8. Cross-cutting implementation standards

### 8.1 Progressive disclosure and rendering

- Server-render purpose, headings, availability, and initial next action.
- Load interactive sample/checklist code only on the routes that use it.
- Reveal advanced explanations after the user understands the primary task.
- Preserve usable static content if animation or JavaScript enhancement fails.
- Keep skeleton dimensions aligned with final content to avoid layout shift.
- Defer noncritical below-fold media and motion.
- Do not hide content behind scroll-triggered animation.

### 8.2 Design system and visual quality

- Reuse existing color, type, spacing, border, radius, elevation, icon, and motion tokens.
- Define semantic tokens for success, caution, danger, information, disabled, focus, and gated states.
- Audit color contrast in light, dark, purple, and lime compositions.
- Keep line length readable; prevent display typography collision at intermediate widths.
- Use consistent button hierarchy: one primary action per decision region.
- Keep card density, spacing rhythm, icon sizes, and border treatments consistent.
- Avoid decorative crosshair/motion elements colliding with copy or controls.
- Verify imagery crop, intrinsic dimensions, alt text, high-DPI rendering, and loading behavior.
- Provide dark/light surface combinations only where contrast and focus remain compliant.

### 8.3 Responsive detail

Test at 320, 360, 390, 430, 768, 1024, 1280, and 1440 CSS pixels, plus landscape mobile and 200% zoom.

- No horizontal document overflow.
- No clipped or overlapping headings.
- Cookie notice never blocks the only primary action.
- Header actions wrap or collapse predictably.
- Cards become one column before copy becomes compressed.
- Touch targets remain operable with adequate separation.
- Fixed/sticky elements respect safe areas and on-screen keyboards.
- Images preserve useful focal areas.
- Long account names, translated-length copy, validation text, and zoom do not break layouts.

### 8.4 Accessibility detail

- WCAG 2.2 AA target.
- Skip link, landmarks, logical headings, descriptive page titles.
- Visible keyboard focus, logical order, no traps, and no keyboard-inaccessible custom control.
- Correct labels, descriptions, required/optional state, errors, and autocomplete tokens.
- Error summary focuses and links to invalid fields.
- Save, loading, progress, and error announcements use appropriate live regions.
- Modal/dialog focus is contained, named, restorable, and dismissible.
- Reduced motion removes nonessential parallax, morph, scrub, and repeated effects.
- Forced-colors support and non-color state cues.
- Target sizes, contrast, text spacing, 200% zoom, and reflow verified.
- Sample annotations have a text equivalent; visual bounding boxes are not the only evidence path.
- AI accessibility observations remain labeled visual risks, never compliance claims.

### 8.5 Form and interaction detail

- Persistent labels and examples separate from placeholders.
- Trim and normalize inputs; enforce documented maximums on client and server.
- Preserve drafts across refresh, sign-out, reconnect, and validation failure where safe.
- Disable duplicate submits but never hide progress.
- Support keyboard submission only where unambiguous.
- Show character counts near limits.
- Confirm destructive actions with exact scope and consequences.
- Use idempotency keys on retryable mutations.
- Prevent double-click, back-button, refresh, duplicate-tab, and stale-version corruption.
- Support cancel/retry for long work and show whether cancellation succeeded.

### 8.6 Security and privacy detail

- Verify Firebase ID tokens server-side for protected routes.
- Enforce same-origin mutations and bounded content types/bodies.
- Validate all inputs and persisted reads with Zod.
- Owner-scope data in APIs and Firebase rules.
- Apply persistent access locks during deletion/disable orchestration.
- Keep provider/Admin credentials server-only.
- Preserve CSP, HSTS, referrer, frame, MIME, permissions, and no-store headers.
- Rate-limit per account, client, route, target, and cost boundary where applicable.
- Redact tokens, email, UID, image/brief/review content, signed URLs, and provider bodies from logs.
- Prevent XSS in user text, markdown-like content, filenames, and provider output.
- Validate image type by decoded content, dimensions, pixel budget, digest, exact path, ownership, expiry, nonce, and size.
- Scan dependencies/workflow pins and run DAST before capability activation.
- Account deletion must include every derived record and remain retryable.

### 8.7 Reliability and scalability detail

- Mutations are idempotent and safe under retries.
- Durable jobs have explicit state transitions, leases, deadlines, bounded attempts, cancellation, and reconciliation.
- Transient failures retry with backoff/jitter; permanent failures do not loop.
- Outbox processing is replay-safe and terminal failures are observable.
- Counters avoid hot documents and have reconciliation.
- Paginate all unbounded lists with stable cursors.
- Bound conversations, checklist history, events, drafts, and operator queries.
- Use circuit breakers/kill switches for provider, Community, email, and billing capabilities.
- Preserve readable owned data during partial outages.
- Define cleanup for abandoned uploads, stale reservations, expired policies, orphaned jobs, and deleted accounts.

### 8.8 Performance detail

- Record route bundle sizes and major client dependency ownership.
- Target p75 LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on target devices.
- Avoid loading GSAP/Framer on routes that do not animate.
- Use responsive image sizes and modern formats.
- Avoid unnecessary font weights and blocking third-party requests.
- Cache only public immutable assets; private/account responses are no-store.
- Avoid Firestore read amplification and unbounded listeners.
- Track function memory, duration, Firestore reads/writes, Storage bytes, queue throughput, and provider cost.

### 8.9 Content and trust detail

- Every page states what is available now, not only the future promise.
- Use one name per concept: `Example critique`, `Self-review`, `Live critique`, `Review access`.
- Never call a deterministic or user-completed checklist an AI critique.
- Explain privacy at the point of upload, not only in the privacy page.
- Explain scores as directional and evidence as primary.
- Identify who a feature is for and what artifact it produces.
- Avoid unsupported expert, accuracy, accessibility-compliance, or improvement claims.
- Keep empty-state copy action-oriented and specific.
- Ensure footer, metadata, canonical URL, sitemap, structured data, social cards, favicon, terms, privacy, support, and contact details are coherent.

### 8.10 Analytics and experimentation detail

- Analytics remains consent-aware and no-op by default.
- Events use an allowlist and reject unapproved fields.
- Measure task funnels, not vanity page views.
- Record environment and schema version.
- Deduplicate repeated route mounts and retry events.
- Separate `not observed` from measured zero.
- Define sample window, cohort size, and known bias in every report.
- Never claim qualitative interpretation as participant evidence.
- No experiment changes the privacy boundary, hides a gate, or reduces accessibility.

## 9. Legacy task catalogue

The detailed groups below preserve the original task language and IDs for audit history. They are not the execution sequence. Use `product-activation/revision.md` and `product-activation/tasks.md` for the corrected Phase 0–15 order. This avoids deleting prior decisions while ensuring persistence precedes onboarding and the independent research, provider, Community, and billing gates cannot be bypassed.

### Legacy group 0 — Governance, baseline, and plan alignment

**Objective:** Establish a reliable starting point and prevent old plans, routes, or feature language from contradicting the active product.

### Tasks

- [ ] `ACT-0001` Create an execution branch from the current reviewed base and record the starting SHA.
- [ ] `ACT-0002` Confirm the worktree is clean; inventory user-owned changes and preserve them.
- [ ] `ACT-0003` Ratify `.specify/memory/constitution.md` with project-specific product, privacy, accessibility, testing, and activation principles.
- [ ] `ACT-0004` Build a route/capability matrix for public, authenticated-free, invited-live, operator, gated, and unknown states.
- [ ] `ACT-0005` Reconcile product foundation, launch plan, autonomous plan, README, privacy, terms, pricing research, and route copy.
- [ ] `ACT-0006` Mark stale or superseded claims without deleting audit history.
- [ ] `ACT-0007` Capture baseline screenshots at the required responsive widths and record existing defects.
- [ ] `ACT-0008` Record baseline bundle, Core Web Vitals lab results, accessibility scan, and full quality-gate result.
- [ ] `ACT-0009` Verify free production cannot contact provider, Storage creation, email delivery, Community, or billing paths.
- [ ] `ACT-0010` Define phase evidence folders, naming, screenshot, and rollback conventions.

### Acceptance

- One current decision source exists for each capability.
- No document implies that gated capability code is available to users.
- Baseline defects and measurements are reproducible.
- The free profile remains fail-closed.

### Copy-paste commit message

```text
feat(governance): align product activation and capability decisions

- ratify project delivery privacy accessibility and activation principles
- reconcile route capability documentation and current launch truth
- record baseline visual performance security and rollback evidence
```

### Legacy group 1 — Repair visible quality and navigation defects

**Objective:** Make the existing public and gated experience visually credible, responsive, and free of dead-end navigation before adding features.

### Tasks

- [ ] `ACT-0101` Fix Projects heading collision at intermediate desktop widths.
- [ ] `ACT-0102` Remove Community horizontal document overflow at all target widths.
- [ ] `ACT-0103` Reposition, resize, or collapse the cookie notice so it never obscures the sole primary action.
- [ ] `ACT-0104` Verify header, footer, mobile menu, account menu, focus order, skip link, and safe-area behavior.
- [ ] `ACT-0105` Replace inconsistent `Review availability`, `Mode availability`, and similar labels with one capability-aware vocabulary.
- [ ] `ACT-0106` Change the landing primary action in free mode to a useful `Try an example critique` or `Start learning` path.
- [ ] `ACT-0107` Keep live-review availability as a secondary transparent action.
- [ ] `ACT-0108` Demote Portfolio, Community, Pricing, Projects, and Beta from the primary activation path.
- [ ] `ACT-0109` Add truthful `Coming later`, `Research preview`, `Invite only`, or `Unavailable` labels wherever relevant.
- [ ] `ACT-0110` Audit 404, unexpected error, loading, no-JavaScript, and offline shells for a clear recovery route.
- [ ] `ACT-0111` Audit page metadata, canonical URLs, sitemap, robots/noindex choices, FAQ structured data, and social previews against current availability.
- [ ] `ACT-0112` Verify footer support, bug report, privacy, terms, and account/data-control links.
- [ ] `ACT-0113` Add visual regression screenshots for every repaired route.

### Acceptance

- No audited width has clipped copy, two-dimensional scrolling, or an obstructed CTA.
- Primary navigation contains only useful current tasks.
- Gated pages are honest and lead back to a useful action.
- Keyboard and reduced-motion navigation remain complete.

### Copy-paste commit message

```text
fix(ui): repair responsive navigation and gated route clarity

- remove heading collisions horizontal overflow and cookie action obstruction
- simplify primary navigation around available free learning tasks
- align metadata labels empty states and recovery links with launch truth
```

### Legacy group 2 — Guided account entry and onboarding

**Objective:** Replace the blank post-sign-up experience with a short, resumable, role-aware activation path.

### Tasks

- [ ] `ACT-0201` Add a capability-aware pre-auth value preview explaining what the workspace provides today.
- [ ] `ACT-0202` Preserve a validated same-origin return destination through sign-in/sign-up.
- [ ] `ACT-0203` Handle session-checking, provider-popup blocked, duplicate email, weak password, invalid credentials, unverified email, rate limit, reset success, reset failure, and expired session states.
- [ ] `ACT-0204` Add an onboarding route or workspace panel with no more than three initial decision screens.
- [ ] `ACT-0205` Ask primary role: beginner designer, freelancer, UI/UX designer, or other.
- [ ] `ACT-0206` Ask one primary goal and optional preferred categories; avoid unnecessary personal data.
- [ ] `ACT-0207` Recommend Friendly, Mentor, or Direct educational presentation while allowing override.
- [ ] `ACT-0208` Provide visible step progress, Back, Skip for now, Save and continue, and Restart controls.
- [ ] `ACT-0209` Persist only confirmed answers; resume after refresh and sign-out/sign-in.
- [ ] `ACT-0210` Move focus and announce step changes and completion correctly.
- [ ] `ACT-0211` Ensure browser back/forward, duplicate tabs, slow save, conflict, and offline behavior do not corrupt progress.
- [ ] `ACT-0212` Add account-level ability to edit or clear onboarding preferences.
- [ ] `ACT-0213` Add owner-scoped rules/API validation, rate limits, idempotency, access-lock, and deletion coverage.
- [ ] `ACT-0214` Add cohort-specific but standards-consistent copy and sample recommendations.
- [ ] `ACT-0215` Instrument privacy-safe onboarding started/completed/skipped events.

### Acceptance

- A first user reaches a recommended useful task without documentation or facilitator help.
- Onboarding can be skipped, resumed, edited, reset, and deleted.
- No sensitive cohort or employer/client information is collected.
- Authentication errors never discard confirmed onboarding data.

### Copy-paste commit message

```text
feat(onboarding): guide new users into a role-aware learning path

- add resumable cohort goal and critique-style setup
- preserve safe auth return paths progress errors and accessibility states
- persist minimal owner-scoped preferences with deletion and analytics controls
```

### Legacy group 3 — Useful free learning workspace

**Objective:** Give every free user a truthful, complete first-session learning outcome without paid AI or user-image processing.

### Tasks

- [ ] `ACT-0301` Define three owned, approved, versioned sample designs covering beginner, freelancer, and UI/UX needs.
- [ ] `ACT-0302` Record asset ownership/source, alt text, category, brief, rubric version, evidence regions, critique, actions, and learning goal.
- [ ] `ACT-0303` Validate sample content against the standard review contract and accessibility-risk language.
- [ ] `ACT-0304` Build the public example so visitors can inspect `what`, `evidence`, `why`, and `how` without registering.
- [ ] `ACT-0305` Build the signed-in sample exercise: read brief, predict issue, reveal evidence, choose first fix, complete reflection.
- [ ] `ACT-0306` Clearly label every sample as illustrative and never personalized.
- [ ] `ACT-0307` Provide annotation text equivalents and keyboard-operable finding selection.
- [ ] `ACT-0308` Add a category-driven self-review using `yes`, `no`, `unsure`, and `not applicable`.
- [ ] `ACT-0309` Explain each rubric item in plain language with an example and a verification suggestion.
- [ ] `ACT-0310` Derive at most three self-review priorities without claiming visual analysis.
- [ ] `ACT-0311` Add a design-brief builder for audience, purpose, style, goal, concern, and constraints.
- [ ] `ACT-0312` Reuse the existing bounded draft and compatibility patterns; do not attach an image in free mode.
- [ ] `ACT-0313` Add autosave status, manual retry, version conflict handling, and clear ready/draft states.
- [ ] `ACT-0314` Persist sample/self-review progress privately and support explicit clear-history controls.
- [ ] `ACT-0315` Add a review-access interest action with explicit contact permission, idempotency, revocation, and no email side effect.
- [ ] `ACT-0316` Show meaningful completion: what the user learned, prepared artifact, and next recommended action.
- [ ] `ACT-0317` Verify no free-learning interaction creates upload policy, Storage object, provider call, generation job, Community write, or email.
- [ ] `ACT-0318` Add unit, rules, route, browser, accessibility, responsive, no-JavaScript fallback, and deletion tests.

### Acceptance

- A new free user completes a learning artifact in one session.
- Sample and self-review language cannot be mistaken for analysis of the user's design.
- Progress is resumable and deletable.
- No paid or private-image side effect occurs.

### Copy-paste commit message

```text
feat(learning): add truthful sample critique and self-review workspace

- provide owned role-aware examples progressive evidence and rubric education
- add a bounded design brief builder saved progress and access-interest controls
- prove the free flow creates no provider storage email or community side effects
```

### Legacy group 4 — Action-oriented dashboard and workspace information architecture

**Objective:** Make the dashboard answer “Where am I, what have I done, and what should I do next?” in every account state.

### Tasks

- [ ] `ACT-0401` Create a server-derived next-best-action model using capabilities, onboarding, progress, drafts, access, and review history.
- [ ] `ACT-0402` Add a compact first-run checklist with step label, outcome, completion state, and one primary continuation action.
- [ ] `ACT-0403` Add `Continue where you left off` for sample, self-review, brief, review job, checklist, comparison, and case-study states.
- [ ] `ACT-0404` Show available-now status without repeating blocking banners across every card.
- [ ] `ACT-0405` Replace the `No reviews yet` dead end with role-aware sample/brief actions.
- [ ] `ACT-0406` Distinguish empty history, filtered-empty, loading, stale cache, partial sync, offline, locked account, and fatal load states.
- [ ] `ACT-0407` Preserve existing owned review history and trusted/unverified provenance labels.
- [ ] `ACT-0408` Add recent activity using privacy-safe categorical titles; avoid leaking brief content into shared screen contexts.
- [ ] `ACT-0409` Add clear links to edit preferences, clear learning history, purge reviews, delete account, privacy, and support.
- [ ] `ACT-0410` Ensure header/avatar menus expose text labels, keyboard behavior, escape/outside click, focus return, and long-name handling.
- [ ] `ACT-0411` Add skeletons with stable dimensions and error recovery without blanking readable cached data.
- [ ] `ACT-0412` Add mobile priority ordering so the next action appears before secondary metrics.
- [ ] `ACT-0413` Remove concept cards that cannot produce an artifact in the current profile.
- [ ] `ACT-0414` Add browser coverage for every dashboard state matrix row in `contracts.md`.

### Acceptance

- Every dashboard state has exactly one obvious primary next action.
- A first user never lands on an unexplained blank workspace.
- Gated features do not dominate the workspace.
- Existing private data remains readable during recoverable outages.

### Copy-paste commit message

```text
feat(dashboard): turn empty workspace states into guided next actions

- add server-derived activation progress and continue-where-you-left-off cards
- cover loading offline partial sync locked and error recovery states
- keep private history preferences data controls and support easy to reach
```

### Legacy group 5 — Persistence, API, rules, and deletion integration

**Objective:** Make new activation data production-safe, owner-scoped, bounded, observable, and completely deletable.

### Tasks

- [ ] `ACT-0501` Implement schemas from `product-activation/data-model.md` with strict versioning and unknown-key rejection.
- [ ] `ACT-0502` Implement authenticated same-origin account-experience read/update contracts.
- [ ] `ACT-0503` Implement idempotent access-interest create/revoke contracts.
- [ ] `ACT-0504` Add per-account/client mutation limits and bounded body/content-type enforcement.
- [ ] `ACT-0505` Add optimistic version conflict handling and client recovery UI.
- [ ] `ACT-0506` Extend Firestore rules, indexes, Admin boundaries, and access-lock denial to new collections.
- [ ] `ACT-0507` Extend purge-learning-history, purge-review-history, and full-account deletion orchestration.
- [ ] `ACT-0508` Make partial cleanup retry-safe; retain the root access lock until terminal deletion.
- [ ] `ACT-0509` Add migration/default behavior for accounts created before onboarding exists.
- [ ] `ACT-0510` Add structured request events without payload, UID, email, or creative content.
- [ ] `ACT-0511` Add cross-user, stale token, replay, duplicate, concurrency, malformed input, oversized body, and adapter-outage tests.
- [ ] `ACT-0512` Add support-safe operator aggregates that cannot expose individual creative or account content.

### Acceptance

- Direct cross-user access is denied in client rules and server APIs.
- Duplicate/retried writes do not create duplicate state.
- Every new entity is covered by clear-history and account-deletion tests.
- Logs and analytics contain no prohibited fields.

### Copy-paste commit message

```text
feat(accounts): persist activation progress with complete privacy controls

- add bounded versioned onboarding learning brief and access-interest contracts
- enforce ownership rate limits conflicts access locks and replay-safe writes
- extend purge deletion rules tests and privacy-minimized operator evidence
```

### Legacy group 6 — Product evidence and cohort research

**Objective:** Determine whether the free learning path is understood, useful, trusted, and strong enough to justify a provider evaluation.

### Tasks

- [ ] `ACT-0601` Implement the allowlisted activation event taxonomy from `contracts.md`.
- [ ] `ACT-0602` Reject sensitive/unapproved fields at compile-time where possible and runtime always.
- [ ] `ACT-0603` Add consent, schema version, environment, deduplication, sampling, and retention behavior.
- [ ] `ACT-0604` Build operator aggregates for landing-to-sample, sign-up-to-sample, sample completion, brief readiness, access interest, revocation, and seven-day return.
- [ ] `ACT-0605` Keep `not observed`, `insufficient sample`, and measured zero distinct.
- [ ] `ACT-0606` Prepare role-specific but non-leading usability scripts and task scenarios.
- [ ] `ACT-0607` Obtain owner approval before recruiting or contacting participants.
- [ ] `ACT-0608` Capture informed consent, cohort, research window, facilitation level, device class, and known bias.
- [ ] `ACT-0609` Observe whether users understand the product and finish the free artifact without assistance.
- [ ] `ACT-0610` Test whether the sample creates confidence or merely entertainment.
- [ ] `ACT-0611` Test whether prepared briefs and access interest predict return intent.
- [ ] `ACT-0612` Separate participant quotes/observations from researcher interpretation.
- [ ] `ACT-0613` Produce `GATE-EVIDENCE-01` decision with go, revise, or stop outcome.

### Initial evidence thresholds

- At least 85% describe the current product correctly after the landing page.
- At least 80% complete one free learning path without facilitator help.
- At least 70% identify the first useful design action in the sample.
- At least 65% judge the learning artifact more actionable than usual vague feedback.
- No participant believes their own design was analyzed when it was not.
- Zero unintended creative-content collection or cross-account exposure.

### Copy-paste commit message

```text
feat(evidence): measure privacy-safe activation and learning outcomes

- add consent-aware task funnels cohort aggregates and sensitive-field rejection
- prepare role-specific research scripts evidence templates and decision thresholds
- distinguish observed results missing data and researcher interpretation
```

### Legacy group 7 — Complete staging and inactive pipeline proof

**Objective:** Close the remaining technical verification gaps before any provider evaluation or invite-only capability.

### Tasks

- [ ] `ACT-0701` Complete privileged `/api/admin/readiness` proof with authorized operator credentials.
- [ ] `ACT-0702` Complete a disposable verified-account journey: create, verify, sign out/in, update, save, purge, and delete.
- [ ] `ACT-0703` Reverify Community page/API/rules denial and absence of free-profile image/provider/email side effects.
- [ ] `ACT-0704` Run deployed DAST, security smoke, production smoke, and save workflow/deployment URLs.
- [ ] `ACT-0705` Complete `AUT-0312`: emulator, route, concurrency, failure-injection, browser, and free-production job/upload denial tests.
- [ ] `ACT-0706` Exercise real non-production Cloud Storage signed-policy boundaries with an approved bucket.
- [ ] `ACT-0707` Test token revocation and document the application-lock requirement for every operator disable/delete path.
- [ ] `ACT-0708` Run manual keyboard, screen-reader, contrast, 200% zoom, reduced-motion, and physical-device checks.
- [ ] `ACT-0709` Record performance budgets and remediate material regressions.
- [ ] `ACT-0710` Exercise staging rollback to the previous healthy deployment.
- [ ] `ACT-0711` Record residual constraints, owner, severity, workaround, and removal condition.

### Acceptance

- Free production cannot create upload sessions or jobs.
- Privileged readiness reveals no secrets and public readiness remains minimal.
- Deletion and rollback work under injected partial failure.
- All high-severity accessibility, responsive, security, and data-boundary findings are closed.

### Copy-paste commit message

```text
fix(readiness): close staging accessibility storage and pipeline proof gaps

- verify privileged readiness disposable account deletion and free denial paths
- exercise concurrency failure injection token locks signed storage and rollback
- save deployed security accessibility performance and residual-risk evidence
```

### Legacy group 8 — Provider evaluation preparation and independent gate

**Objective:** Prove that a candidate can deliver safe, evidence-grounded critique within an approved cost envelope before activation.

### Tasks before owner approval

- [ ] `ACT-0801` Expand owned evaluation coverage from 3 to the 80-case target across categories, quality levels, modes, ambiguous briefs, low-resolution inputs, edge cases, and accessibility-risk prompts.
- [ ] `ACT-0802` Verify ownership, consent, hashes, decoded bounds, expected rubric regions, and scenario status for every asset.
- [ ] `ACT-0803` Prepare blinded review sheets and reviewer calibration guidance.
- [ ] `ACT-0804` Verify deterministic runner hashes, score aggregation, unsupported-finding metrics, and cost/latency capture.
- [ ] `ACT-0805` Confirm primary/fallback adapters remain independently disabled and free production remains unaffected.

### Required owner evidence

- Approved provider and data-processing terms.
- Approved per-review, daily, and monthly caps with named budget owner.
- Two named human reviewers.
- Named support/incident owner.
- Explicit permission for bounded paid evaluation calls.

### Tasks after approval

- [ ] `ACT-0810` Run primary and fallback candidates against the complete owned suite.
- [ ] `ACT-0811` Adjudicate every case with two independent human reviews and conflict handling.
- [ ] `ACT-0812` Analyze evidence grounding, unsupported findings, mode consistency, safety, privacy, latency, retries, fallback, and cost.
- [ ] `ACT-0813` Reject any candidate with a blocking failure or unexplained material nondeterminism.
- [ ] `ACT-0814` Exercise kill switch, quota exhaustion, cap exhaustion, provider timeout, invalid output, queue drain, deletion, and rollback.
- [ ] `ACT-0815` Produce `GATE-PROVIDER-01` decision; keep production free unless explicit `GO`.

### Copy-paste commit message

```text
feat(evaluation): complete owned provider quality and cost evidence

- expand the evaluation corpus and blinded human adjudication workflow
- measure grounding safety privacy latency retries fallback and bounded cost
- prove kill switches quota exhaustion queue drain deletion and free rollback
```

### Legacy group 9 — Invite-only live critique loop

**Objective:** Enable the smallest trustworthy personalized critique experience for approved verified accounts only.

### Tasks

- [ ] `ACT-0901` Add server-derived invite entitlement with expiry, reason, version, and revocation.
- [ ] `ACT-0902` Show review quota, availability, privacy boundary, expected processing, and support path before upload.
- [ ] `ACT-0903` Implement upload drop/picker, preview, replace, remove, filename, type, size, dimensions, orientation, and unsupported-file states.
- [ ] `ACT-0904` Keep large image bytes off Application Functions through approved direct private upload.
- [ ] `ACT-0905` Enforce exact owner path, nonce, expiry, digest, content type, byte limit, dimensions, decoded format, and decompression budget.
- [ ] `ACT-0906` Guide category and brief entry with examples, limits, draft recovery, and clear optional fields.
- [ ] `ACT-0907` Explain Friendly, Mentor, and Direct modes with identical standards and different tone/depth only.
- [ ] `ACT-0908` Add confirmation summarizing image, brief, mode, privacy, quota, and cancellation consequences.
- [ ] `ACT-0909` Implement queued, validating, analyzing, retrying, saving, complete, canceled, expired, and failed progress states.
- [ ] `ACT-0910` Preserve the brief and safe upload reference through recoverable failure.
- [ ] `ACT-0911` Present result summary, provider/trust state, `Fix first`, strengths, score map, what/evidence/why/how, annotations, checklist, uncertainty, and follow-up suggestions.
- [ ] `ACT-0912` Ensure annotation hover/focus has text equivalents and usable mobile behavior.
- [ ] `ACT-0913` Collect per-finding usefulness feedback without creative content in analytics.
- [ ] `ACT-0914` Save verified review and source-image metadata atomically or expose retryable partial state.
- [ ] `ACT-0915` Add review deletion, account deletion, provider kill-switch, entitlement revocation, quota, and support flows.
- [ ] `ACT-0916` Run staging and limited-cohort browser, rules, failure, privacy, accessibility, performance, and support drills.

### Alpha success gates

- At least 80% complete upload-to-review without facilitator help.
- At least 70% identify the first useful change within 30 seconds.
- At least 65% rate critique more actionable than their normal feedback source.
- Fewer than 3% of valid reviews fail without recovery.
- Zero unintended public exposure or cross-account access.
- Direct mode produces no personal attacks in the reviewed sample.

### Copy-paste commit message

```text
feat(review): enable an approved invite-only private critique loop

- connect verified entitlement direct upload durable jobs and bounded provider work
- add recoverable progress evidence-grounded results feedback and deletion controls
- validate cohort accessibility privacy failure support quota and rollback gates
```

### Legacy group 10 — Trusted revision, follow-up, and retention loop

**Objective:** Help users apply critique, verify compatible improvement, and build design judgment over time.

### Tasks

- [ ] `ACT-1001` Persist checklist item state, notes, timestamps, and source review version.
- [ ] `ACT-1002` Add clear issue states: planned, in progress, fixed, intentionally unchanged, needs clarification.
- [ ] `ACT-1003` Implement bounded follow-up conversations using server-loaded owned review references.
- [ ] `ACT-1004` Add stable pagination, message limits, cost limits, citations to issue IDs, deletion propagation, and outage recovery.
- [ ] `ACT-1005` Implement revision upload with explicit original/revised relationship.
- [ ] `ACT-1006` Persist comparison outcomes with rubric/prompt/category/goal compatibility signatures.
- [ ] `ACT-1007` Show improved, remaining, regressed, unmatched, and low-confidence issue matches.
- [ ] `ACT-1008` Withhold score deltas when evidence is incompatible and explain why.
- [ ] `ACT-1009` Preserve uncertainty and prevent unsupported causal claims.
- [ ] `ACT-1010` Add recurring-issue insights only after minimum comparable sample counts.
- [ ] `ACT-1011` Normalize stable categories while preserving rubric versions and migration history.
- [ ] `ACT-1012` Add `Continue revision`, next-action reminders, and second-review completion tracking.
- [ ] `ACT-1013` Measure time to first value, checklist use, follow-up use, second review, seven-day return, and recurring issue improvement.
- [ ] `ACT-1014` Run legacy compatibility, owner isolation, pagination, cost, deletion, accessibility, responsive, and E2E suites.
- [ ] `ACT-1015` Produce `GATE-RETENTION-01` with invest, revise, or stop outcome.

### Acceptance

- Clients cannot authorize follow-up/comparison with supplied review bodies.
- Only compatible evidence produces deltas or trends.
- Conversations, comparison, checklist, and progress delete completely.
- Retention reports measure repeat learning, not simple page return.

### Copy-paste commit message

```text
feat(retention): persist trusted critique revision and learning progress

- add bounded follow-up checklist notes and compatible revision comparison states
- withhold unsupported deltas and derive recurring insights only from stable evidence
- measure second-review value with owner isolation deletion pagination and cost limits
```

### Legacy group 11 — Private portfolio workshop

**Objective:** Turn verified critique and revision evidence into a credible private case-study draft without public publishing.

### Tasks

- [ ] `ACT-1101` Require an owned verified review and compatible comparison before generating evidence-backed claims.
- [ ] `ACT-1102` Create sections for context, first direction, critique, decision, iteration, outcome, and reflection.
- [ ] `ACT-1103` Trace every generated statement to an owned source review/comparison or mark it user-authored.
- [ ] `ACT-1104` Support edit, reorder, draft autosave, conflict handling, preview, and deletion.
- [ ] `ACT-1105` Prevent private source URLs, hidden prompts, operator data, or unapproved client identifiers from entering exports.
- [ ] `ACT-1106` Keep publishing disabled until separate consent, revocation, expiry, abuse, and deletion design passes.
- [ ] `ACT-1107` Add private export only after redaction, watermark, expiry/revocation, accessible document, and deletion tests.
- [ ] `ACT-1108` Validate whether users actually use case studies before promoting Portfolio in navigation.
- [ ] `ACT-1109` Produce `GATE-PORTFOLIO-01` decision.

### Copy-paste commit message

```text
feat(portfolio): build private evidence-backed case study drafts

- trace context critique decisions iteration and reflection to owned reviews
- add bounded editing preview redaction deletion and accessible private export
- keep publishing gated until consent revocation safety and product value pass
```

### Legacy group 12 — Production operations and continuous hardening

**Objective:** Make every enabled capability observable, recoverable, supportable, and safe to operate over time.

### Tasks

- [ ] `ACT-1201` Add scheduled dependency, secret, workflow-pin, rules, DAST, and capability-drift checks.
- [ ] `ACT-1202` Define SLOs for public readiness, auth, account APIs, activation saves, review completion, queue age, provider latency, deletion, and future gated services.
- [ ] `ACT-1203` Define error budgets, alert thresholds, paging/severity, owners, backups, escalation, and automatic capability rollback.
- [ ] `ACT-1204` Build dashboards for errors, latency, saturation, queues, reservations, cleanup, deletion, and cost without creative content.
- [ ] `ACT-1205` Add synthetic probes for landing, auth boundary, free learning, access interest, review denial/enabled path, deletion, and support.
- [ ] `ACT-1206` Verify backup and restore for owned text, activation state, review/job state, audit state, and future billing ledger.
- [ ] `ACT-1207` Run quarterly deletion, provider kill-switch, Community kill-switch, webhook replay, and deployment rollback drills as applicable.
- [ ] `ACT-1208` Maintain staging parity for headers, rules, storage policy, queues, capabilities, and observability.
- [ ] `ACT-1209` Add release checklist with migration, rollback, smoke, support note, screenshot, accessibility, and change communication.
- [ ] `ACT-1210` Maintain incident runbooks for auth, data exposure, provider degradation, stuck jobs, deletion backlog, cost spike, and deployment failure.
- [ ] `ACT-1211` Add support-safe diagnostics and user-facing status messages.
- [ ] `ACT-1212` Review privacy, terms, retention, provider processing, support promises, and jurisdictional requirements with qualified owners before broad launch.
- [ ] `ACT-1213` Track and safely retire obsolete flags, schemas, migrations, sample versions, and compatibility paths.

### Initial SLOs

- Public readiness availability ≥ 99.9% monthly.
- Authenticated account API success, excluding invalid requests, ≥ 99.5%.
- Forbidden free-profile external side effects: exactly 0.
- Account/deletion terminal completion ≥ 99.9%, with visible retry state for every partial failure.
- Provider completion target set only after evaluation; invalid outputs are failures, not hidden successes.

### Copy-paste commit message

```text
feat(operations): automate product health recovery and release evidence

- monitor readiness activation queues deletion provider limits and user-visible failures
- add SLOs error budgets alerts backups restore drills rollback and support runbooks
- enforce recurring security accessibility performance and capability-drift checks
```

### Legacy group 13 — Maintain Community as a closed capability

**Objective:** Preserve and verify completed safety tooling without allowing it to distract from or bypass the private learning loop.

### Tasks

- [ ] `ACT-1301` Keep Community out of primary navigation and user activation metrics.
- [ ] `ACT-1302` Keep page, API, rules, dispatcher, notification, and projection paths closed by default.
- [ ] `ACT-1303` Continue regression tests for consent, withdrawal, blocking, reporting, moderation, appeals, counters, deletion, and audits.
- [ ] `ACT-1304` Configure no scheduled dispatcher while rollout is closed.
- [ ] `ACT-1305` Require retention evidence, named Trust and Safety owner/backup, policy, response windows, legal/privacy contact, incident runbook, load tests, worker proof, alert routing, and independent approvals.
- [ ] `ACT-1306` If and only if `evaluateCommunityLaunch` is launchable, create a separate staff-only rollout commit and monitor before any wider step.

### Copy-paste commit message

```text
fix(community): preserve closed rollout and safety regression gates

- keep public reads writes workers and navigation disabled by default
- maintain consent moderation appeals counter deletion and abuse evidence
- require retention staffing policy load alerts and independent rollout approval
```

### Legacy group 14 — Maintain billing as an independent future gate

**Objective:** Prevent monetization work from outrunning proven product value and provider economics.

### Tasks

- [ ] `ACT-1401` Do not install a billing SDK or advertise purchasable plans before `GATE-BILLING-01`.
- [ ] `ACT-1402` Keep Pricing labeled as research and remove purchase-shaped disabled controls from primary journeys.
- [ ] `ACT-1403` After approval, write provider-specific ADR and threat model.
- [ ] `ACT-1404` Implement authenticated same-origin checkout/portal sessions and raw-body signed replay-safe webhooks.
- [ ] `ACT-1405` Derive entitlements server-side; payment redirect/client labels never grant access.
- [ ] `ACT-1406` Add atomic usage reservation, commit, release, refund, dispute, and reconciliation.
- [ ] `ACT-1407` Cover trial, renewal, grace, past due, cancel, refund, tax display, invoice, export, deletion, ordering, duplication, and outage states.
- [ ] `ACT-1408` Add billing SLOs, webhook-age, entitlement-divergence, duplicate-ledger, cost/revenue, refund, and dispute alerts.
- [ ] `ACT-1409` Enable only through a separate approved production rollout commit.

### Copy-paste commit message

```text
feat(billing): prepare independently gated recoverable monetization

- add verified webhooks server-derived entitlements and atomic usage accounting
- cover lifecycle tax refund dispute export deletion reconciliation and support states
- keep checkout disabled until product value economics legal and rollout approval pass
```

## 10. Surface-level completeness checklist

This checklist applies even when a phase task does not repeat the detail.

### Landing

- Current availability appears above the fold.
- One dominant free-mode CTA and one secondary explanation link.
- Example critique is interactive, keyboard-operable, and explicitly illustrative.
- Audience section matches the three primary cohorts first.
- Trust copy distinguishes local/account/provider processing.
- FAQ answers current availability, privacy, supported work, scoring limits, and future access.
- No duplicated CTA wording, unsupported claim, or false urgency.

### Authentication

- Google and email entry, sign-in, sign-up, reset, verification, sign-out.
- Provider collision/linking guidance.
- Busy, popup blocked, canceled, network, rate-limit, invalid, duplicate, weak-password, expired-session states.
- Safe return path and open-redirect prevention.
- Password manager/autocomplete support.
- Cookie notice does not obscure forms.

### Onboarding

- Role, goal, category, recommended mode.
- Progress, Back, Skip, Resume, Restart, Edit, Delete.
- No sensitive or unnecessary fields.
- Accessible selection groups and announcements.
- Old-account default/migration behavior.

### Workspace/dashboard

- Session checking, new, in progress, ready, invited, existing history.
- Loading, empty, filtered-empty, partial sync, offline, locked, fatal error.
- Continue card, checklist, saved artifacts, review history, privacy/support/data controls.
- No gated-feature clutter.

### Learning samples

- Owned source provenance and version.
- Brief, category, goal, evidence regions, findings, first fix, checklist, reflection.
- Text equivalent for all visual evidence.
- Completion and reset.
- No personalized-analysis implication.

### Self-review and brief builder

- Category-specific rubric and plain-language definitions.
- Yes/no/unsure/not-applicable states.
- Maximum three priorities.
- Bounded inputs, autosave, save indicator, conflict, retry, ready state.
- No image upload in free mode.

### Live review when approved

- Upload, preview, replace/remove, validation, context, mode, confirmation.
- Queue/analysis/save progress, timeout, retry, cancel, quota, entitlement, paused state.
- Result trust/provider label, evidence, uncertainty, annotations, first fix, checklist, feedback.
- Deletion, support, provider outage, source-image unavailable.

### Profile and data controls

- Name/avatar/provider/password state.
- Email verification and linked provider status.
- Edit onboarding preferences.
- Clear learning data separately from critique history.
- Revoke access interest.
- Purge reviews and delete account with exact scope, status, retry, and final confirmation.

### Docs, help, contact, legal

- Quick start reflects the active profile.
- Troubleshooting covers auth, save, offline, access, upload, processing, deletion, and support.
- Contact form has category, reproduction fields, privacy warning, confirmation, rate limits, and fallback.
- Privacy and terms match actual collection, provider use, retention, cookies, deletion, Community, and billing status.
- Support email/domain is real and monitored before public promises.

### Platform polish

- 404, error boundary, loading, offline, maintenance, and status experiences.
- Metadata, canonical, robots, sitemap, social cards, icons, manifest, theme color.
- Browser console free of actionable errors.
- No broken links, placeholder copy, fake testimonials, dead buttons, or inaccessible disabled controls.
- Dates, time zones, number formatting, long content, and English copy expansion do not break layout.

## 11. Verification matrix

| Boundary | Unit | Route/API | Firebase rules | Browser | Accessibility | Performance | Deployed smoke | Failure injection |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Capability denial | Required | Required | Required | Required | Copy/state | N/A | Required | Provider/storage/email spies |
| Auth/onboarding | Required | Required | Required | Required | Required | Required | Required | Expired/stale/offline/conflict |
| Sample/self-review | Required | If persisted | Required | Required | Required | Required | Required | Cache/storage failure |
| Brief/access interest | Required | Required | Required | Required | Required | N/A | Required | Replay/rate/outage |
| Dashboard | Required | Integration | Required | Required | Required | Required | Required | Partial sync/offline |
| Direct uploads | Required | Required | Required | Required | Required | Required | Before activation | Malformed/orphan/expiry |
| Durable jobs | Required | Required | Server-only | Required | Status states | Required | Before activation | Duplicate/crash/timeout |
| Review results | Required | Required | Required | Required | Required | Required | Before activation | Invalid/partial save |
| Follow-up/comparison | Required | Required | Required | Required | Required | Required | Required | Incompatible/cross-owner |
| Deletion | Required | Required | Required | Required | Required | N/A | Required | Adapter outage/retry |
| Community | Required | Required | Required | Closed-route required | Required | Load before rollout | Before rollout | Burst/hot post/worker |
| Billing | Required | Required | Server-only writes | Required | Required | N/A | Before rollout | Replay/order/outage |

Standard commands:

```powershell
npm ci
npm run security:workflow-pins
npm run eval:reviews:validate
npm run typecheck
npm run lint
npm test
npm run test:rules
npm run build
npm run test:e2e
npm run test:e2e:free
npm run dast:prelaunch
npm run smoke:production
```

## 12. Phase handoff format

After each implementation phase, report:

```text
Phase: <number and name>
Outcome: complete | gate-closed | blocked
Commit: <sha and conventional subject>
Changed:
- <user-visible or system result>
Verification:
- <command and result>
Accessibility/responsive:
- <evidence>
Security/privacy:
- <evidence>
Performance:
- <evidence>
Deployment:
- <environment, immutable deployment, or not applicable>
Rollback:
- <tested rollback and result>
Remaining gate:
- <owner/external decision or none>
```

No phase is complete from code or documentation alone when acceptance requires deployed behavior, human research, legal approval, load evidence, support ownership, or paid evaluation.

## 13. Risk register

| Risk | Impact | Mitigation | Release trigger |
| --- | --- | --- | --- |
| Free product still feels like a waiting room | No activation or return | Sample critique, self-review, brief artifact, next-action dashboard | Stop/revise if users cannot name value |
| Sample is mistaken for personalized analysis | Trust and legal risk | Explicit labels, no user image, comprehension test | Zero tolerance in research |
| Live provider produces unsupported critique | Harmful advice and trust loss | 80-case evaluation, two reviewers, grounding thresholds, kill switch | Any blocking failure keeps `NO-GO` |
| Cost escapes caps | Financial loss | Reservations, daily/monthly caps, idempotency, conservative commit | Automatic provider shutdown |
| User design leaks across accounts | Critical privacy failure | Ownership checks, rules, server verification, DAST, access locks | Immediate pause and incident response |
| Deletion partially fails | Privacy and support risk | Retryable orchestrator, persistent lock, backlog alert | Pause relevant capability if backlog breaches SLO |
| Navigation exposes concepts instead of tasks | Product feels unfinished | Demote gates, next-best action, route matrix | Block free release on dead ends |
| Motion/typography breaks responsive access | Usability and accessibility failure | Static baseline, reduced motion, width/zoom matrix, visual regression | Block release on high severity |
| Analytics collects creative/identity content | Privacy failure | Allowlist, schema rejection, no-op default, tests | Disable adapter and investigate |
| Community work distracts from retention | Scope and safety cost | Closed route, no primary nav, independent gate | No rollout before retention/staffing |
| Billing precedes value | Complexity without revenue proof | Independent gate after provider economics and retention | No SDK/checkout before approval |
| Operator uses Firebase console deletion directly | Stale access window | Mandatory application access-lock runbook and restricted operator path | Treat bypass as incident until architecture changes |

## 14. Definition of done

### Free product done

- A first user understands current availability and completes a useful sample/self-review/brief journey without help.
- Dashboard always exposes a meaningful next action.
- No user design is uploaded or analyzed in free mode.
- All new progress is private, bounded, resumable, and deletable.
- Responsive, accessibility, security, performance, DAST, smoke, and rollback evidence pass.
- Cohort evidence can make a provider-evaluation decision.

### Live critique done

- Provider evaluation, data terms, budget, human review, support, cost, safety, privacy, and rollback gates pass.
- Invite-only upload-to-review meets cohort success thresholds.
- No cross-account exposure, unsupported hidden success, or uncontrolled cost.

### Retention done

- Users can act on feedback, ask bounded follow-ups, upload revisions, and compare compatible evidence.
- Repeat value is measured through second-review and learning outcomes.

### Portfolio done

- Private case studies are source-traceable, editable, deletable, redacted, and accessible.
- Public publishing remains separately gated.

### Community done

- Technical safety is joined by measured retention, staffing, policy, load, alerts, deletion, incident, and independent approvals.

### Billing done

- Provider value and economics are proven first.
- Billing lifecycle, entitlements, usage, webhooks, tax, refunds, export, deletion, reconciliation, recovery, and support are production-verified.

## 15. Immediate execution order

1. Phase 0 governance and baseline.
2. Phase 1 visible quality and navigation repair.
3. Phase 2 guided onboarding.
4. Phase 3 useful free learning workspace.
5. Phase 4 action-oriented dashboard.
6. Phase 5 persistence/security/deletion integration.
7. Phase 6 consented evidence and decision.
8. Phase 7 staging and inactive pipeline proof.
9. Stop at `GATE-PROVIDER-01` unless the owner approves budget, terms, reviewers, support, and paid evaluation.
10. Proceed through invite-only critique, retention, Portfolio, operations, Community, and billing only through their independent gates.

The immediate objective is not to add more destinations. It is to make one trustworthy path complete: understand a design problem, learn how critique works, prepare the work, receive critique when legitimately available, act on the first fix, and verify improvement.
