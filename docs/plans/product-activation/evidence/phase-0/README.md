# Phase 0 Evidence — Governance and Execution Artifacts

**Status:** Passed locally
**Date:** 2026-08-28
**Starting SHA:** `ad469e4286cecf48bcbed38ff55151d7751d7df0`
**Starting branch:** `codex/community-safety-tooling`
**Execution branch:** `codex/product-activation`
**Rollback:** switch back to `codex/community-safety-tooling` at the recorded starting SHA; no history rewrite is required.

## Preserved user-owned planning input

The starting worktree contained the following untracked planning documents. They were treated as intentional user work and reconciled rather than discarded:

- `docs/plans/iroguide-product-activation-production-plan.md`
- `docs/plans/product-activation/research.md`
- `docs/plans/product-activation/data-model.md`
- `docs/plans/product-activation/contracts.md`
- `docs/plans/product-activation/quickstart.md`

## Baseline product truth

| Capability | Free profile | Authority | Current action |
|---|---|---|---|
| Guided learning | Planned in Phase 2; unavailable at baseline | Server launch snapshot | Add fail-closed capability before UI |
| Existing review history | Owner-readable | Authenticated server/client ownership boundaries | Preserve |
| New AI critique | Disabled | Server policy, entitlement, provider readiness | Keep disabled |
| Source-image creation | Disabled | Server policy and Storage rules | Keep disabled; deletion remains available |
| Email delivery | Disabled | Server policy and verified configuration | Keep disabled |
| Community | Closed | Server capability, API, rules, workers | Keep closed |
| Billing | Absent | Future server entitlement/webhook design | Keep absent |
| Public Portfolio publishing | Disabled | Separate evidence and privacy approval | Keep disabled |

## Baseline route state

| Audience | Routes | Baseline state |
|---|---|---|
| Public useful | `/`, `/about`, `/docs`, `/contact`, `/privacy`, `/terms` | Available; wording and next actions require Phase 1 review |
| Authentication | `/auth/sign-in`, `/auth/sign-up` | Available; cookie notice can obstruct account action |
| Authenticated | `/dashboard`, `/profile`, `/dashboard/reviews/[documentId]` | Owner-scoped; first-user dashboard is under-guided |
| Review | `/review/new` | Truthful unavailable shell in free mode |
| Demoted/gated | `/projects`, `/portfolio`, `/community`, `/pricing`, `/beta` | Direct routes only; several visual/content defects remain |
| Operator/internal | `/admin/*`, `/internal/review-pipeline` | Authorization required; never primary navigation |

## Baseline visual evidence

The pre-execution audit captured landing, account entry, workspace, review, Projects, Community, and documentation views under:

`C:\Users\ASUS\.codex\visualizations\2026\08\23\01a02fcd-d720-7662-b6c5-f83b14302f37\iroguide-new-user-audit-2026-08-28`

Known visual/product defects:

- Projects heading collision at intermediate desktop widths.
- Community horizontal document overflow.
- Cookie consent can cover authentication actions.
- Repeated review-availability messaging creates dead ends.
- New workspace does not identify one clear next action.
- Gated concepts compete with available free value.

## Baseline validation

The Phase 0 commands produced these results:

| Command | Result | Evidence |
|---|---|---|
| `git diff --check` | Passed | no whitespace errors; line-ending notices only |
| `npm run security:workflow-pins` | Passed | 5 workflow files use immutable SHA pins |
| `npm run typecheck` | Passed | Next route types generated; TypeScript emitted no errors |
| `npm run lint` | Passed | zero warnings |
| `npm run check` | Passed | 331 unit tests, 36 emulator rules tests, evaluation manifest validation, lint, typecheck, and production build |
| `npm run test:e2e:free` | Passed | 1 Chromium free-profile denial journey |

The production build generated 44 application pages/routes plus framework manifests. Next.js 16.3.2 did not emit per-route byte sizes in this build output. A numeric Core Web Vitals baseline was not observed in the available audit and is therefore explicitly recorded as `not observed`, not as zero; Phase 1 owns reproducible route-level lab measurement and visual/accessibility comparisons after the repairs.

## Gate decision

`PASS` for Phase 0 local governance. The controlling revision, specification, 192-task ledger, traceability, route/capability matrix, evidence convention, and rollback record are internally consistent. Remote push confirmation is appended by the phase commit operation.
