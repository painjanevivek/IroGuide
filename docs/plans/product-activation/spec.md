# Feature Specification: Product Activation and Production Completeness

**Status:** Approved for implementation
**Branch:** `codex/product-activation`
**Created:** 2026-08-28
**Controlling revision:** `docs/plans/product-activation/revision.md`
**Architectural catalogue:** `docs/plans/iroguide-product-activation-production-plan.md`

## Product objective

Make the free IroGuide experience useful and self-guiding without pretending to analyze a user's design. A new user must understand the current product, complete a role-relevant sample critique or self-review, prepare a private design brief, see one clear next action, and control or export their data. Provider, Community, billing, email, and publishing remain independently gated.

## User stories

### US-001 — Understand current value

A visitor understands within the first viewport that IroGuide teaches structured design critique now and that personalized AI review is invite-only and currently unavailable in the free profile.

### US-002 — Continue through account entry

A visitor may begin an owned sample, create a workspace, and continue the same bounded sample progress after authentication without losing state or exposing personal/creative content.

### US-003 — Receive a guided first task

A new account chooses a role and goal, or skips, then lands on a recommended task rather than an empty dashboard.

### US-004 — Complete useful free learning

A signed-in user inspects an illustrative critique, completes a rubric self-review, or prepares a brief while the product clearly states that the user's own pixels were not analyzed.

### US-005 — Resume and control private work

A user can resume progress, edit preferences, clear learning history, revoke review interest, export portable account data, purge reviews, and delete the account.

### US-006 — Request future review access

A user may record and revoke review interest. Authorized operators may approve, decline, expire, or revoke access through an audited workflow without enabling email or paid review.

### US-007 — Receive live critique only after approval

After provider and alpha gates pass, an invited verified user may upload one private image, receive evidence-grounded critique, recover from failures, and delete the result.

### US-008 — Improve through revision

After live critique, a user may track fixes, ask bounded follow-ups, submit a comparable revision, understand changes, and build a private evidence-backed case study.

## Functional requirements

- **FR-001:** The landing page MUST distinguish free learning from personalized live critique.
- **FR-002:** The free primary action MUST lead to a useful sample or learning task, not an availability dead end.
- **FR-003:** Public and signed-in navigation MUST prioritize available work and demote gated concepts.
- **FR-004:** Gated routes MUST state their status and provide one useful return action.
- **FR-005:** Public sample progress MAY persist for seven days using only allowlisted categorical fields.
- **FR-006:** Valid guest sample progress MUST merge into the authenticated account without overwriting newer progress.
- **FR-007:** Onboarding MUST collect only role, goal, preferred categories, and presentation mode.
- **FR-008:** Onboarding MUST support Back, Skip, Resume, Restart, Edit, and Delete.
- **FR-009:** The dashboard MUST derive exactly one primary next action for every supported state.
- **FR-010:** Owned samples MUST include version, ownership, role, brief, rubric, evidence, findings, first action, and alt text.
- **FR-011:** Sample critique MUST be explicitly illustrative and MUST NOT imply analysis of the user's work.
- **FR-012:** Self-review MUST use category rubrics and MUST NOT claim visual analysis.
- **FR-013:** Self-review MUST derive no more than three priorities from bounded answers.
- **FR-014:** The free brief builder MUST not upload or persist an image.
- **FR-015:** Activation state MUST be persisted through authenticated same-origin server APIs.
- **FR-016:** Direct Firebase client access to new activation collections MUST be denied.
- **FR-017:** Mutations MUST be bounded, validated, owner-scoped, rate-limited, replay-safe, and access-lock aware.
- **FR-018:** Legacy drafts MUST remain readable until verified migration completes.
- **FR-019:** A user MUST be able to clear learning data independently of review history.
- **FR-020:** Account deletion MUST include every new primary and derived activation entity.
- **FR-021:** Access interest MUST be idempotent, revocable, and contact-disabled by default.
- **FR-022:** Operator access decisions MUST require authorization, reason codes, self-approval prevention, and immutable minimized audit.
- **FR-023:** Account export MUST include owned portable product data and exclude secrets, signed URLs, raw provider data, internal security data, and other users' content.
- **FR-024:** Product evidence MUST reject identity and creative-content fields.
- **FR-025:** The free profile MUST create no provider, source-image Storage, email, Community, publishing, or billing side effect.
- **FR-026:** `guidedLearning` MUST be server-owned, independently reversible, and unable to enable another capability.
- **FR-027:** Every primary flow MUST cover checking, loading, empty, partial, offline, conflict, error, success, gated, and locked states where applicable.
- **FR-028:** Error and support surfaces MUST expose a safe request ID without private payload content.
- **FR-029:** Live review MUST remain unavailable without verified email, signed entitlement, approved provider policy, and server capability.
- **FR-030:** Live upload MUST enforce exact owner path, nonce, expiry, content type, byte size, decoded format, dimensions, pixel budget, and digest.
- **FR-031:** Review jobs MUST be durable, idempotent, bounded, cancelable, reconcilable, and observable without payload logging.
- **FR-032:** Review output MUST preserve provider, model, prompt, rubric, policy, evidence, uncertainty, and trust provenance.
- **FR-033:** Comparisons MUST use server-loaded owned reviews and withhold incompatible deltas.
- **FR-034:** Follow-up conversations MUST be bounded, paginated, cost-limited, owner-scoped, and deletable.
- **FR-035:** Case-study claims MUST trace to owned review/comparison evidence or be marked user-authored.
- **FR-036:** Community MUST remain closed until the independent launch evaluator passes.
- **FR-037:** Billing MUST remain research-only until its independent gate passes.
- **FR-038:** All capability activation MUST have a kill switch, rollback, evidence, and owner where required.
- **FR-039:** All user-visible work MUST meet the accessibility and responsive contract.
- **FR-040:** All enabled capabilities MUST have SLOs, alerts, runbooks, backup/restore where applicable, and exact-SHA smoke/rollback evidence.

