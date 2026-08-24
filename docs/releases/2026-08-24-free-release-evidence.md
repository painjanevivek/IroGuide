# Free Release Evidence — 2026-08-24

## Release identity

- Source merge: `b81276d95d134f6ce1705677490d8d60de0ce6de`
- Production deployment: `dpl_5E87Fs5gDym5EfQMyr4qbyPBiuR4`
- Immutable production URL: `https://iro-guide-pskmcbcmx-vivek-painjanes-projects.vercel.app`
- Public production aliases: `https://iroguide.com`, `https://www.iroguide.com`, and `https://iro-guide.vercel.app`
- Staging deployment: `dpl_67ciVP3q6wws4cTc6HT3d3zx9rDC`
- Staging alias: `https://iro-guide-staging-vivek-painjanes-projects.vercel.app`
- Prior healthy rollback deployment: `dpl_G4KEJYpia5AmMtjjRK7LKQJrFCNQ`
- Operator: repository and Vercel owner `painjanevivek`

## Configuration evidence

No secret values were printed or copied into this document.

- `IROGUIDE_LAUNCH_PROFILE` is explicitly configured as `free` for Preview and Production.
- Firebase client variables and an encrypted Firebase Admin service-account bundle are present by name for Preview and Production.
- Upstash REST URL and token are present by name for Preview and Production.
- Vercel supplies the trusted client identity boundary (`VERCEL=1`) at runtime.
- Paid-provider variable names remain present, but the launch-profile resolver denies provider, source-image Storage, email, and Community capabilities before those adapters can be used.
- No `IROGUIDE_ADMIN_UIDS`, `IROGUIDE_ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`, or disposable smoke-account credentials are configured in the inspected deployment environments.
- GitHub repository variables explicitly define `IROGUIDE_LAUNCH_PROFILE=free` and `IROGUIDE_PRODUCTION_URL=https://iroguide.com`.

## Verification results

### Local and CI release gate

- `npm audit`: 0 vulnerabilities.
- `npm run check`: passed with 221 unit tests and 12 Firebase rules tests.
- `npm run test:e2e:free`: 1/1 passed.
- Full local Playwright: 11 passed and 1 intentionally skipped gated Community scenario.
- GitHub application quality, dependency review, Firebase rules, two deterministic Playwright jobs, and Vercel Preview checks passed on PR #25.

### Deployed production smoke

Command profile: public, non-destructive, unauthenticated free smoke with security headers enabled.

- Route and policy checks: 16/16 passed.
- Public readiness: `200` with exactly `{ "ok": true }`.
- Security headers: CSP, HSTS, clickjacking, MIME-sniffing, referrer, permissions, and cross-origin policies present.
- Anonymous review and sync mutations: `401`.
- Community mutation: `404` with the closed-profile response.
- Production alias resolved to the immutable deployment above before the run.

### Deployed DAST

- Checks: 38/38 passed with warnings treated as failures.
- Covered public routes, readiness, authentication boundaries, cross-origin rejection, account-deletion boundaries, and unsupported-media rejection.

### Public browser evidence

- Community renders the closed "Private practice comes first" state.
- No Community social shell is rendered.
- No review file input or critique-start button is rendered for the unauthenticated free journey.
- No Firebase Storage request was observed during that journey.

### Runtime evidence

- `/api/readiness` emitted a structured successful `readiness.checked` event.
- `/api/community` emitted `community_mutation.capability_blocked` with no provider or Storage side effect.

## Rollback drill

1. Pointed the staging alias at candidate `dpl_67ciVP3q6wws4cTc6HT3d3zx9rDC`; readiness passed.
2. Reassigned the alias to prior healthy deployment `dpl_G4KEJYpia5AmMtjjRK7LKQJrFCNQ`; readiness passed.
3. Restored the alias to the candidate; readiness passed again.

Production was not rolled back because the staging drill proved the alias operation and production was healthy. Prior production deployments remain available in Vercel for an operator-initiated rollback.

## Known limitations and closed gates

- Privileged `/api/admin/readiness` cannot be verified until an admin UID or verified admin email is configured; anonymous access correctly returns `401`.
- Signup, verification, profile mutation, authenticated history purge, and account deletion cannot be exercised safely without a disposable inbox and approved smoke identity.
- The stored-without-email bug-report path is not production-mutated until an admin can verify and clean the disposable report.
- Preview protection requires Vercel-aware access; the public DAST and production smoke were run against the exact production alias instead.
- Community, paid critique, source-image cloud storage, email delivery, and billing remain closed.

## Exact next operator inputs

1. Add a disposable smoke email/inbox and corresponding GitHub Actions secrets.
2. Add its Firebase UID or verified email to the private admin allowlist.
3. Add the public Firebase smoke configuration to GitHub Actions without copying it into source control.
4. Re-run the production-smoke workflow with authenticated review and Firebase rules enabled against staging.
5. Verify cleanup, account deletion, and privileged readiness before marking `AUT-0106`–`AUT-0109` complete.
