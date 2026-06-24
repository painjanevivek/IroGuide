# Prelaunch DAST

The repo-owned DAST check probes the deployed IroGuide preview without signing
in, creating reviews, deleting data, or fuzzing payloads. It verifies the
current page routes, the public readiness endpoint, and the authenticated API
surface for obvious launch blockers:

- global browser security headers and `X-Powered-By` leakage;
- API `no-store`, `noindex`, `Vary: Authorization`, request ID, and CORS drift;
- unauthenticated `401` behavior on protected API routes;
- cross-site `403` behavior for mutating API routes;
- unsupported media-type `415` behavior on JSON/multipart POST routes;
- readiness payloads that expose secret-shaped values, stack traces, or
  sensitive deployment keys.

## Staging run

Set the staging or preview origin and run the npm script:

```powershell
$env:DAST_BASE_URL = "https://<iroguide-staging-preview>"
npm run dast:prelaunch
```

The script writes a JSON report to `artifacts/dast-prelaunch-report.json` and
exits nonzero when a high-confidence auth, header, CORS, cache, or API contract
check fails.

Useful options:

```powershell
$env:DAST_REPORT_PATH = "artifacts/dast-staging.json"
$env:DAST_TIMEOUT_MS = "15000"
$env:DAST_REQUIRE_READY = "true"
$env:DAST_FAIL_ON_WARNINGS = "true"
npm run dast:prelaunch
```

Use `DAST_REQUIRE_READY=true` for a final prelaunch gate when staging should
have Firebase Admin and live vision configured. Leave it unset for ephemeral
preview deployments where `/api/readiness` may legitimately return `503` while
still exposing the same security surface.

## CI example

Any CI runner with Node can call the same script after deployment:

```yaml
- run: npm ci
- run: npm run dast:prelaunch
  env:
    DAST_BASE_URL: ${{ secrets.IROGUIDE_STAGING_URL }}
    DAST_REQUIRE_READY: "true"
    DAST_REPORT_PATH: artifacts/dast-prelaunch-report.json
```

Archive `artifacts/dast-prelaunch-report.json` as a build artifact so failed
checks can be inspected without rerunning the scan.