## Non-functional requirements

- **NFR-001 Accessibility:** Target WCAG 2.2 AA, full keyboard operation, meaningful focus, screen-reader clarity, reduced motion, forced colors, 200% zoom, and 320 CSS-pixel reflow.
- **NFR-002 Performance:** Target p75 LCP ≤ 2.5 seconds, INP ≤ 200 milliseconds, and CLS ≤ 0.1 on defined target devices.
- **NFR-003 Security:** Preserve CSP, secure headers, token verification, same-origin mutations, bounded parsing, ownership, rate limits, and secret isolation.
- **NFR-004 Privacy:** Logs and analytics contain no images, briefs, review text, provider payloads, tokens, signed URLs, email, or raw UID.
- **NFR-005 Reliability:** Retryable mutations are idempotent; durable work has deadlines, attempts, cleanup, and reconciliation.
- **NFR-006 Scalability:** Lists are paginated, counters avoid hot documents, and storage/queue/provider usage is bounded and observable.
- **NFR-007 Maintainability:** Domain, server, feature, component, and route boundaries follow `AGENTS.md`; no unnecessary dependency is added.
- **NFR-008 Compatibility:** Existing trusted/unverified review history and legacy drafts remain readable through migration.

## Success criteria

- **SC-001:** At least 85% of observed cohort users describe the current product correctly after the landing page.
- **SC-002:** At least 80% complete one free learning path without facilitator help.
- **SC-003:** At least 70% identify the first useful action in a sample critique.
- **SC-004:** At least 65% rate the learning artifact more actionable than their usual vague feedback source.
- **SC-005:** No observed participant believes their own design was analyzed when it was not.
- **SC-006:** Free-profile forbidden external side effects equal zero.
- **SC-007:** Cross-account access findings equal zero.
- **SC-008:** All high-severity accessibility, responsive, security, privacy, and deletion findings are closed before free release.
- **SC-009:** Provider evaluation reaches precision ≥ 0.80, recall ≥ 0.70, and unsupported-finding rate ≤ 0.05 before activation.
- **SC-010:** Invite-only valid-review unrecovered failure rate remains below 3% before expansion.

## Edge cases

- Expired or malformed guest progress is discarded without blocking sign-in.
- Account progress newer than guest progress always wins.
- A user skips onboarding and later edits preferences.
- Two tabs update the same self-review or brief.
- The network drops after the server commits but before the response arrives.
- A legacy draft fails migration midway.
- Analytics consent changes during an active flow.
- The account is locked or deleted while a tab is open.
- The capability changes while the user is on a learning or upload route.
- An operator attempts self-approval or replays an access decision.
- Export exceeds the synchronous bound or a dependent collection is unavailable.
- A provider entitlement is revoked during upload or queued processing.
- A source image is deleted while critique text remains readable.
- Reviews use incompatible rubric/provider/prompt/category/goal versions.
- Community, billing, or email credentials exist while their capability remains closed.

## Scope boundaries

Immediate implementation covers Phases 0–7 and all technically available gate preparation. Real participant contact, paid provider calls, Community rollout, billing activation, public publishing, legal acceptance, and named human ownership require separate authorization and evidence.
