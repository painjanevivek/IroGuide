# Free-Launch Production-Proof Runbook

## Decision rule

Promote only the exact source revision and staging deployment that produced green local, preview, and device evidence. The launch profile must remain `free`; AI critique, source-image storage, bug-report email, billing, and Community remain closed. A missing credential or physical-device result is **NOT RUN**, never a pass.

## 1. Safe local proof

No production credentials or external mutations are used.

```bash
npm run proof:free-launch:local
```

This records the security/release contract tests plus desktop Chromium, Android Chromium emulation, and iPhone WebKit emulation for `/`, `/learn`, and `/auth/sign-in`. It checks headings/landmarks, accessible control names, image alternatives, unique IDs, 24px minimum controls, horizontal overflow, keyboard skip navigation, and reduced motion.

Evidence is written under `artifacts/free-launch-proof/local-<UTC timestamp>/`: `local-proof.json`, redacted command logs, `accessibility-device.json`, and a physical-device template.

The report records `HEAD` plus whether the working tree was dirty. A `+dirty` source identity is preparation evidence only; rerun after the release candidate is committed so the evidence maps to one deployable revision.

## 2. Credentialed preview proof

This is the only automated step that needs privileged inputs. It is restricted to a Vercel Preview/staging host and intentionally rejects production aliases.

Operator machine/CI variables:

- `SMOKE_BASE_URL` — exact immutable Preview URL or approved staging alias.
- `IROGUIDE_STAGING_PROOF_SECRET` — temporary proof secret; configure the same value on Preview only.
- `SMOKE_DEPLOYMENT_PROTECTION_BYPASS` — optional when Vercel Deployment Protection is enabled.
- `STAGING_RUNTIME_PROOF_REPORT_PATH` — optional evidence destination.

Preview deployment variables, configured by name without copying values into evidence:

- `IROGUIDE_LAUNCH_PROFILE=free`, `IROGUIDE_STAGING_PROOF_SECRET`, `IROGUIDE_ADMIN_UIDS`.
- Firebase Web API key, matching Firebase Admin credentials, and the intended Storage bucket.
- Production-equivalent Upstash and trusted-client identity configuration.

Run:

```bash
npm run proof:free-launch:preflight
npm run proof:free-launch:staging
```

The single staging report contains four isolated actions:

| Drill | Automated proof | Mutation and cleanup |
| --- | --- | --- |
| Privileged readiness | Authorized operator gets green free-profile checks; paid/unapproved capabilities remain closed | No data mutation |
| Verified-account lifecycle | Disposable account starts unverified, becomes verified, receives the fresh claim after reauthentication, persists/exports/purges owned data, deletes identity, and leaves the stale-token lock | Synthetic account/data; cleanup runs in `finally` |
| Storage boundary | Owner reads the exact synthetic object; another account is denied; a deletion lock denies the former owner | Synthetic users/object/lock; all removed in `finally` |
| Token revocation | Current token works; revoked token returns `401`; a new session works; disabling the user makes that token return `401` | Synthetic account; removed in `finally` |

Treat any `503`, failed check, missing action, or secret-shaped key in the report as **NO-GO**. The internal proof endpoint is Preview-only, requires same-origin plus the temporary secret, returns privacy-safe results, and must not be enabled in Production.

## 3. Physical device and assistive-technology drill

This cannot be completed by repository automation. Use the generated `manual-device-evidence.md` with one physical iPhone/Safari/VoiceOver pass and one physical Android/Chrome/TalkBack pass. On `/`, `/learn`, and `/auth/sign-in`, check portrait/landscape, 200% zoom or enlarged text, visible focus/screen-reader order, form labels/errors, and the absence of clipped content or blocked actions.

Record device/OS/browser versions and privacy-safe evidence references only. Do not record credentials, tokens, email addresses, or private account content. A simulator/emulator result does not replace this step.

## 4. Evidence and sign-off

Attach to the release record:

- source revision and immutable Preview deployment ID/URL;
- `local-proof.json` and `accessibility-device.json`;
- `staging-runtime-proof.json` containing all four green actions;
- completed physical-device evidence;
- production non-destructive smoke/DAST workflow URLs;
- named operator, UTC timestamps, and rollback deployment.

Keep generated evidence out of Git. Preserve it in the release/CI artifact store using the organization retention policy. No evidence file may contain Firebase credentials, proof secrets, ID/refresh/custom tokens, authorization headers, passwords, email addresses, or raw user IDs.

## Recovery

- Readiness red: stop promotion, restore Firebase/Upstash/trusted-proxy configuration, redeploy, and rerun all preview actions.
- Account or token drill red: keep invitations closed; do not disable/delete users directly in Firebase Console; repair the application lock/revocation path and repeat with a new disposable account.
- Storage red: keep source-image storage disabled, inspect rules/bucket/project alignment, and repeat only on staging.
- Accessibility/device red: fix the route, rerun emulation, then repeat both physical-device passes.
