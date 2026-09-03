# Product Completion Implementation Plan

**Canonical source:** `docs/plans/iroguide-system-completion-remediation-plan.md`

**Canonical SHA-256:** `177694987187ad1c525dde2fc196b08cfcecf868420f6ef428d97586f27e56f1`

This Spec Kit plan is a controlled mirror of the canonical remediation plan. The
canonical document owns phase ordering, evidence gates, exit criteria, release
commands, and commit boundaries. `npm run planning:verify` fails when the source
digest or the mirrored phase coverage diverges.

## Technical context

- Next.js 16.3.2 App Router, React 19.2, TypeScript 6, Zod 4.
- Firebase Admin is the only persistence authority for product records.
- Server Components are the default; interactive behavior is isolated in small
  client components and heavy gated UI is loaded only after authorization.
- Vitest, Firebase emulator rules tests, and Playwright cover domain, API,
  authorization, accessibility, responsive, and release behavior.
- Provider, outreach, production promotion, email, Community, Billing, and public
  publishing remain closed until the exact evidence gates in the canonical plan
  pass. Local code must not manufacture approval or production evidence.

## Architecture

- `src/domain/`: schemas, state machines, compatibility, and pure policy.
- `src/server/`: authorization, capability resolution, persistence, providers,
  operational controls, and deletion.
- `src/app/api/`: thin route handlers that gate before authentication, parsing,
  persistence, or external effects.
- `src/features/`: feature-local client islands.
- `src/app/`: Server Component routes, metadata, loading, and error shells.

## Delivery order

Execute canonical Phases 0 through 12 in order. Phase 9 is continuous and must be
revalidated at each release boundary. A phase that depends on external evidence
is complete only as a closed-gate preparation phase until its named approval
exists.
