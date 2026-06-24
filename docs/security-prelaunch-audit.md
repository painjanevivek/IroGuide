# IroGuide Pre-Launch Security Audit

Status: Updated on 2026-06-24

## Checklist status

- Privacy policy: present at `/privacy`. It documents account data, uploaded design images, review briefs, saved critiques, provider use, logs, and deletion controls.
- User data storage: account reviews and review drafts are stored in Firebase Firestore. Uploaded source images are stored in Firebase Storage under `users/{uid}/reviews/{reviewId}/source.{ext}` with private cache metadata. Local fallback dashboard data is stored in browser storage per signed-in user.
- Security headers: configured in `next.config.ts`, including CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, permissions policy, and COOP.
- OWASP API basics: API inputs are schema validated with Zod, object ownership is normalized to the verified Firebase UID on server writes, file uploads are bounded by type, signature, and size, and resource-heavy routes are rate limited.
- Cross-site request blocking: mutating API routes reject cross-site `Sec-Fetch-Site` requests and mismatched `Origin` headers before authentication or body parsing.
- Media type enforcement: JSON and multipart API routes reject unsupported request content types with `415` responses.
- SSRF basics: custom live-review endpoints must use HTTPS and cannot target localhost, loopback, link-local, or private IPv4 ranges.
- API cache controls: JSON API responses include no-store cache headers, request IDs, authorization variance, and `X-Robots-Tag: noindex`.
- SQL injection: no SQL database or raw SQL query surface is present in this project.
- XSS: React rendering escapes user-provided text by default. Provider responses are parsed as structured JSON and are not rendered as HTML.
- Auth issues: Firebase ID tokens are verified server-side for review creation, review sync, account deletion, review purge, follow-ups, comparisons, and improvement plans.
- Environment leakage: `.env*` files are ignored except `.env.example`. Server secrets use non-public environment names and are only read in server modules.
- Sensitive API responses: readiness responses now return only booleans and non-secret provider status, not Firebase project IDs or model names. Validation responses return generic messages instead of full flattened request details.
- Secrets in logs: operational logs redact secret-shaped fields and hash user IDs before logging.
- API keys in frontend code: OpenRouter and Firebase admin credentials are server-only. Browser-visible Firebase config remains restricted to `NEXT_PUBLIC_` client configuration.
- Server-side key handling: live review API keys stay in server code paths and are sent only from server route handlers to providers.
- Rate limits: review creation, sync, account deletion, review purge, follow-up, comparison, improvement, and readiness routes are rate limited.

## OWASP API Security Top 10 mapping

- API1 Broken Object Level Authorization: server writes use the verified Firebase UID, not client-supplied ownership.
- API2 Broken Authentication: sensitive routes verify Firebase ID tokens server-side and reject missing or invalid bearer tokens.
- API3 Broken Object Property Level Authorization: public readiness and validation responses are redacted to avoid leaking deployment details or request internals.
- API4 Unrestricted Resource Consumption: high-cost routes are rate limited, upload size is bounded, sync batch size is capped, and unsupported media types are rejected early.
- API5 Broken Function Level Authorization: account deletion, review purge, review sync, follow-ups, comparisons, and improvement plans require authenticated users.
- API6 Sensitive Business Flows: account deletion and review deletion have stricter rate limits and require a fresh signed-in API call.
- API7 SSRF: configurable outbound review endpoints are validated and blocked from local/private network targets.
- API8 Security Misconfiguration: production source maps are disabled and security headers are set globally.
- API9 Improper Inventory Management: current API route surface is documented through the Next route tree and pre-launch audit.
- API10 Unsafe Consumption of APIs: live provider responses are parsed as JSON, schema checked, normalized, and never rendered as HTML.

## Remaining launch checks

- Verify the deployed CDN preserves all security headers.
- Configure Firebase security rules in production and test with denied cross-user access.
- Add provider-side spend caps and alerts for OpenRouter or any future vision provider.
- Run a hosted DAST scan against the deployed preview before public launch.
- Have privacy policy and terms reviewed by qualified counsel before broad commercial release.
